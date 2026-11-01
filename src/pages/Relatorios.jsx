import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export default function Relatorios({ session, tenant }) {
  // Verificação de permissão de Administrador
  const isAdmin = Boolean(
    tenant && 
    (
      String(tenant.subscription_status || '').toLowerCase() === 'admin' || 
      String(tenant.plano || '').toLowerCase() === 'admin'
    )
  );

  // --- ESTADOS DE FILTRO COMPARTILHADOS ---
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear().toString());
  const [mesSelecionado, setMesSelecionado] = useState('todos');

  // --- ESTADOS PARA O PAINEL DO ADMINISTRADOR (SaaS Metrics) ---
  const [tenantsAdmin, setTenantsAdmin] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(isAdmin);

  // --- ESTADOS PARA O PAINEL DO LOJISTA (Vendas de Carros) ---
  const [veiculosVendidos, setVeiculosVendidos] = useState([]);
  const [loadingLojista, setLoadingLojista] = useState(!isAdmin);

  const userId = session?.user?.id;

  // ==========================================
  // LÓGICA DO ADMINISTRADOR (MÉTRICAS DO SAAS)
  // ==========================================
  const carregarMetricasSaaS = useCallback(async () => {
    setLoadingAdmin(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenantsAdmin(data || []);
    } catch (err) {
      console.error('Erro ao buscar dados do SaaS:', err);
    } finally {
      setLoadingAdmin(false);
    }
  }, []);

  const fetchVendasLojista = useCallback(async () => {
    setLoadingLojista(true);
    try {
      if (!userId) {
        setVeiculosVendidos([]);
        setLoadingLojista(false);
        return;
      }

      let tenantIdAtual = tenant?.id;

      if (!tenantIdAtual) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (tenantError) throw tenantError;
        if (tenantData?.id) {
          tenantIdAtual = tenantData.id;
        }
      }

      if (!tenantIdAtual) {
        setVeiculosVendidos([]);
        setLoadingLojista(false);
        return;
      }

      // 1. Busca os registros financeiros da loja
      const { data: dadosFinanceiros, error: errorFin } = await supabase
        .from('veiculo_financeiro')
        .select('*')
        .eq('tenant_id', tenantIdAtual);

      if (errorFin) throw errorFin;

      if (!dadosFinanceiros || dadosFinanceiros.length === 0) {
        setVeiculosVendidos([]);
        setLoadingLojista(false);
        return;
      }

      // 2. Busca os veículos correspondentes para montar os detalhes
      const veiculoIds = dadosFinanceiros.map(item => item.veiculo_id);
      const { data: dadosVeiculos, error: errorVeic } = await supabase
        .from('veiculos')
        .select('*')
        .in('id', veiculoIds);

      if (errorVeic) throw errorVeic;

      const veiculosMap = {};
      (dadosVeiculos || []).forEach(v => {
        veiculosMap[v.id] = v;
      });

      // 3. Mescla os dados calculando o custo total e o lucro líquido individual
      const vendasFormatadas = dadosFinanceiros.map(item => {
        const veiculo = veiculosMap[item.veiculo_id] || {};
        
        const valorVenda = Number(item.valor_venda_real || 0);
        const custoCompra = Number(item.valor_compra || 0);
        const custoDoc = Number(item.custo_documentacao || 0);
        const custoMec = Number(item.custo_mecanica || 0);
        const custoFunil = Number(item.custo_funilaria || 0);
        const custoOutros = Number(item.custo_outros || 0);
        const comissao = Number(item.comissao_vendedor || 0);

        const custoTotal = custoCompra + custoDoc + custoMec + custoFunil + custoOutros + comissao;
        const lucroLiquido = valorVenda - custoTotal;

        return {
          id: item.veiculo_id,
          marca: veiculo.marca || 'Veículo',
          modelo: veiculo.modelo || 'Não informado',
          versao: veiculo.versao || '',
          preco: valorVenda,
          lucroLiquido: lucroLiquido,
          updated_at: item.updated_at || item.created_at || new Date().toISOString()
        };
      });

      setVeiculosVendidos(vendasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar relatórios de vendas:', error);
    } finally {
      setLoadingLojista(false);
    }
  }, [tenant, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAdmin) {
        carregarMetricasSaaS();
      } else {
        fetchVendasLojista();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isAdmin, carregarMetricasSaaS, fetchVendasLojista]);

  const tenantsAdminFiltrados = tenantsAdmin.filter((t) => {
    if (!t.created_at) return true;
    const dataCriacao = new Date(t.created_at);
    const anoCriacao = dataCriacao.getFullYear().toString();
    const mesCriacao = (dataCriacao.getMonth() + 1).toString();

    const matchAno = anoSelecionado === 'todos' || anoCriacao === anoSelecionado;
    const matchMes = mesSelecionado === 'todos' || mesCriacao === mesSelecionado;

    return matchAno && matchMes;
  });

  const totalLojistas = tenantsAdminFiltrados.filter(t => 
    String(t.subscription_status || '').toLowerCase() !== 'admin' && 
    String(t.plano || '').toLowerCase() !== 'admin'
  ).length;

  const lojistasAtivos = tenantsAdminFiltrados.filter(t => {
    const status = String(t.subscription_status || t.plano || '').toLowerCase();
    return status === 'mensal' || status === 'anual' || status === 'ativo';
  });

  const lojistasTrial = tenantsAdminFiltrados.filter(t => {
    const status = String(t.subscription_status || t.plano || '').toLowerCase();
    const trialExpirado = t.trial_ends_at && new Date(t.trial_ends_at) < new Date();
    return (status === 'trial' || status === 'gratuito') && !trialExpirado;
  });

  const lojistasAtrasados = tenantsAdminFiltrados.filter(t => {
    const status = String(t.subscription_status || t.plano || '').toLowerCase();
    const trialExpirado = t.trial_ends_at && new Date(t.trial_ends_at) < new Date();
    return status === 'blocked' || status === 'atrasado' || ((status === 'trial' || status === 'gratuito') && trialExpirado);
  });

  const veiculosFiltrados = veiculosVendidos.filter((v) => {
    const dataVenda = new Date(v.updated_at);
    const anoVenda = dataVenda.getFullYear().toString();
    const mesVenda = (dataVenda.getMonth() + 1).toString();

    const matchAno = anoSelecionado === 'todos' || anoVenda === anoSelecionado;
    const matchMes = mesSelecionado === 'todos' || mesVenda === mesSelecionado;

    return matchAno && matchMes;
  });

  const totalQuantidade = veiculosFiltrados.length;
  const valorTotalVendas = veiculosFiltrados.reduce((acc, v) => acc + v.preco, 0);
  const lucroTotalGeral = veiculosFiltrados.reduce((acc, v) => acc + v.lucroLiquido, 0);
  const ticketMedio = totalQuantidade > 0 ? valorTotalVendas / totalQuantidade : 0;

  const handleImprimir = () => {
    window.print();
  };

  // ==========================================
  // RENDERIZAÇÃO: ADMINISTRADOR DO SAAS
  // ==========================================
  if (isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Métricas Globais do SaaS
            </span>
            <h1 className="text-3xl font-black text-white tracking-tight mt-1">
              Painel de Assinaturas & Faturamento
            </h1>
          </div>

          <button
            onClick={handleImprimir}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center gap-4 print:hidden">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase">Filtrar por Ano</label>
            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="todos">Todos os Anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Lojistas</span>
            <p className="text-3xl font-black text-white mt-2">{loadingAdmin ? '...' : totalLojistas}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
            <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Assinantes Ativos</span>
            <p className="text-3xl font-black text-green-400 mt-2">{loadingAdmin ? '...' : lojistasAtivos.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Em Período de Teste</span>
            <p className="text-3xl font-black text-blue-400 mt-2">{loadingAdmin ? '...' : lojistasTrial.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Expirados / Bloqueados</span>
            <p className="text-3xl font-black text-red-400 mt-2">{loadingAdmin ? '...' : lojistasAtrasados.length}</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: LOJISTA COMUM (VENDAS & LUCRO)
  // ==========================================
  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen space-y-8">
      
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Gestão Financeira</span>
          <h1 className="text-3xl font-black text-white tracking-tight">Relatório de Vendas & Lucratividade</h1>
          <p className="text-sm text-gray-400 mt-1">Acompanhe faturamento, margens e o lucro líquido consolidado.</p>
        </div>

        <button
          onClick={handleImprimir}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          🖨️ Imprimir / Salvar PDF
        </button>
      </div>

      {/* BARRA DE FILTROS DO LOJISTA */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase">Filtrar por Ano</label>
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="todos">Todos os Anos</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase">Filtrar por Mês</label>
          <select
            value={mesSelecionado}
            onChange={(e) => setMesSelecionado(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="todos">Todos os Meses</option>
            <option value="1">Janeiro</option>
            <option value="2">Fevereiro</option>
            <option value="3">Março</option>
            <option value="4">Abril</option>
            <option value="5">Maio</option>
            <option value="6">Junho</option>
            <option value="7">Julho</option>
            <option value="8">Agosto</option>
            <option value="9">Setembro</option>
            <option value="10">Outubro</option>
            <option value="11">Novembro</option>
            <option value="12">Dezembro</option>
          </select>
        </div>
      </div>

      {/* CABEÇALHO EXCLUSIVO PARA IMPRESSÃO */}
      <div className="hidden print:block mb-6 border-b border-gray-300 pb-4 text-black">
        <h2 className="text-2xl font-bold">Relatório de Vendas - {tenant?.nome_loja || tenant?.nome || 'Minha Loja de Carro'}</h2>
        <p className="text-sm">Período: {mesSelecionado === 'todos' ? 'Todos os meses' : `Mês ${mesSelecionado}`} / {anoSelecionado}</p>
        <p className="text-xs text-gray-600 mt-1">Emitido em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* 4 CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-900 print:bg-white print:border-gray-300 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 print:text-gray-600">Veículos Vendidos</h3>
          <p className="text-3xl font-black text-blue-400 print:text-blue-600 mt-3">{loadingLojista ? '...' : totalQuantidade}</p>
          <p className="text-xs text-gray-500 mt-2">No período selecionado</p>
        </div>

        <div className="bg-gray-900 print:bg-white print:border-gray-300 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 print:text-gray-600">Faturamento Bruto</h3>
          <p className="text-2xl font-black text-white print:text-black mt-3">
            {loadingLojista ? '...' : valorTotalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-2">Valor bruto negociado</p>
        </div>

        <div className="bg-gray-900 print:bg-white print:border-gray-300 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 print:text-gray-600">Lucro Líquido Total</h3>
          <p className="text-2xl font-black text-emerald-400 print:text-emerald-600 mt-3">
            {loadingLojista ? '...' : lucroTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-2">Retorno líquido consolidado</p>
        </div>

        <div className="bg-gray-900 print:bg-white print:border-gray-300 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 print:text-gray-600">Ticket Médio</h3>
          <p className="text-xl font-bold text-white print:text-black mt-3 uppercase tracking-wider">
            {loadingLojista ? '...' : ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-xs text-gray-500 mt-2">Média por veículo</p>
        </div>
      </div>

      {/* TABELA DE NEGOCIAÇÕES */}
      <div className="bg-gray-900 print:bg-white print:border-none border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 print:border-gray-300">
          <h3 className="text-lg font-bold text-white print:text-black">Detalhamento das Negociações & Lucratividade</h3>
        </div>

        {loadingLojista ? (
          <div className="text-center py-12 text-gray-500 animate-pulse">Carregando dados financeiros...</div>
        ) : veiculosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Nenhuma venda registrada para o período selecionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 print:border-gray-300 text-xs font-bold text-gray-400 print:text-gray-700 uppercase bg-gray-950/50 print:bg-gray-100">
                  <th className="p-4">Veículo</th>
                  <th className="p-4">Data da Venda</th>
                  <th className="p-4 text-right">Valor de Venda</th>
                  <th className="p-4 text-right">Lucro / Prejuizo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 print:divide-gray-200 text-sm">
                {veiculosFiltrados.map((v) => {
                  const dataFormatada = new Date(v.updated_at).toLocaleDateString('pt-BR');
                  return (
                    <tr key={v.id} className="hover:bg-gray-800/50 print:hover:bg-transparent">
                      <td className="p-4 font-bold text-white print:text-black">
                        {v.marca} {v.modelo} <span className="text-xs text-gray-400 font-normal">({v.versao})</span>
                      </td>
                      <td className="p-4 text-gray-300 print:text-gray-700">{dataFormatada}</td>
                      <td className="p-4 text-right font-black text-white print:text-black">
                        {Number(v.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-4 text-right font-black text-emerald-400 print:text-emerald-600">
                        {Number(v.lucroLiquido).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}