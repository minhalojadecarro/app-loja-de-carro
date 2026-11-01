import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

export default function HomeLogistas({ session, tenant }) {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nomeLojaAtual, setNomeLojaAtual] = useState('Minha Loja');
  const [planoLoja, setPlanoLoja] = useState('free'); // Estado para armazenar o plano atual

  // Estados de Filtros e Busca
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroCambio, setFiltroCambio] = useState('');
  const [filtroPrecoMax, setFiltroPrecoMax] = useState('');

  // Função que aplica a regra de limites de destaque por plano
  const aplicarLimiteDeDestaques = (veiculosList, plano) => {
    // Identifica quais campos definem o destaque (pode ser 'destaque_home' ou 'destaque')
    const destaques = veiculosList.filter(v => v.destaque_home === true || v.destaque === true);
    const normais = veiculosList.filter(v => v.destaque_home !== true && v.destaque !== true);

    let limiteDestaques = 3; // Plano Free (padrão)
    
    const planoLower = String(plano).toLowerCase();
    if (planoLower.includes('mensal') || planoLower.includes('trial')) {
      limiteDestaques = 20;
    } else if (planoLower.includes('anual') || planoLower.includes('vip') || planoLower.includes('ilimitado')) {
      limiteDestaques = Infinity; // Ilimitado para o anual
    }

    // Corta os destaques permitidos de acordo com o plano
    const destaquesPermitidos = destaques.slice(0, limiteDestaques);
    
    // Os excedentes que passaram do limite voltam a ser exibidos como normais
    const destaquesExcedentes = destaques.slice(limiteDestaques);

    return [...destaquesPermitidos, ...normais, ...destaquesExcedentes];
  };

  useEffect(() => {
    const fetchEstoqueLoja = async () => {
      setLoading(true);
      try {
        const userId = session?.user?.id;
        if (!userId) {
          setVeiculos([]);
          setLoading(false);
          return;
        }

        // 1. Descobre o tenant correto, o plano e o id da loja associada a este user_id
        let tenantIdAtual = tenant?.id;
        let nomeLojaTemp = tenant?.nome_loja || 'Minha Loja';
        let statusPlanoTemp = tenant?.subscription_status || 'free';

        if (!tenantIdAtual) {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenants')
            .select('id, nome_loja, subscription_status')
            .eq('user_id', userId)
            .maybeSingle();

          if (tenantError) throw tenantError;

          if (tenantData) {
            tenantIdAtual = tenantData.id;
            nomeLojaTemp = tenantData.nome_loja || 'Minha Loja';
            statusPlanoTemp = tenantData.subscription_status || 'free';
          }
        }

        setNomeLojaAtual(nomeLojaTemp);
        setPlanoLoja(statusPlanoTemp);

        if (!tenantIdAtual) {
          setVeiculos([]);
          setLoading(false);
          return;
        }

        // 2. Busca estritamente apenas os veículos pertencentes a este tenant_id
        const { data: veiculosData, error: veiculosError } = await supabase
          .from('veiculos')
          .select('*')
          .eq('tenant_id', tenantIdAtual)
          .neq('status', 'Vendido')
          .order('destaque_home', { ascending: false }) // Prioriza os destaques
          .order('created_at', { ascending: false });

        if (veiculosError) throw veiculosError;

        // 3. Aplica a regra de limite de destaques baseada no plano do lojista
        const listaProcessada = aplicarLimiteDeDestaques(veiculosData || [], statusPlanoTemp);

        setVeiculos(listaProcessada);
      } catch (err) {
        console.error('Erro ao carregar veículos da loja:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEstoqueLoja();
  }, [session, tenant]);

  // Filtragem dinâmica local dos veículos da própria loja
  const veiculosFiltrados = veiculos.filter((v) => {
    const textoBusca = termoBusca.toLowerCase();
    const matchTermo = 
      !termoBusca || 
      (v.marca && v.marca.toLowerCase().includes(textoBusca)) || 
      (v.modelo && v.modelo.toLowerCase().includes(textoBusca)) || 
      (v.versao && v.versao.toLowerCase().includes(textoBusca));

    const matchMarca = !filtroMarca || v.marca === filtroMarca;
    const matchCambio = !filtroCambio || v.cambio === filtroCambio;
    const matchPreco = !filtroPrecoMax || Number(v.preco) <= Number(filtroPrecoMax);

    return matchTermo && matchMarca && matchCambio && matchPreco;
  });

  const marcasDisponiveis = [...new Set(veiculos.map((v) => v.marca).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen">
      {/* Cabeçalho do Painel do Lojista */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-gray-800">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800/60 px-3 py-1 rounded-full text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
            <span>Painel Exclusivo da Revenda</span>
            <span className="bg-blue-600/40 text-blue-300 px-2 py-0.5 rounded-full text-[10px] capitalize">
              Plano: {planoLoja}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            {nomeLojaAtual}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie o estoque de veículos cadastrados na sua vitrine oficial.
          </p>
        </div>

        <div>
          <Link
            to="/estoque"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl transition shadow-lg text-sm inline-block"
          >
            + Cadastrar Novo Veículo
          </Link>
        </div>
      </div>

      {/* Caixa de Pesquisa e Filtros */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl mb-12">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Filtrar Seu Estoque</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Pesquisar por Marca ou Modelo</label>
            <input
              type="text"
              placeholder="Ex: Corolla, Onix, Fiat..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Marca</label>
            <select
              value={filtroMarca}
              onChange={(e) => setFiltroMarca(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-600 transition"
            >
              <option value="">Todas as Marcas</option>
              {marcasDisponiveis.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Câmbio</label>
            <select
              value={filtroCambio}
              onChange={(e) => setFiltroCambio(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-600 transition"
            >
              <option value="">Todos</option>
              <option value="Automático">Automático</option>
              <option value="Manual">Manual</option>
              <option value="CVT">CVT</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Preço Máximo (R$)</label>
            <input
              type="number"
              placeholder="Ex: 80000"
              value={filtroPrecoMax}
              onChange={(e) => setFiltroPrecoMax(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-600 transition"
            />
          </div>
        </div>
      </div>

      {/* Listagem de Veículos da Loja */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Veículos em Estoque</h2>
        <span className="text-xs text-gray-400 font-medium">Exibindo {veiculosFiltrados.length} resultado(s)</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Carregando estoque da sua loja...</div>
      ) : veiculosFiltrados.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-400">
          <p className="text-lg font-semibold">Nenhum veículo encontrado no seu estoque.</p>
          <p className="text-sm text-gray-500 mt-1">Cadastre veículos novos para exibi-los em sua vitrine.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {veiculosFiltrados.map((veiculo) => (
            <div key={veiculo.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-gray-700 transition">
              <div>
                <div className="h-48 bg-gray-950 relative">
                  {veiculo.foto_principal_url ? (
                    <img src={veiculo.foto_principal_url} alt={veiculo.modelo} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Sem foto</div>
                  )}
                  <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow">
                    {nomeLojaAtual}
                  </span>
                  {(veiculo.destaque_home || veiculo.destaque) && (
                    <span className="absolute top-3 right-3 bg-amber-500 text-gray-950 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider shadow">
                      ★ Destaque
                    </span>
                  )}
                </div>

                <div className="p-6">
                  <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded font-medium">
                    {veiculo.ano_modelo || veiculo.ano_fabricacao} {veiculo.combustivel ? `• ${veiculo.combustivel}` : ''} {veiculo.cambio ? `• ${veiculo.cambio}` : ''}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-3">
                    {veiculo.marca} {veiculo.modelo}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">{veiculo.versao}</p>

                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                    <span className="text-xl font-black text-green-400">
                      {Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                    {veiculo.quilometragem ? (
                      <span className="text-xs text-gray-400 font-mono">{veiculo.quilometragem.toLocaleString('pt-BR')} km</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link
                  to={`/estoque`}
                  className="w-full text-center block bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs py-3 rounded-xl transition"
                >
                  Gerenciar no Estoque
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}