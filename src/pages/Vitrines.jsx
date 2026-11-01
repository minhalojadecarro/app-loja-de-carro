import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Vitrines({ session, tenant, isAdmin, selectedStore }) {
  const [lojas, setLojas] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [veiculosDaLoja, setVeiculosDaLoja] = useState([]);
  const [lojaAtual, setLojaAtual] = useState(null);
  const [loading, setLoading] = useState(false);

  // Verificação de administrador
  const eAdministrador = Boolean(
    isAdmin || 
    (tenant && (
      String(tenant.subscription_status || '').toLowerCase() === 'admin' ||
      String(tenant.plano || '').toLowerCase() === 'admin'
    ))
  );

  // ID da loja do usuário logado (fallback para ID da sessão)
  const meuTenantId = tenant?.id || session?.user?.id;

  // 1. Inicializar ID da loja e lista de lojas
  useEffect(() => {
    const initVitrines = async () => {
      const targetFromProps = selectedStore?.id || selectedStore;

      if (!eAdministrador) {
        const idFinal = targetFromProps || meuTenantId;
        if (idFinal) {
          setSelectedTenantId(idFinal);
          if (tenant) {
            setLojas([tenant]);
            setLojaAtual(tenant);
          }
        }
      } else {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .order('nome_loja', { ascending: true });

        if (!error && data && data.length > 0) {
          setLojas(data);
          const lojaParaSelecionar = targetFromProps || meuTenantId || data[0].id;
          setSelectedTenantId(lojaParaSelecionar);
        }
      }
    };

    initVitrines();
  }, [eAdministrador, tenant, meuTenantId, selectedStore]);

  // 2. Buscar veículos e dados da loja sempre que o selectedTenantId mudar
  useEffect(() => {
    const targetId = selectedTenantId || selectedStore?.id || meuTenantId;
    if (!targetId) return;

    const fetchVitrineData = async () => {
      setLoading(true);
      
      const lojaEncontrada = lojas.find((l) => l.id === targetId) || selectedStore || tenant;
      setLojaAtual(lojaEncontrada || null);

      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('tenant_id', targetId)
        .neq('status', 'Vendido')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar veículos da vitrine:', error);
      } else {
        const veiculosDisponiveis = (data || []).filter(
          (v) => String(v.status || '').trim().toLowerCase() !== 'vendido'
        );
        setVeiculosDaLoja(veiculosDisponiveis);
      }
      setLoading(false);
    };

    fetchVitrineData();
  }, [selectedTenantId, meuTenantId, lojas, tenant, selectedStore]);

  const baseUrl = window.location.origin;
  const linkVitrine = lojaAtual ? `${baseUrl}/#/${lojaAtual.slug || ''}` : '';

  const copiarLink = () => {
    if (!linkVitrine) return;
    navigator.clipboard.writeText(linkVitrine);
    alert('Link da vitrine copiado para a área de transferência!');
  };

  // Função para copiar o texto de anúncio individual do veículo para divulgação
  const copiarAnuncioVeiculo = (veiculo) => {
    const precoFormatado = Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const textoAnuncio = `🚗 *${veiculo.marca} ${veiculo.modelo}* (${veiculo.ano_modelo || veiculo.ano_fabricacao})\n` +
      `📌 Versão: ${veiculo.versao || 'Completo'}\n` +
      `💰 Preço: *${precoFormatado}*\n` +
      `${veiculo.quilometragem ? `🛣️ KM: ${veiculo.quilometragem.toLocaleString('pt-BR')} km\n` : ''}` +
      `\n📲 Confira mais detalhes e nosso estoque completo na vitrine:\n${linkVitrine}`;

    navigator.clipboard.writeText(textoAnuncio);
    alert(`Anúncio do ${veiculo.modelo} copiado! Pronto para colar no WhatsApp ou redes sociais.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen">
      <div className="mb-8">
        <h2 className="text-3xl font-black tracking-tight text-white">Gestão de Vitrines Online</h2>
        <p className="text-sm text-gray-400 mt-1">Divulgue o link geral da sua vitrine ou copie anúncios individuais para redes sociais</p>
      </div>

      {/* SELETOR DE LOJAS - Apenas para Administrador */}
      {eAdministrador && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-2">
            SELECIONE A REVENDA / LOJA PARA VISUALIZAR A VITRINE (Acesso Admin)
          </label>
          <select 
            value={selectedTenantId || meuTenantId} 
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-full md:w-1/2 bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-600 transition"
          >
            {lojas.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome_loja || loja.nome || loja.name} (/{loja.slug})
              </option>
            ))}
          </select>
        </div>
      )}

      {lojaAtual && (
        <div className="space-y-8">
          {/* Card do Link da Vitrine */}
          <div className="bg-blue-950/40 border border-blue-900/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
            <div>
              <h3 className="text-xl font-bold text-white">Vitrine de: {lojaAtual.nome_loja || lojaAtual.nome || lojaAtual.name}</h3>
              <p className="text-sm text-blue-200/80 mt-1">
                Compartilhe o link abaixo com seus clientes para que vejam todo o seu estoque atualizado.
              </p>
              <div className="mt-3 text-sm font-mono text-blue-300 bg-gray-950 px-4 py-2 rounded-lg border border-blue-800/50 inline-block">
                {linkVitrine}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              <button 
                onClick={copiarLink}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-900/30"
              >
                Copiar Link da Vitrine
              </button>
              {lojaAtual.whatsapp && (
                <a 
                  href={`https://wa.me/55${lojaAtual.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi sua vitrine online e tenho interesse em negociar.`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-green-500 transition text-center shadow-lg shadow-green-950/30"
                >
                  Testar WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Lista dos Veículos para Divulgação Individual */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">
                Veículos Disponíveis para Divulgação ({veiculosDaLoja.length})
              </h3>
              <span className="text-xs text-gray-400">Clique em "Copiar Anúncio" para divulgar nas redes sociais</span>
            </div>

            {loading ? (
              <p className="text-gray-500 text-center py-12">A carregar veículos da vitrine...</p>
            ) : veiculosDaLoja.length === 0 ? (
              <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-900">
                <p className="text-gray-400 text-lg">Esta loja ainda não possui veículos disponíveis na vitrine.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {veiculosDaLoja.map((veiculo) => (
                  <div key={veiculo.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-gray-700 transition">
                    <div>
                      {veiculo.foto_principal_url ? (
                        <img src={veiculo.foto_principal_url} alt={veiculo.modelo} className="h-56 w-full object-cover" />
                      ) : (
                        <div className="h-56 w-full bg-gray-800 flex items-center justify-center text-gray-500 text-sm">
                          Sem Foto Principal
                        </div>
                      )}
                      <div className="p-6">
                        <span className="text-xs font-semibold bg-gray-800 text-gray-300 px-3 py-1 rounded-md">
                          {veiculo.ano_modelo || veiculo.ano_fabricacao} {veiculo.combustivel ? `• ${veiculo.combustivel}` : ''}
                        </span>
                        <h4 className="font-bold text-white text-xl mt-3">
                          {veiculo.marca} {veiculo.modelo}
                        </h4>
                        <p className="text-sm text-gray-400 mt-0.5">{veiculo.versao || ''}</p>
                        <div className="mt-5 text-2xl font-black text-green-400">
                          {Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-0 flex flex-col gap-2">
                      <button
                        onClick={() => copiarAnuncioVeiculo(veiculo)}
                        className="w-full bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-800/60 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        📋 Copiar Anúncio para Redes Sociais
                      </button>
                      <div className="py-2 bg-gray-950/60 px-4 rounded-xl border border-gray-800/60 text-xs text-gray-400 flex justify-between items-center">
                        <span>Cor: <strong className="text-gray-200">{veiculo.cor || 'N/I'}</strong></span>
                        <span>KM: <strong className="text-gray-200">{veiculo.quilometragem ? veiculo.quilometragem.toLocaleString('pt-BR') : '0'}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}