import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ModalFinanceiroVeiculo({ veiculo, tenantId, onClose, onSave }) {
  // Estados formatados (string exibida) e numéricos
  const [valorCompraFmt, setValorCompraFmt] = useState('');
  const [custoDocFmt, setCustoDocFmt] = useState('');
  const [custoMecanicaFmt, setCustoMecanicaFmt] = useState('');
  const [custoFunilariaFmt, setCustoFunilariaFmt] = useState('');
  const [custoOutrosFmt, setCustoOutrosFmt] = useState('');
  const [comissaoVendedorFmt, setComissaoVendedorFmt] = useState('');
  const [valorVendaRealFmt, setValorVendaRealFmt] = useState('');

  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [bancoDestino, setBancoDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [loading, setLoading] = useState(false);

  // Função auxiliar para formatar números salvos do banco para o padrão monetário PT-BR (ex: 45000 -> 45.000,00)
  const formatarParaMoedaBR = (valor) => {
    if (!valor && valor !== 0) return '';
    return Number(valor).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função genérica de máscara de moeda para os inputs
  const handleMascaraMoeda = (e, setter) => {
    let valor = e.target.value.replace(/\D/g, '');
    if (!valor) {
      setter('');
      return;
    }
    valor = (Number(valor) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setter(valor);
  };

  // Converte a string formatada ("45.000,00") para float numérico para o banco (45000.00)
  const converterParaNumero = (valorStr) => {
    if (!valorStr) return 0;
    return parseFloat(String(valorStr).replace(/\./g, '').replace(',', '.')) || 0;
  };

  // Carrega dados financeiros anteriores se já existirem
  useEffect(() => {
    async function carregarFinanceiro() {
      if (!veiculo?.id) return;
      
      // Usamos .maybeSingle() para evitar erro 406 caso o veículo ainda não tenha DRE salva
      const { data } = await supabase
        .from('veiculo_financeiro')
        .select('*')
        .eq('veiculo_id', veiculo.id)
        .maybeSingle();

      if (data) {
        setValorCompraFmt(formatarParaMoedaBR(data.valor_compra));
        setCustoDocFmt(formatarParaMoedaBR(data.custo_documentacao));
        setCustoMecanicaFmt(formatarParaMoedaBR(data.custo_mecanica));
        setCustoFunilariaFmt(formatarParaMoedaBR(data.custo_funilaria));
        setCustoOutrosFmt(formatarParaMoedaBR(data.custo_outros));
        setComissaoVendedorFmt(formatarParaMoedaBR(data.comissao_vendedor));
        setValorVendaRealFmt(formatarParaMoedaBR(data.valor_venda_real));
        setFormaPagamento(data.forma_pagamento || 'Pix');
        setBancoDestino(data.banco_destino || '');
        setObservacoes(data.observacoes || '');
      } else if (veiculo?.preco) {
        setValorVendaRealFmt(formatarParaMoedaBR(veiculo.preco));
      }
    }
    carregarFinanceiro();
  }, [veiculo]);

  // Cálculos em tempo real para a DRE do Veículo
  const totalCusto = 
    converterParaNumero(valorCompraFmt) + 
    converterParaNumero(custoDocFmt) + 
    converterParaNumero(custoMecanicaFmt) + 
    converterParaNumero(custoFunilariaFmt) + 
    converterParaNumero(custoOutrosFmt) + 
    converterParaNumero(comissaoVendedorFmt);

  const valorVendaNum = converterParaNumero(valorVendaRealFmt);
  const lucroLiquido = valorVendaNum - totalCusto;
  const margemLucro = valorVendaNum > 0 ? (lucroLiquido / valorVendaNum) * 100 : 0;

  const handleSalvar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valorVendaCalculado = converterParaNumero(valorVendaRealFmt);
      const foiVendido = valorVendaCalculado > 0;
      const novoStatus = foiVendido ? 'Vendido' : 'Disponível';

      const payload = {
        tenant_id: tenantId,
        veiculo_id: veiculo.id,
        valor_compra: converterParaNumero(valorCompraFmt),
        valor_venda_real: valorVendaCalculado,
        custo_documentacao: converterParaNumero(custoDocFmt),
        custo_mecanica: converterParaNumero(custoMecanicaFmt),
        custo_funilaria: converterParaNumero(custoFunilariaFmt),
        custo_outros: converterParaNumero(custoOutrosFmt),
        comissao_vendedor: converterParaNumero(comissaoVendedorFmt),
        forma_pagamento: formaPagamento,
        banco_destino: bancoDestino,
        status_venda: novoStatus,
        observacoes: observacoes
      };

      // 1. Salva ou atualiza a DRE Financeira
      const { error: errorFin } = await supabase
        .from('veiculo_financeiro')
        .upsert(payload, { onConflict: 'veiculo_id' });

      if (errorFin) throw errorFin;

      // 2. Atualiza o status do veículo no estoque (se vendido, remove o destaque da Home)
      const { error: errorVeiculo } = await supabase
        .from('veiculos')
        .update({ 
          status: novoStatus,
          destaque_home: foiVendido ? false : veiculo.destaque_home
        })
        .eq('id', veiculo.id);

      if (errorVeiculo) throw errorVeiculo;

      alert(`DRE e fechamento da venda salvos com sucesso! Status do veículo: ${novoStatus.toUpperCase()}`);
      if (onSave) onSave();
      if (onClose) onClose();
    } catch {
      alert('Erro ao salvar o fechamento financeiro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px',
        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Fechamento de Venda & DRE do Veículo</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>{veiculo.marca} {veiculo.modelo} ({veiculo.ano_modelo || veiculo.ano_fabricacao})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '22px', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* BLOCO 1: AQUISIÇÃO E VENDAS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#ccc', display: 'block', marginBottom: '6px' }}>Valor de Aquisição (Custo Base) R$:</label>
              <input 
                type="text" 
                value={valorCompraFmt} 
                onChange={e => handleMascaraMoeda(e, setValorCompraFmt)} 
                placeholder="0,00" 
                style={{ width: '100%', padding: '10px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#ccc', display: 'block', marginBottom: '6px' }}>Valor Real da Venda R$:</label>
              <input 
                type="text" 
                value={valorVendaRealFmt} 
                onChange={e => handleMascaraMoeda(e, setValorVendaRealFmt)} 
                placeholder="0,00" 
                style={{ width: '100%', padding: '10px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '6px', color: '#4ade80', fontWeight: 'bold', fontFamily: 'monospace' }} 
              />
            </div>
          </div>

          {/* BLOCO 2: CUSTOS DETALHADOS */}
          <div style={{ backgroundColor: '#020617', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '12px' }}>Despesas Operacionais e Custos</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Documentação (Detran/IPVA):</label>
                <input type="text" value={custoDocFmt} onChange={e => handleMascaraMoeda(e, setCustoDocFmt)} placeholder="0,00" style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Mecânica / Oficina:</label>
                <input type="text" value={custoMecanicaFmt} onChange={e => handleMascaraMoeda(e, setCustoMecanicaFmt)} placeholder="0,00" style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Funilaria / Estética:</label>
                <input type="text" value={custoFunilariaFmt} onChange={e => handleMascaraMoeda(e, setCustoFunilariaFmt)} placeholder="0,00" style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Outras Despesas:</label>
                <input type="text" value={custoOutrosFmt} onChange={e => handleMascaraMoeda(e, setCustoOutrosFmt)} placeholder="0,00" style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Comissão Vendedor:</label>
                <input type="text" value={comissaoVendedorFmt} onChange={e => handleMascaraMoeda(e, setComissaoVendedorFmt)} placeholder="0,00" style={{ width: '100%', padding: '8px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#fff', fontFamily: 'monospace' }} />
              </div>
            </div>
          </div>

          {/* BLOCO 3: FORMA DE PAGAMENTO E DESTINO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#ccc', display: 'block', marginBottom: '6px' }}>Forma de Pagamento:</label>
              <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }}>
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="TED">TED / DOC</option>
                <option value="Financiamento">Financiamento Bancário</option>
                <option value="Cartao">Cartão de Crédito</option>
                <option value="Troca">Veículo na Troca</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#ccc', display: 'block', marginBottom: '6px' }}>Banco / Conta Destino:</label>
              <input type="text" value={bancoDestino} onChange={e => setBancoDestino(e.target.value)} placeholder="Ex: Conta Nubank / Pix Principal" style={{ width: '100%', padding: '10px', backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '6px', color: '#fff' }} />
            </div>
          </div>

          {/* PAINEL DE RESULTADO (DRE DO VEÍCULO) */}
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '10px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>CUSTO TOTAL</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f87171' }}>{totalCusto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div style={{ borderLeft: '1px solid #334155', height: '35px' }}></div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>LUCRO LÍQUIDO</span>
              <span style={{ fontSize: '18px', fontWeight: 'black', color: lucroLiquido >= 0 ? '#4ade80' : '#f87171' }}>{lucroLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div style={{ borderLeft: '1px solid #334155', height: '35px' }}></div>
            <div>
              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>MARGEM (%)</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>{margemLucro.toFixed(1)}%</span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#334155', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ padding: '10px 24px', backgroundColor: '#2563eb', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Salvando...' : 'Salvar Fechamento'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}