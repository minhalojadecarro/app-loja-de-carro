import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import BlockedTenant from './components/BlockedTenant';
import Planos from './components/Planos';
import Home from './pages/Home';
import HomeLogistas from './pages/HomeLogistas';
import Lojas from './pages/Lojas';
import Veiculos from './pages/Veiculos';
import Vitrines from './pages/Vitrines';
import VitrinePublicaSlug from './pages/VitrinePublicaSlug';
import Sobre from './pages/Sobre';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios';
import Assinatura from './Assinatura';

export default function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [tenantData, setTenantData] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [adminLogo, setAdminLogo] = useState(null);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [selectedStore, setSelectedStore] = useState(null);
  
  // Estado para controlar o menu suspenso do perfil
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const path = window.location.pathname.replace(/^\//, '').trim();
  const rotasInternas = ['login', 'admin', 'compradores', 'sobre', 'planos', 'home', 'configuracoes', ''];

  useEffect(() => {
    const fetchAdminLogo = async () => {
      // 1. Tenta buscar o registro onde o status ou plano é 'admin' e possui logo_url preenchida
      const { data: adminData } = await supabase
        .from('tenants')
        .select('logo_url')
        .or('subscription_status.ilike.admin,plano.ilike.admin')
        .not('logo_url', 'is', null)
        .maybeSingle();
      
      if (adminData && adminData.logo_url) {
        setAdminLogo(adminData.logo_url);
        return;
      }

      // 2. Fallback: Se não achar pela tag admin, pega o primeiro tenant que possua logo_url cadastrada na coluna
      const { data: firstTenantData } = await supabase
        .from('tenants')
        .select('logo_url')
        .not('logo_url', 'is', null)
        .limit(1)
        .maybeSingle();

      if (firstTenantData && firstTenantData.logo_url) {
        setAdminLogo(firstTenantData.logo_url);
      }
    };

    fetchAdminLogo();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkTenant(session.user.id);
      else setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkTenant(session.user.id);
      } else {
        setTenantData(null);
        setLoadingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab, path]);

  const checkTenant = async (userId) => {
    setLoadingSession(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar dados do tenant:', error);
      setTenantData(null);
    } else {
      setTenantData(data);
      setSelectedStore(data);
      
      const isUserAdmin = Boolean(
        data && 
        (
          String(data.subscription_status || '').toLowerCase() === 'admin' || 
          String(data.plano || '').toLowerCase() === 'admin'
        )
      );

      const isTrialExpirado = !isUserAdmin && (
        data.plano === 'blocked' || 
        data.subscription_status === 'blocked' ||
        (
          (String(data.subscription_status || '').toLowerCase() === 'trial' || String(data.plano || '').toLowerCase() === 'trial') && 
          data.trial_ends_at && 
          new Date(data.trial_ends_at) < new Date()
        )
      );
      
      if (isUserAdmin) {
        setCurrentTab('home');
      } else if (isTrialExpirado) {
        setCurrentTab('planos');
      } else {
        setCurrentTab('home_logista');
      }
    }
    setLoadingSession(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setTenantData(null);
    window.location.href = '/';
  };

  if (path && !rotasInternas.includes(path.toLowerCase())) {
    return <VitrinePublicaSlug slug={path} />;
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <p className="text-lg animate-pulse">A carregar sistema...</p>
      </div>
    );
  }

  const isAdmin = Boolean(
    tenantData && 
    (
      String(tenantData.subscription_status || '').toLowerCase() === 'admin' || 
      String(tenantData.plano || '').toLowerCase() === 'admin'
    )
  );

  const isBlocked = !isAdmin && tenantData && (
    tenantData.plano === 'blocked' || 
    tenantData.subscription_status === 'blocked' ||
    (tenantData.subscription_status === 'trial' && tenantData.trial_ends_at && new Date(tenantData.trial_ends_at) < new Date())
  );

  if (isBlocked && session && currentTab !== 'planos') {
    return <BlockedTenant tenant={tenantData} onLogout={handleLogout} />;
  }

  const fotoPerfilUser = tenantData?.foto_perfil_url;
  const nomeExibicao = (session && tenantData && !isAdmin) ? (tenantData.nome_loja || tenantData.nome || 'Minha Loja de Carro') : 'Minha Loja de Carro';
  
  // LOGO DINÂMICA: Exibe a do lojista se logado (e não admin), senão puxa o adminLogo cadastrado na tabela tenants
  const logoParaExibir = (session && tenantData && tenantData.logo_url && !isAdmin) ? tenantData.logo_url : adminLogo;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Navbar Superior Fixa (Sticky) */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* LOGO E NOME */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer" 
            onClick={() => setCurrentTab(isAdmin || !session ? 'home' : 'home_logista')}
          >
            <div className="h-9 sm:h-12 w-auto min-w-[36px] flex items-center">
              {logoParaExibir ? (
                <img 
                  src={logoParaExibir} 
                  alt={nomeExibicao} 
                  className="h-9 sm:h-12 w-auto max-w-[120px] sm:max-w-[150px] object-contain rounded-lg border border-gray-800 bg-gray-950 p-1"
                />
              ) : (
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md">
                  🚗
                </div>
              )}
            </div>

            <span className="text-xs sm:text-xl font-bold tracking-tight text-white whitespace-nowrap">
              {nomeExibicao}
            </span>
          </div>

          {/* MENUS DE NAVEGAÇÃO LIMPOS */}
          <nav className="hidden md:flex items-center gap-4">
            
            {/* Home para Admin ou Visitantes */}
            {(!session || isAdmin) && (
              <button
                onClick={() => setCurrentTab('home')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  currentTab === 'home'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                Home
              </button>
            )}

            {!session && (
              <>
                <button
                  onClick={() => setCurrentTab('compradores')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'compradores'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Vitrine / Comprar
                </button>

                <button
                  onClick={() => setCurrentTab('planos')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'planos'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Planos
                </button>
              </>
            )}

            {/* ITENS PARA LOJISTA LOGADO (NÃO ADMIN) */}
            {session && !isAdmin && (
              <>
                <button
                  onClick={() => {
                    setSelectedStore(tenantData);
                    setCurrentTab('home_logista');
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'home_logista'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Home
                </button>

                <button
                  onClick={() => setCurrentTab('veiculos')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'veiculos'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Estoque
                </button>

                <button
                  onClick={() => setCurrentTab('vitrines')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'vitrines'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Vitrines
                </button>

                <button
                  onClick={() => setCurrentTab('relatorios')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'relatorios'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Relatórios / Vendas
                </button>
              </>
            )}

            {/* ITENS COMPARTILHADOS PELO ADMIN */}
            {session && isAdmin && (
              <>
                <button
                  onClick={() => setCurrentTab('veiculos')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'veiculos'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Estoque
                </button>

                <button
                  onClick={() => setCurrentTab('vitrines')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'vitrines'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Vitrines
                </button>

                <button
                  onClick={() => setCurrentTab('relatorios')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    currentTab === 'relatorios'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Relatórios / Vendas
                </button>
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
                  <span className="text-xs font-semibold text-gray-200 hidden xl:inline">
                    {nomeExibicao}
                  </span>
                </button>

                {/* DROPDOWN DO PERFIL / ADMIN */}
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
                      <button
                        onClick={() => {
                          setCurrentTab('lojas');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-400 hover:bg-slate-800 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <span>🏢</span> Gestão de Lojas (Admin)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setCurrentTab('configuracoes');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span>⚙️</span> Configurações da Conta
                    </button>

                    <button
                      onClick={() => {
                        setCurrentTab('planos');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span>💳</span> Ver Planos e Preços
                    </button>

                    <button
                      onClick={() => {
                        setCurrentTab('assinaturas');
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <span>💳</span> Gestão de Assinaturas
                    </button>

                    {!isAdmin && (
                      <button
                        onClick={() => {
                          setSelectedStore(tenantData);
                          setCurrentTab('home_logista');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <span>🏠</span> Minha Vitrine Pública
                      </button>
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
                <button
                  onClick={() => {
                    setAuthInitialMode('register');
                    setCurrentTab('login');
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg shadow-blue-900/40 whitespace-nowrap cursor-pointer"
                >
                  Criar Conta Grátis 
                </button>

                <button
                  onClick={() => {
                    setAuthInitialMode('login');
                    setCurrentTab('login');
                  }}
                  className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-lg cursor-pointer ${
                    currentTab === 'login'
                      ? 'bg-gray-800 border border-gray-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
                  }`}
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Dinâmico */}
      <main className="flex-1">
        {currentTab === 'login' && !session ? (
          <Auth initialMode={authInitialMode} />
        ) : (
          <>
            {currentTab === 'home' && (
              <Home 
                session={session} 
                tenant={tenantData} 
                adminLogo={adminLogo}
                onNavigateRegister={() => {
                  setAuthInitialMode('register');
                  setCurrentTab('login');
                }}
                onNavigateVitrine={(tenantId, tenantObj) => {
                  setSelectedStore(tenantObj || tenantId);
                  setCurrentTab('home_logista');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentTab === 'home_logista' && (
              <VitrinePublicaSlug slug={selectedStore?.slug || tenantData?.slug || tenantData?.nome || 'loja'} />
            )}

            {currentTab === 'compradores' && <HomeLogistas selectedStore={selectedStore} />}
            {currentTab === 'sobre' && <Sobre onNavigatePlanos={() => setCurrentTab('planos')} />}
            
            {currentTab === 'planos' && (
              <Planos 
                tenant={tenantData} 
                session={session}
                onSelectPlan={() => {
                  setAuthInitialMode('register');
                  setCurrentTab('login');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateRegister={() => {
                  setAuthInitialMode('register');
                  setCurrentTab('login');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentTab === 'lojas' && (session && isAdmin ? <Lojas /> : <div className="p-10 text-center text-red-400 font-bold">Acesso restrito.</div>)}
            {currentTab === 'veiculos' && (
              session ? (
                <Veiculos session={session} tenant={tenantData} isAdmin={isAdmin} />
              ) : (
                <div className="p-10 text-center text-gray-400">Faça login para gerenciar o estoque.</div>
              )
            )}
            {currentTab === 'vitrines' && (
              session ? (
                <Vitrines session={session} tenant={tenantData} isAdmin={isAdmin} selectedStore={selectedStore} />
              ) : (
                <div className="p-10 text-center text-gray-400">Faça login para ver as vitrines.</div>
              )
            )}
            {currentTab === 'relatorios' && (session ? <Relatorios session={session} tenant={tenantData} /> : <div className="p-10 text-center text-gray-400">Faça login para acessar os relatórios.</div>)}
            {currentTab === 'configuracoes' && (session ? <Configuracoes session={session} tenant={tenantData} /> : <div className="p-10 text-center text-gray-400">Faça login para acessar as configurações.</div>)}
            {currentTab === 'assinaturas' && <Assinatura />}
          </>
        )}
      </main>

      {/* Rodapé Global */}
      <footer className="bg-slate-950 border-t border-slate-900 py-10 mt-auto text-gray-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400">
          
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer" 
            onClick={() => setCurrentTab(isAdmin || !session ? 'home' : 'home_logista')}
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
          </div>

          <div className="text-center text-gray-400">
            <p>© {new Date().getFullYear()} Minha Loja de Carro. Todos os direitos reservados.</p>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentTab('sobre')} className="hover:text-white transition cursor-pointer">Sobre</button>
            <button onClick={() => setCurrentTab('planos')} className="hover:text-white transition cursor-pointer">Planos</button>
          </div>

        </div>
      </footer>
    </div>
  );
}