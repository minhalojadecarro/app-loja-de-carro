import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Ouve alterações de autenticação (captura o evento de recovery do Supabase)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    // 2. Fallback caso o usuário venha com tokens direto na URL (hash/query params)
    const handleAuthTokens = async () => {
      // O Supabase v2 gerencia tokens na URL automaticamente se usar createClient padrão,
      // mas mantemos a verificação de sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
      } else {
        // Tenta ler caso venha no formato antigo de hash
        const fullHash = window.location.hash;
        if (fullHash.includes('access_token=')) {
          setIsReady(true);
        } else {
          // Se não houver sessão nem token após um breve delay, avisa o usuário
          setTimeout(() => {
            if (!isReady) {
              setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
            }
          }, 1500);
        }
      }
    };

    handleAuthTokens();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isReady]);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError(`Erro ao atualizar a senha: ${updateError.message}`);
    } else {
      setMessage('Senha atualizada com sucesso! Redirecionando para a tela de login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-400">Redefinir Senha</h2>

        {message && (
          <div className="p-3 mb-4 text-sm bg-green-900/50 border border-green-500 text-green-300 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 text-sm bg-red-900/50 border border-red-500 text-red-300 rounded">
            {error}
          </div>
        )}

        {/* Mostra o formulário apenas se estiver pronto/autenticado para redefinir */}
        {!isReady && !error ? (
          <div className="text-center py-6 text-gray-400 animate-pulse text-sm">
            Validando link de recuperação...
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nova Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a nova senha"
                required
                minLength={6}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}