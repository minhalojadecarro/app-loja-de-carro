import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { AppRoutes } from './routes/AppRoutes';

function AppContent() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tenantData, setTenantData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLogo, setAdminLogo] = useState(null);
  const [adminNome, setAdminNome] = useState('Minha Loja de Carro');
  const [selectedStore, setSelectedStore] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Função para atualizar o tenant na memória global e no cache na hora
  const handleTenantUpdated = (novosDados) => {
    setTenantData(prev => ({ ...prev, ...novosDados }));
    
    if (novosDados.logo_url && !isAdmin) {
      localStorage.setItem('tenant_logo_cache', novosDados.logo_url);
    }
    if (novosDados.nome_loja && !isAdmin) {
      localStorage.setItem('tenant_nome_cache', novosDados.nome_loja);
    }
  };

  const navigate = useNavigate();

  const handleNavigateRegister = () => {
    navigate('/login');
  };

  useEffect(() => {
    // BUSCA EXCLUSIVA DO ADMINISTRADOR RAIZ (is_admin = true)
    const fetchAdminMaster = async () => {
      const { data: adminData, error } = await supabase
        .from('tenants')
        .select('logo_url, nome_loja')
        .eq('is_admin', true)
        .maybeSingle();

      if (!error && adminData) {
        if (adminData.logo_url) setAdminLogo(adminData.logo_url);
        if (adminData.nome_loja) setAdminNome(adminData.nome_loja);
      }
    };

    fetchAdminMaster();

    const handleInstantUpdate = () => {
      if (!isAdmin) {
        const novaLogo = localStorage.getItem('tenant_logo_cache');
        const novoNome = localStorage.getItem('tenant_nome_cache');
        
        setTenantData(prev => ({
          ...prev,
          logo_url: novaLogo || prev?.logo_url,
          nome_loja: novoNome || prev?.nome_loja
        }));
      }
    };

    window.addEventListener('tenantUpdatedInstant', handleInstantUpdate);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserRoleAndTenant(session);
      } else {
        setLoadingSession(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkUserRoleAndTenant(session);
      } else {
        setTenantData(null);
        setUserProfile(null);
        setIsAdmin(false);
        setLoadingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoleAndTenant = async (currentSession) => {
    setLoadingSession(true);
    const userId = currentSession.user.id;
    const userEmail = currentSession.user.email;

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_admin, foto_perfil_url, nome')
        .eq('id', userId)
        .maybeSingle();

      setUserProfile(profileData);

      const userIsAdmin = profileData?.is_admin === true || userEmail === 'minhalojadecarro@gmail.com';
      setIsAdmin(userIsAdmin);

      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && tenant) {
        setTenantData(tenant);
        setSelectedStore(tenant);
      } else {
        setTenantData(null);
      }
    } catch (err) {
      console.error('Erro ao verificar permissões do usuário:', err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTenantData(null);
    setUserProfile(null);
    setIsAdmin(false);
    localStorage.removeItem('tenant_logo_cache');
    localStorage.removeItem('tenant_nome_cache');
    navigate('/');
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <p className="text-lg animate-pulse">Carregando sistema...</p>
      </div>
    );
  }

  // DEFINIÇÃO BLINDADA: Garante prioridade ao adminLogo quando deslogado ou admin, e cache/tenant quando lojista
  const logoParaExibir = (!session || isAdmin) 
    ? (adminLogo || localStorage.getItem('tenant_logo_cache')) 
    : (tenantData?.logo_url || adminLogo || localStorage.getItem('tenant_logo_cache'));

  const nomeExibicao = (!session || isAdmin) 
    ? adminNome 
    : (tenantData?.nome_loja || adminNome);

  const fotoPerfilUser = userProfile?.foto_perfil_url || null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Navbar Superior Fixa */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* LOGO E NOME */}
          <Link 
            to={isAdmin || !session ? '/' : `/${tenantData?.slug || ''}`}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer" 
          >
            <div className="h-9 sm:h-12 w-auto min-w-[36px] flex items-center">
              <img 
                src={logoParaExibir || "https://via.placeholder.com/150"} 
                alt={nomeExibicao} 
                className="h-9 sm:h-12 w-auto max-w-[120px] sm:max-w-[150px] object-contain rounded-lg border border-gray-800 bg-gray-950 p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
              <div className="w-9 h-9 bg-blue-600 rounded-xl items-center justify-center text-white font-bold text-base shadow-md" style={{ display: 'none' }}>
                🚗
              </div>
            </div>

            <span className="text-xs sm:text-xl font-bold tracking-tight text-white whitespace-nowrap">
              {nomeExibicao}
            </span>
          </Link>

          {/* MENUS DE NAVEGAÇÃO */}
          <nav className="hidden md:flex items-center gap-4">
            <Link
              to="/"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              Home
            </Link>

            {!session && (
              <>
                <Link
                  to="/sobre"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Sobre
                </Link>

                <Link
                  to="/planos"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Planos
                </Link>
              </>
            )}

            {session && !isAdmin && tenantData && (
              <Link
                to={`/${tenantData.slug || String(tenantData.nome_loja || '').toLowerCase().trim().replace(/\s+/g, '-')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition flex items-center gap-1.5"
              >
                <span>Minha Vitrine</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            )}

            {session && (
              <>
                <Link
                  to="/veiculos"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Estoque
                </Link>

                <Link
                  to="/vitrines"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Vitrines
                </Link>

                <Link
                  to="/relatorios"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Relatórios / Vendas
                </Link>
              </>
            )}
          </nav>

          {/* ÁREA DIREITA: AVATAR COM MENU UNIFICADO */}
          <div className="flex items-center gap-3">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  onMouseEnter={() => setProfileMenuOpen(true)}
                  className="flex items-center gap-3 p-1.5 rounded-full hover:bg-slate-800 transition border border-transparent hover:border-slate-700 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full ${isAdmin ? 'bg-amber-600 border-2 border-amber-400' : 'bg-blue-600 border-2 border-blue-400'} flex items-center justify-center overflow-hidden text-white font-bold shadow-md`}>
                    {fotoPerfilUser ? (
                      <img src={fotoPerfilUser} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{nomeExibicao.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </button>

                {profileMenuOpen && (
                  <div 
                    onMouseLeave={() => setProfileMenuOpen(false)}
                    className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-3 z-50"
                  >
                    <div className="px-4 py-2 border-b border-slate-800 mb-2">
                      <p className="text-xs font-bold text-white truncate">{nomeExibicao}</p>
                      <p className="text-[11px] text-gray-400 truncate">{session.user.email}</p>
                      <span className={`inline-block mt-2 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${isAdmin ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-blue-950 text-blue-400 border border-blue-800'}`}>
                        {isAdmin ? 'ADMINISTRADOR' : `Plano: ${tenantData?.plano || 'Gratuito'}`}
                      </span>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/lojas"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-slate-800 transition flex items-center gap-2.5"
                      >
                        <span>🏢</span> Gestao de Lojas (Admin)
                      </Link>
                    )}

                    <Link
                      to="/configuracoes"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>⚙️</span> Configuracoes da Conta
                    </Link>

                    <Link
                      to="/planos"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>💳</span> Ver Planos e Precos
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/assinaturas"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                      >
                        <span>💳</span> Gestao de Assinaturas
                      </Link>
                    )}

                    {!isAdmin && Boolean(tenantData?.slug) && (
                      <Link
                        to={`/${tenantData.slug}`}
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                      >
                        <span>🏠</span> Minha Vitrine Publica
                      </Link>
                    )}

                    <div className="border-t border-slate-800 my-2"></div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-600/20 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span>🚪</span> Sair da Conta
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-900/40 whitespace-nowrap"
                >
                  Criar Conta Gratis 
                </Link>

                <Link
                  to="/login"
                  className="bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg"
                >
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Dinâmico das Rotas */}
      <main className="flex-1">
        <AppRoutes 
          session={session} 
          tenantData={tenantData} 
          isAdmin={isAdmin} 
          selectedStore={selectedStore} 
          onNavigateRegister={handleNavigateRegister}
          onTenantUpdated={handleTenantUpdated}
        />
      </main>

      {/* Rodapé Global */}
      <footer className="bg-slate-950 border-t border-slate-900 py-10 mt-auto text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400">
          
          <Link 
            to={isAdmin || !session ? '/' : `/${tenantData?.slug || ''}`}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer" 
          >
            <div className="h-8 sm:h-10 w-auto min-w-[32px] flex items-center">
              {logoParaExibir ? (
                <img 
                  src={logoParaExibir} 
                  alt={nomeExibicao} 
                  className="h-8 sm:h-10 w-auto max-w-[100px] sm:max-w-[130px] object-contain rounded-lg border border-gray-800 bg-gray-950 p-1"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  🚗
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight text-white whitespace-nowrap">
              {nomeExibicao}
            </span>
          </Link>

          <div className="text-center text-gray-400">
            <p>© {new Date().getFullYear()} Minha Loja de Carro. Todos os direitos reservados.</p>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/sobre" className="hover:text-white transition">Sobre</Link>
            <Link to="/planos" className="hover:text-white transition">Planos</Link>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppContent />
  );
}