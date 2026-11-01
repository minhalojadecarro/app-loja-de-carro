import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function DashboardFinanceiro({ session, tenant, isAdmin }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');

  // Verificação de administrador
  const eAdministrador = Boolean(
    isAdmin || 
    (tenant && (
      String(tenant.subscription_status || '').toLowerCase() === 'admin' ||
      String(tenant.plano || '').toLowerCase() === 'admin'
    )) ||
    session?.user?.email === 'minhalojadecarro@gmail.com'
  );

  useEffect(() => {
    let isMounted = true;

    async function carregarDados() {
      const { data, error } = await supabase.from('tenants').select('*');
      if (isMounted) {
        if (!error && data) {
          setTenants(data);
        }
        setLoading(false);
      }
    }

    carregarDados();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchDadosFinanceiros = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tenants').select('*');
    if (!error && data) {
      setTenants(data);
    }
    setLoading(false);
  };

  // Função para calcular o status do plano (com blindagem para a loja do Admin)
  const getStatusAssinatura = (loja) => {
    const slugLoja = String(loja.slug || '').toLowerCase();
    const nomeLoja = String(loja.nome_loja || loja.nome || loja.name || '').toLowerCase();
    
    // Blindagem: Se for a loja principal do Administrador, força como Ativa / Anual / Master
    if (slugLoja === 'minhalojadecarro' || nomeLoja.includes('minha loja de carro')) {
      return { label: 'ANUAL (ADMIN)', cor: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
    }

    const plano = String(loja.plano || loja.subscription_status || 'trial').toLowerCase();
    if (plano === 'admin') return { label: 'Administrador', cor: 'bg-purple-950 text-purple-400 border-purple-800' };

    const dataValidadeStr = loja.trial_ends_at || loja.data_vencimento;
    if (!dataValidadeStr) return { label: 'Indefinido', cor: 'bg-gray-800 text-gray-400 border-gray-700' };

    const hoje = new Date();
    const validade = new Date(dataValidadeStr);

    if (validade < hoje) {
      return { label: 'Vencido', cor: 'bg-red-950 text-red-400 border-red-800' };
    } else {
      return { label: plano.toUpperCase(), cor: 'bg-emerald-950 text-emerald-400 border-emerald-800' };
    }
  };

  // Verificação auxiliar para saber se a loja está ativa
  const isLojaAtiva = (loja) => {
    const statusObj = getStatusAssinatura(loja);
    return statusObj.label !== 'Vencido';
  };

  // Cálculos dos KPIs (Indicadores)
  const totalLojas = tenants.length;

  const lojasAtivas = tenants.filter(l => isLojaAtiva(l)).length;
  const lojasVencidas = tenants.filter(l => getStatusAssinatura(l).label === 'Vencido').length;

  // Estimativa de Faturamento com base nos planos ativos
  const receitaEstimada = tenants.reduce((acc, l) => {
    if (!isLojaAtiva(l)) return acc;
    const plano = String(l.plano || '').toLowerCase();
    if (plano === 'anual') return acc + 499; // Ajustado para o valor correto do plano anual
    if (plano === 'mensal') return acc + 49.90; // Ajustado para o plano mensal
    return acc;
  }, 0);

  // Filtragem das lojas para a tabela
  const lojasFiltradas = tenants.filter(l => {
    const nomeLoja = (l.nome_loja || l.nome || l.name || '').toLowerCase();
    const slugLoja = (l.slug || '').toLowerCase();
    const matchBusca = !termoBusca || nomeLoja.includes(termoBusca.toLowerCase()) || slugLoja.includes(termoBusca.toLowerCase());

    const statusObj = getStatusAssinatura(l);
    let matchStatus = true;
    if (filtroStatus === 'ativos') matchStatus = statusObj.label !== 'Vencido';
    if (filtroStatus === 'vencidos') matchStatus = statusObj.label === 'Vencido';
    if (filtroStatus === 'trial') matchStatus = String(l.plano || '').toLowerCase() === 'trial';

    return matchBusca && matchStatus;
  });

  if (!eAdministrador) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20 text-center text-white">
        <h2 className="text-2xl font-bold text-red-400">Acesso Restrito</h2>
        <p className="text-gray-400 mt-2">Esta página é exclusiva para administradores da plataforma.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 w-full bg-gray-950 text-white min-h-screen space-y-8">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Gestão SaaS & Faturamento</span>
          <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Financeiro</h1>
          <p className="text-sm text-gray-400 mt-1">Acompanhe a receita recorrente, status de assinaturas e saúde da base de lojistas.</p>
        </div>
        <button
          onClick={fetchDadosFinanceiros}
          className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-amber-400 font-bold px-5 py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow"
        >
          🔄 Atualizar Dados
        </button>
      </div>

      {/* CARDS DE KPIS EXECUTIVOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Receita Potencial (Ano/Mês)</span>
          <h3 className="text-3xl font-black text-emerald-400">
            {receitaEstimada.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
          <p className="text-xs text-gray-500">Baseado nos planos ativos cadastrados</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Assinaturas Ativas / Em Dia</span>
          <h3 className="text-3xl font-black text-blue-400">{lojasAtivas}</h3>
          <p className="text-xs text-gray-500">Lojistas com acesso liberado</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Planos Vencidos / Expirados</span>
          <h3 className="text-3xl font-black text-red-400">{lojasVencidas}</h3>
          <p className="text-xs text-gray-500">Requerem renovação ou cobrança</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl space-y-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total de Revendas</span>
          <h3 className="text-3xl font-black text-white">{totalLojas}</h3>
          <p className="text-xs text-gray-500">Lojas cadastradas na plataforma</p>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-96">
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome da loja ou slug..."
            className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${filtroStatus === 'todos' ? 'bg-amber-500 text-gray-950' : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Todas ({totalLojas})
          </button>
          <button
            onClick={() => setFiltroStatus('ativos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${filtroStatus === 'ativos' ? 'bg-amber-500 text-gray-950' : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Ativas
          </button>
          <button
            onClick={() => setFiltroStatus('vencidos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${filtroStatus === 'vencidos' ? 'bg-amber-500 text-gray-950' : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Vencidas
          </button>
          <button
            onClick={() => setFiltroStatus('trial')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${filtroStatus === 'trial' ? 'bg-amber-500 text-gray-950' : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}`}
          >
            Em Trial
          </button>
        </div>
      </div>

      {/* TABELA DETALHADA DE ASSINATURAS */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-500 animate-pulse">Carregando dados financeiros...</div>
        ) : lojasFiltradas.length === 0 ? (
          <div className="p-16 text-center text-gray-500 space-y-2">
            <p className="text-lg font-bold">Nenhuma revenda encontrada com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs font-bold text-gray-400 uppercase bg-gray-950/50">
                  <th className="p-4">Revenda / Loja</th>
                  <th className="p-4">Slug (URL)</th>
                  <th className="p-4">Contato (WhatsApp)</th>
                  <th className="p-4">Plano Atual</th>
                  <th className="p-4">Validade / Vencimento</th>
                  <th className="p-4 text-center">Status Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm">
                {lojasFiltradas.map((loja) => {
                  const statusInfo = getStatusAssinatura(loja);
                  const dataValidade = loja.trial_ends_at || loja.data_vencimento;

                  return (
                    <tr key={loja.id} className="hover:bg-gray-800/40 transition">
                      <td className="p-4 font-bold text-white">
                        {loja.nome_loja || loja.nome || loja.name || 'Loja sem Nome'}
                      </td>
                      <td className="p-4 text-xs text-amber-400 font-mono">
                        /{loja.slug || '-'}
                      </td>
                      <td className="p-4 text-gray-300">
                        {loja.whatsapp || 'Não informado'}
                      </td>
                      <td className="p-4 font-semibold uppercase text-xs text-gray-300">
                        {loja.plano || loja.subscription_status || 'Trial'}
                      </td>
                      <td className="p-4 text-xs text-gray-400">
                        {dataValidade ? new Date(dataValidade).toLocaleDateString('pt-BR') : 'Sem data definida'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.cor}`}>
                          {statusInfo.label}
                        </span>
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