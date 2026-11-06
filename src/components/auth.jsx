import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [storeName, setStoreName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState('PJ');
  const [documento, setDocumento] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Função auxiliar para traduzir erros técnicos do Supabase para o português
  const traduzirErroSupabase = (mensagemOriginal) => {
    if (!mensagemOriginal) return 'Ocorreu um erro inesperado. Tente novamente.';
    
    if (mensagemOriginal.includes('Invalid login credentials')) {
      return 'E-mail ou palavra-passe incorretos. Verifique seus dados.';
    }
    if (mensagemOriginal.includes('User already registered')) {
      return 'Este e-mail já está cadastrado no sistema. Tente fazer login.';
    }
    if (mensagemOriginal.includes('Password should be at least 6 characters')) {
      return 'A palavra-passe deve ter pelo menos 6 caracteres.';
    }
    if (mensagemOriginal.includes('violates not-null constraint') || mensagemOriginal.includes('nome_loja')) {
      return 'Erro ao salvar os dados da loja. A coluna da base de dados é obrigatória.';
    }
    if (mensagemOriginal.includes('email rate limit exceeded')) {
      return 'Limite de envios de e-mail excedido temporariamente pelo servidor. Aguarde alguns minutos ou desative a confirmação de e-mail no painel do Supabase.';
    }
    if (mensagemOriginal.includes('Could not find') || mensagemOriginal.includes('column')) {
      return 'Erro de configuração na base de dados (coluna não encontrada). Certifique-se de que executou o script SQL com as colunas da tabela tenants.';
    }
    return `Erro: ${mensagemOriginal}`;
  };

  const handleDocumentoChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (tipoPessoa === 'PF') {
      if (value.length > 11) value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      if (value.length > 14) value = value.slice(0, 14);
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
    setDocumento(value);
  };

  const handleWhatsappChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) {
      value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    } else if (value.length > 0) {
      value = value.replace(/^(\d*)/, '($1');
    }
    setWhatsapp(value);
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (tenantData && tenantData.plano === 'trial' && tenantData.trial_ends_at) {
          if (new Date() > new Date(tenantData.trial_ends_at)) {
            await supabase
              .from('tenants')
              .update({ plano: 'blocked' })
              .eq('id', data.user.id);
            tenantData.plano = 'blocked';
          }
        }

        setMessage({ text: 'Login efetuado com sucesso!', type: 'success' });
        if (onLoginSuccess) onLoginSuccess({ user: data.user, tenant: tenantData });

      } else if (authMode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        const user = data.user;
        if (user) {
          const slug = generateSlug(storeName);
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);

          const newTenant = {
            id: user.id,
            nome: storeName,
            nome_loja: storeName,
            slug: slug,
            whatsapp: whatsapp,
            tipo_pessoa: tipoPessoa,
            documento: documento,
            plano: 'trial',
            trial_ends_at: trialEndsAt.toISOString(),
          };

          const { error: tenantError } = await supabase.from('tenants').insert([newTenant]);
          if (tenantError) throw tenantError;

          setMessage({ 
            text: 'Conta criada com sucesso! Aproveite seus 30 dias grátis.', 
            type: 'success' 
          });
          if (onLoginSuccess) onLoginSuccess({ user, tenant: newTenant });
        }

      } else if (authMode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://minhalojadecarro.com/#/reset-password',
        });
        if (error) throw error;

        setMessage({ 
          text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.', 
          type: 'success' 
        });
      }
    } catch (error) {
      setMessage({ text: traduzirErroSupabase(error.message), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 w-full">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <span className="bg-blue-600 text-white font-black px-3 py-1 rounded text-sm tracking-wider">
            MINHA LOJA DE CARRO
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-2">
            {authMode === 'login' && 'Acesse sua Conta'}
            {authMode === 'register' && 'Crie sua Revenda (30 Dias Grátis)'}
            {authMode === 'forgot' && 'Recuperar Palavra-passe'}
          </h2>
          <p className="text-sm text-gray-400">
            {authMode === 'login' && 'Gerencie seu estoque e sua vitrine online'}
            {authMode === 'register' && 'Tenha seu link exclusivo e WhatsApp integrado'}
            {authMode === 'forgot' && 'Enviaremos instruções para redefinir sua senha'}
          </p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            message.type === 'error' ? 'bg-red-950/80 text-red-300 border border-red-800' : 'bg-green-950/80 text-green-300 border border-green-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {authMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  Tipo de Cadastro
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTipoPessoa('PJ'); setDocumento(''); }}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      tipoPessoa === 'PJ' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    Pessoa Jurídica (CNPJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTipoPessoa('PF'); setDocumento(''); }}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      tipoPessoa === 'PF' 
                        ? 'bg-blue-600 border-blue-500 text-white' 
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    Pessoa Física (CPF)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  {tipoPessoa === 'PJ' ? 'Razão Social / Nome da Loja' : 'Nome do Proprietário / Loja'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={tipoPessoa === 'PJ' ? 'Ex: Auto Manaus Veículos LTDA' : 'Ex: João Veículos Multimarcas'}
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Seu link será: minhalojadecarro.com.br/<strong>{storeName ? generateSlug(storeName) : 'sualoja'}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  {tipoPessoa === 'PJ' ? 'CNPJ da Empresa' : 'CPF do Responsável'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={tipoPessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                  value={documento}
                  onChange={handleDocumentoChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                  WhatsApp de Atendimento
                </label>
                <input
                  type="text"
                  required
                  placeholder="(92) 99999-9999"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              E-mail de Acesso
            </label>
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
            />
          </div>

          {authMode !== 'forgot' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
                Palavra-passe (Senha)
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 transition"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
          >
            {loading ? 'A processar...' : (
              authMode === 'login' ? 'Entrar no Sistema' :
              authMode === 'register' ? 'Criar Loja Grátis (30 Dias)' :
              'Enviar E-mail de Recuperação'
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-gray-800 text-center space-y-2 text-sm">
          {authMode === 'login' && (
            <>
              <p className="text-gray-400">
                Não tem uma conta?{' '}
                <button onClick={() => setAuthMode('register')} className="text-blue-400 hover:underline font-semibold">
                  Criar Grátis
                </button>
              </p>
              <p>
                <button onClick={() => setAuthMode('forgot')} className="text-gray-400 hover:text-gray-300 text-xs underline">
                  Esqueci minha palavra-passe
                </button>
              </p>
            </>
          )}

          {authMode === 'register' && (
            <p className="text-gray-400">
              Já tem uma conta?{' '}
              <button onClick={() => setAuthMode('login')} className="text-blue-400 hover:underline font-semibold">
                Fazer Login
              </button>
            </p>
          )}

          {authMode === 'forgot' && (
            <p className="text-gray-400">
              Lembrou-se da senha?{' '}
              <button onClick={() => setAuthMode('login')} className="text-blue-400 hover:underline font-semibold">
                Voltar ao Login
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}