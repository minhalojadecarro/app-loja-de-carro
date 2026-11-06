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
    const handleAuthTokens = async () => {
      let fullHash = window.location.hash; // ex: #/reset-password#access_token=...
      
      // Se a URL contiver um segundo hash com o access_token, normalizamos os tokens
      if (fullHash.includes('#access_token=')) {
        const parts = fullHash.split('#access_token=');
        const tokenParams = new URLSearchParams('access_token=' + parts[1]);
        const accessToken = tokenParams.get('access_token');
        const refreshToken = tokenParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError(`Erro ao autenticar com o link: ${sessionError.message}`);
          } else {
            setIsReady(true);
            // Limpa a barra de endereços para remover os tokens expostos por segurança
            window.history.replaceState({}, document.title, window.location.pathname + '#/reset-password');
            return;
          }
        }
      }
    };

    handleAuthTokens();
  }, []);

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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-semibold rounded transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}