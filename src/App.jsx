import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async'; // <--- Importando o Helmet
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
  const [adminCapaOG, setAdminCapaOG] = useState('https://motyshnlombyzidqhjgk.supabase.co/storage/v1/object/public/veiculos-fotos/1793455032740_14zpk9g933q.jpg'); // <--- Estado para a capa dinâmica do Admin
  
  // Estados para as redes sociais globais do admin no rodapé
  const [adminInstagram, setAdminInstagram] = useState('https://instagram.com/minhalojadecarro');
  const [adminFacebook, setAdminFacebook] = useState('');

  const [selectedStore, setSelectedStore] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigateRegister = () => {
    navigate('/login');
  };

  const currentPathMatchesTenant = useCallback((slug) => {
    return location.pathname === `/${slug}`;
  }, [location.pathname]);

  // Função para verificar permissões e tenant, memorizada com useCallback
  const checkUserRoleAndTenant = useCallback(async (currentSession) => {
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
        // Se for lojista logado e ele tiver capa própria configurada, podemos opcionalmente usá-la na home dele
        if (tenant.capa_vitrine_url && currentPathMatchesTenant(tenant.slug)) {
          setAdminCapaOG(tenant.capa_vitrine_url);
        }
      } else {
        setTenantData(null);
      }
    } catch (err) {
      console.error('Erro ao verificar permissões do usuário:', err);
    } finally {
      setLoadingSession(false);
    }
  }, [currentPathMatchesTenant]);

  // Função para atualizar o tenant na memória global e no cache na hora
  const handleTenantUpdated = (novosDados) => {
    setTenantData(prev => ({ ...prev, ...novosDados }));
    
    if (novosDados.logo_url && !isAdmin) {
      localStorage.setItem('tenant_logo_cache', novosDados.logo_url);
    }
    if (novosDados.nome_loja && !isAdmin) {
      localStorage.setItem('tenant_nome_cache', novosDados.nome_loja);
    }
    // Se o admin atualizar a capa da vitrine principal
    if (novosDados.capa_vitrine_url && (isAdmin || !session)) {
      setAdminCapaOG(novosDados.capa_vitrine_url);
    }
  };

  useEffect(() => {
    // BUSCA EXCLUSIVA DO ADMINISTRADOR RAIZ (is_admin = true) - Incluindo capa, nome, logo e redes sociais
    const fetchAdminMaster = async () => {
      const { data: adminData, error } = await supabase
        .from('tenants')
        .select('logo_url, nome_loja, capa_vitrine_url, instagram_url, facebook_url')
        .eq('is_admin', true)
        .maybeSingle();

      if (!error && adminData) {
        if (adminData.logo_url) setAdminLogo(adminData.logo_url);
        if (adminData.nome_loja) setAdminNome(adminData.nome_loja);
        if (adminData.capa_vitrine_url) setAdminCapaOG(adminData.capa_vitrine_url);
        if (adminData.instagram_url) setAdminInstagram(adminData.instagram_url);
        if (adminData.facebook_url) setAdminFacebook(adminData.facebook_url);
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

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('tenantUpdatedInstant', handleInstantUpdate);
    };
  }, [checkUserRoleAndTenant, isAdmin]);

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

  // DEFINIÇÃO BLINDADA
  const logoParaExibir = (!session || isAdmin) 
    ? (adminLogo || localStorage.getItem('tenant_logo_cache')) 
    : (tenantData?.logo_url || adminLogo || localStorage.getItem('tenant_logo_cache'));

  const nomeExibicao = (!session || isAdmin) 
    ? adminNome 
    : (tenantData?.nome_loja || adminNome);

  // Definição dinâmica da imagem de capa OG para o Helmet na raiz/home
  const imagemCapaOGAtiva = (!session || isAdmin)
    ? adminCapaOG
    : (tenantData?.capa_vitrine_url || adminCapaOG);

  const fotoPerfilUser = userProfile?.foto_perfil_url || null;

  const currentPath = location.pathname;
  const homeTargetSlug = session && !isAdmin && tenantData?.slug ? `/${tenantData.slug}` : "/";
  const isHomeActive = currentPath === homeTargetSlug || (session && !isAdmin && tenantData?.slug && currentPath === `/${tenantData.slug}`);
  const isEstoqueActive = currentPath === '/veiculos' || currentPath === '/estoque';
  const isVitrinesActive = currentPath === '/vitrines';
  const isRelatoriosActive = currentPath === '/relatorios';
  const isSobreActive = currentPath === '/sobre';
  const isPlanosActive = currentPath === '/planos';

  // URLs finais ativas no rodapé (se for lojista logado usa o dele, senão usa o do Admin)
  const instagramAtivo = (!session || isAdmin) ? adminInstagram : (tenantData?.instagram_url || adminInstagram);
  const facebookAtivo = (!session || isAdmin) ? adminFacebook : (tenantData?.facebook_url || adminFacebook);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* INJEÇÃO DINÂMICA DE METADADOS OPEN GRAPH / SEO */}
      <Helmet>
        <title>{nomeExibicao} | Encontre seu Veículo ou Moto</title>
        <meta property="og:title" content={`${nomeExibicao} | Encontre seu Veículo ou Moto`} />
        <meta property="og:description" content="Confira o estoque atualizado com preços da Tabela FIPE e as melhores ofertas de carros e motos." />
        <meta property="og:image" content={imagemCapaOGAtiva} />
        <meta name="twitter:title" content={`${nomeExibicao} | Encontre seu Veículo ou Moto`} />
        <meta name="twitter:description" content="Confira o estoque atualizado com preços da Tabela FIPE e as melhores ofertas." />
        <meta name="twitter:image" content={imagemCapaOGAtiva} />
      </Helmet>

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

          {/* MENUS DE NAVEGAÇÃO (DESKTOP) */}
          <nav className="hidden md:flex items-center gap-4">
            {session && !isAdmin ? (
              <Link
                to="/painel-lojista"
                className="px-4 py-2 rounded-xl text-sm font-semibold transition text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Painel
              </Link>
            ) : (
              <Link
                to={isAdmin ? "/home-publica" : "/"}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  isHomeActive ? 'text-white bg-gray-800 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Home
              </Link>
            )}

            {session && isAdmin && (
              <Link
                to="/painel-lojista"
                className="px-4 py-2 rounded-xl text-sm font-semibold transition text-gray-400 hover:text-white hover:bg-gray-800"
              >
                Painel
              </Link>
            )}

            {!session && (
              <>
                <Link
                  to="/sobre"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isSobreActive ? 'text-white bg-gray-800 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Sobre
                </Link>

                <Link
                  to="/planos"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isPlanosActive ? 'text-white bg-gray-800 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Planos
                </Link>
              </>
            )}

            {session && !isAdmin && tenantData && (
              <Link
                to={`/${tenantData.slug}`}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  currentPath === `/${tenantData.slug}` 
                    ? 'text-white bg-gray-800 shadow' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Minha Vitrine
              </Link>
            )}

            {session && (
              <>
                <Link
                  to="/veiculos"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isEstoqueActive ? 'text-white bg-gray-800 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Estoque
                </Link>

                {isAdmin && (
                  <Link
                    to="/vitrines"
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                      isVitrinesActive ? 'text-white bg-gray-800 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    Vitrines
                  </Link>
                )}

                <Link
                  to="/relatorios"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    isRelatoriosActive ? 'text-white bg-gray-800 shadow' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Relatórios / Vendas
                </Link>
              </>
            )}
          </nav>

          {/* ÁREA DIREITA: AVATAR COM MENU SUSPENSO */}
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

                    <div className="px-3 py-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Menu de Navegação
                    </div>

                    <Link
                      to={isAdmin ? "/home-publica" : homeTargetSlug}
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>🏠</span> Home
                    </Link>

                    {session && !isAdmin && tenantData && (
                      <Link
                        to="/painel-lojista"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-sky-400 hover:bg-slate-800 hover:text-sky-300 transition flex items-center gap-2.5"
                      >
                        <span>📊</span> Painel de Gestão
                      </Link>
                    )}

                    {session && !isAdmin && tenantData && (
                      <Link
                        to={`/${tenantData.slug}`}
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                      >
                        <span>🔗</span> Minha Vitrine Pública
                      </Link>
                    )}

                    <Link
                      to="/veiculos"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>🚗</span> Estoque de Veículos/Motos
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/vitrines"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                      >
                        <span>🌟</span> Vitrines
                      </Link>
                    )}

                    <Link
                      to="/relatorios"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>📊</span> Relatórios / Vendas
                    </Link>

                    <div className="border-t border-slate-800 my-2"></div>

                    <div className="px-3 py-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Configurações e Conta
                    </div>

                    {isAdmin && (
                      <Link
                        to="/lojas"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-slate-800 transition flex items-center gap-2.5"
                      >
                        <span>🏢</span> Gestao de Lojas (Admin)
                      </Link>
                    )}

                    <Link
                      to="/configuracoes"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>⚙️</span> Configuracoes da Conta
                    </Link>

                    <Link
                      to="/planos"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                    >
                      <span>💳</span> Planos e Preços
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/assinaturas"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5"
                      >
                        <span>💳</span> Gestao de Assinaturas
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        to="/dashboard-financeiro"
                        onClick={() => setProfileMenuOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-slate-800 transition flex items-center gap-2.5"
                      >
                        <span>📈</span> Dashboard Financeiro (SaaS)
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

          {/* REDES SOCIAIS E LINKS INSTITUCIONAIS */}
          <div className="flex items-center gap-4">
            {instagramAtivo && (
              <a 
                href={instagramAtivo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-900 hover:bg-slate-800 text-gray-300 hover:text-pink-400 rounded-full transition border border-slate-800"
                title="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}

            {facebookAtivo && (
              <a 
                href={facebookAtivo} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-slate-900 hover:bg-slate-800 text-gray-300 hover:text-blue-400 rounded-full transition border border-slate-800"
                title="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.37 14.5 5 15.5 5H18V0h-3.808C10.59 0 9 1.581 9 4.75V8z"/>
                </svg>
              </a>
            )}

            <Link to="/sobre" className="hover:text-white transition px-2">Sobre</Link>
            <Link to="/planos" className="hover:text-white transition px-2">Planos</Link>
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