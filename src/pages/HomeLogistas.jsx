import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function HomeLogistas() {
  const [veiculos, setVeiculos] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Filtros e Busca
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroCambio, setFiltroCambio] = useState('');
  const [filtroPrecoMax, setFiltroPrecoMax] = useState('');

  useEffect(() => {
    const fetchCatalogo = async () => {
      setLoading(true);

      // Buscar todas as lojas para associar aos veículos
      const { data: tenantsData } = await supabase.from('tenants').select('*');
      setTenants(tenantsData || []);

      // Buscar apenas veículos que NÃO estejam vendidos
      const { data: veiculosData, error } = await supabase
        .from('veiculos')
        .select('*')
        .neq('status', 'Vendido')
        .order('created_at', { ascending: false });

      if (!error && veiculosData) {
        const listaMapeada = veiculosData
          .filter((v) => v.status !== 'Vendido') // Garante a exclusão de veículos vendidos
          .map((v) => {
            const loja = (tenantsData || []).find((l) => l.id === v.tenant_id);
            return {
              ...v,
              tenants: loja || { nome_loja: 'Revenda Autorizada', slug: '', whatsapp: '' }
            };
          });
        setVeiculos(listaMapeada);
      }
      setLoading(false);
    };

    fetchCatalogo();
  }, []);

  // Filtragem dinâmica dos veículos com base nos critérios do cliente
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

  // Lista de marcas únicas para preencher o select de filtro
  const marcasDisponiveis = [...new Set(veiculos.map((v) => v.marca).filter(Boolean))];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen">
      {/* Cabeçalho da Vitrine para Compradores */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <div className="inline-block bg-blue-950 border border-blue-800/60 px-3 py-1 rounded-full text-xs font-semibold text-blue-400 uppercase tracking-wider">
          Vitrine de Veículos / Multimarcas
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
          Encontre o seu <span className="text-blue-500">carro dos sonhos</span> com segurança.
        </h1>
        <p className="text-gray-400 text-base">
          Explore veículos selecionados de diversas revendas parceiras. Negocie direto com o lojista via WhatsApp.
        </p>
      </div>

      {/* Caixa de Pesquisa e Filtros Avançados */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl mb-12">
        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Filtrar Veículos</h2>
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

      {/* Listagem de Veículos */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Veículos Disponíveis</h2>
        <span className="text-xs text-gray-400 font-medium">Exibindo {veiculosFiltrados.length} resultado(s)</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500 animate-pulse">Carregando estoque de veículos...</div>
      ) : veiculosFiltrados.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
          Nenhum veículo encontrado com os filtros selecionados. Tente limpar os filtros para ver mais opções.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {veiculosFiltrados.map((veiculo) => {
            const loja = veiculo.tenants;
            // Prioriza nome_loja, com fallback para nome e name
            const nomeLoja = loja?.nome_loja || loja?.nome || loja?.name || 'Revenda Autorizada';
            const slugLoja = loja?.slug;
            const whatsappLoja = loja?.whatsapp || '';

            return (
              <div key={veiculo.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between hover:border-gray-700 transition">
                <div>
                  <div className="h-48 bg-gray-950 relative">
                    {veiculo.foto_principal_url ? (
                      <img src={veiculo.foto_principal_url} alt={veiculo.modelo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">Sem foto</div>
                    )}
                    <span className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow">
                      {nomeLoja}
                    </span>
                    {veiculo.destaque_home && (
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

                <div className="p-6 pt-0 flex gap-2">
                  {slugLoja ? (
                    <a
                      href={`/${slugLoja}`}
                      className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs py-3 rounded-xl transition"
                    >
                      Ver Loja
                    </a>
                  ) : null}

                  {whatsappLoja ? (
                    <a
                      href={`https://wa.me/55${whatsappLoja.replace(/\D/g, '')}?text=Olá,%20vi%20o%20veículo%20${veiculo.marca}%20${veiculo.modelo}%20no%20site%20e%20gostaria%20de%20mais%20informações.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center bg-green-600 hover:bg-green-500 text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-green-900/30"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="flex-1 text-center text-xs text-gray-500 italic py-3">Contato indisponível</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}