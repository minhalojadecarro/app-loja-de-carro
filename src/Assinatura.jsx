import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

export default function Assinatura() {
  const [termoBusca, setTermoBusca] = useState('');
  const [lojistas, setLojistas] = useState([]);
  const [lojaSelecionada, setLojaSelecionada] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [novoPlano, setNovoPlano] = useState('mensal');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  // Declarada antes do useEffect e envolvida em useCallback
  const carregarTodasLojas = useCallback(async () => {
    setLoading(true);
    setMensagem(null);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLojistas(data || []);
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar lojas: ' + err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarTodasLojas();
    }, 0);
    return () => clearTimeout(timer);
  }, [carregarTodasLojas]);

  const handleBuscar = async (e) => {
    e.preventDefault();
    if (!termoBusca.trim()) {
      carregarTodasLojas();
      return;
    }

    setLoading(true);
    setMensagem(null);
    setLojaSelecionada(null);

    try {
      const termo = `%${termoBusca.trim()}%`;
      // Buscando usando nome_loja e slug corretamente
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .or(`nome_loja.ilike.${termo},slug.ilike.${termo}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLojistas(data || []);
      if (data && data.length === 0) {
        setMensagem({ tipo: 'erro', texto: 'Nenhuma loja encontrada com esse termo.' });
      }
    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao buscar: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarAssinatura = async (e) => {
    e.preventDefault();
    if (!lojaSelecionada) return;

    setSalvando(true);
    setMensagem(null);

    try {
      // Atualiza o plano da loja selecionada
      const { error } = await supabase
        .from('tenants')
        .update({
          plano: novoPlano,
          subscription_status: 'active'
        })
        .eq('id', lojaSelecionada.id);

      if (error) throw error;

      setMensagem({ tipo: 'sucesso', texto: `Plano atualizado para "${novoPlano.toUpperCase()}" com sucesso!` });
      
      const lojaAtualizada = {
        ...lojaSelecionada,
        plano: novoPlano,
        subscription_status: 'active'
      };

      setLojaSelecionada(lojaAtualizada);
      setLojistas(lojistas.map(l => l.id === lojaSelecionada.id ? lojaAtualizada : l));

    } catch (err) {
      console.error(err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar: ' + err.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Assinaturas e Planos</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie e ative os planos dos lojistas após o recebimento do Pix.</p>
        </div>
        <button
          onClick={carregarTodasLojas}
          className="text-sm bg-gray-900 hover:bg-gray-800 border border-gray-800 px-3 py-2 rounded-lg text-gray-300 transition"
        >
          🔄 Atualizar Lista
        </button>
      </div>

      <form onSubmit={handleBuscar} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Filtrar por nome da loja ou slug..."
          value={termoBusca}
          onChange={(e) => {
            setTermoBusca(e.target.value);
            if (e.target.value === '') carregarTodasLojas();
          }}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition"
        >
          Pesquisar
        </button>
      </form>

      {mensagem && (
        <div className={`p-4 mb-6 rounded-lg ${mensagem.tipo === 'erro' ? 'bg-red-900/50 text-red-200 border border-red-700' : 'bg-green-900/50 text-green-200 border border-green-700'}`}>
          {mensagem.texto}
        </div>
      )}

      {lojaSelecionada ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
            <h2 className="text-xl font-semibold text-blue-400">Gerenciando: {lojaSelecionada.nome_loja || 'Sem Nome'}</h2>
            <button
              onClick={() => setLojaSelecionada(null)}
              className="text-sm text-gray-400 hover:text-white"
            >
              ← Voltar para a lista
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-gray-300 bg-gray-950 p-4 rounded-lg border border-gray-850">
            <div><strong className="text-gray-400">Slug:</strong> minhalojadecarro.com/{lojaSelecionada.slug}</div>
            <div><strong className="text-gray-400">WhatsApp:</strong> {lojaSelecionada.whatsapp || 'Não informado'}</div>
            <div><strong className="text-gray-400">Plano Atual:</strong> <span className="uppercase text-yellow-400 font-bold">{lojaSelecionada.plano || 'trial'}</span></div>
            <div><strong className="text-gray-400">Fim do Trial:</strong> {lojaSelecionada.trial_ends_at ? new Date(lojaSelecionada.trial_ends_at).toLocaleDateString() : 'N/A'}</div>
          </div>

          <form onSubmit={handleAtualizarAssinatura} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Novo Plano:</label>
              <select
                value={novoPlano}
                onChange={(e) => setNovoPlano(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="trial">Teste Gratuito (Trial)</option>
                <option value="mensal">Plano Mensal (R$ 49,90)</option>
                <option value="anual">Plano Anual (R$ 499,00)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition mt-4"
            >
              {salvando ? 'Salvando...' : 'Confirmar e Ativar Plano (Pix Confirmado)'}
            </button>
          </form>
        </div>
      ) : null}

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 font-semibold text-gray-300 flex justify-between items-center">
          <span>Lojas Cadastradas ({lojistas.length})</span>
          {loading && <span className="text-xs text-blue-400 animate-pulse">Carregando...</span>}
        </div>

        {lojistas.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">Nenhuma loja cadastrada encontrada.</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {lojistas.map((loja) => (
              <div key={loja.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-850 transition">
                <div>
                  <h3 className="font-bold text-lg text-white">{loja.nome_loja || 'Loja sem nome'}</h3>
                  <p className="text-sm text-gray-400">
                    Slug: <span className="text-blue-400">/{loja.slug}</span> | WhatsApp: {loja.whatsapp || 'N/A'}
                  </p>
                  <div className="flex gap-3 text-xs mt-2">
                    <span className="bg-gray-800 text-yellow-400 px-2 py-0.5 rounded font-semibold uppercase">
                      Plano: {loja.plano || 'trial'}
                    </span>
                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      Trial até: {loja.trial_ends_at ? new Date(loja.trial_ends_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setLojaSelecionada(loja);
                    setNovoPlano(loja.plano || 'mensal');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition self-start md:self-center"
                >
                  Gerenciar / Alterar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}