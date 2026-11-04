import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import HomeLogistas from './HomeLogistas';

export default function Home({ session, tenant, adminLogo }) {
  // 1. TODOS OS HOOKS DEVEM FICAR NO TOPO DO COMPONENTE (Sem retornos antes deles)
  const navigate = useNavigate();
  const [veiculosDestaque, setVeiculosDestaque] = useState([]);
  const [loadingDestaques, setLoadingDestaques] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [, setLogoRaizAdmin] = useState(adminLogo || '');
  
  // Novos estados para as redes sociais do Admin na Home principal
  const [adminInstagram, setAdminInstagram] = useState('https://instagram.com/minhalojadecarro');
  const [adminFacebook, setAdminFacebook] = useState('');

  // Verificação de permissão de Administrador
  const isAdmin = Boolean(
    tenant && 
    (
      String(tenant.subscription_status || '').toLowerCase() === 'admin' || 
      String(tenant.plano || '').toLowerCase() === 'admin'
    )
  );

  // Busca isolada da logo e redes sociais oficiais do Administrador (is_admin = true)
  useEffect(() => {
    const fetchAdminMasterInfo = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('logo_url, instagram_url, facebook_url')
        .eq('is_admin', true)
        .maybeSingle();

      if (!error && data) {
        if (data.logo_url) {
          setLogoRaizAdmin(data.logo_url);
          localStorage.setItem('admin_logo_cache', data.logo_url);
        }
        if (data.instagram_url) setAdminInstagram(data.instagram_url);
        if (data.facebook_url) setAdminFacebook(data.facebook_url);
      }
    };

    fetchAdminMasterInfo();
  }, [adminLogo]);

  const handleShare = async () => {
    const urlSite = window.location.href;

    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'Minha Loja de Carro',
          text: 'Confira nossa vitrine virtual de veículos!',
          url: urlSite,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(urlSite);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
        return;
      } catch (err) {
        console.warn('Erro ao usar navigator.clipboard:', err);
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = urlSite;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 3000);
      } else {
        alert(`Copie o link da loja: ${urlSite}`);
      }
    } catch {
      alert(`Copie o link da loja: ${urlSite}`);
    }
  };

  useEffect(() => {
    const fetchDestaques = async () => {
      setLoadingDestaques(true);

      const { data, error } = await supabase
        .from('veiculos')
        .select(`
          *,
          tenants (
            id,
            nome_loja,
            slug
          )
        `)
        .eq('status_destaque', 'em_evidencia')
        .neq('status', 'Vendido')
        .order('data_inicio_destaque', { ascending: true })
        .limit(6);

      if (error) {
        console.error('Erro ao buscar destaques:', error);
        setVeiculosDestaque([]);
        setLoadingDestaques(false);
        return;
      }

      const veiculosFormatados = (data || []).map(carro => {
        const loja = Array.isArray(carro.tenants) ? carro.tenants[0] : carro.tenants;

        return {
          ...carro,
          lojaNome: loja?.nome_loja ? String(loja.nome_loja).trim() : 'Revenda Parceira',
          lojaSlug: loja?.slug ? String(loja.slug).trim() : carro.tenant_id
        };
      });

      setVeiculosDestaque(veiculosFormatados);
      setLoadingDestaques(false);
    };

    fetchDestaques();
  }, []);

  // 2. RENDERIZAÇÃO CONDICIONAL APÓS TODOS OS HOOKS
  if (session && !isAdmin) {
    return <HomeLogistas session={session} tenant={tenant} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Banner Principal (Hero) */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8 flex flex-col items-center text-center space-y-6">
        <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          🔥 Gestão completa, venda mais sem complicação!
        </span>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Sua revenda de VEÍCULOS no <br />
          <span className="text-blue-500 block sm:inline mt-1 sm:mt-0">
            piloto automático.
          </span>
        </h1>

        <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
          Crie sua vitrine virtual profissional em minutos, gerencie o estoque, vendas e receba compradores qualificados direto no seu WhatsApp.
        </p>

        {/* Vídeo do Leo Integrado Abaixo do Texto */}
        <div className="w-full max-w-xl mx-auto pt-4 pb-2">
          <div className="relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-900 aspect-[9/16] sm:aspect-video flex items-center justify-center">
            <video 
              controls 
              autoPlay 
              muted 
              loop 
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/videos/Leo 1.mp4" type="video/mp4" />
              Seu navegador não suporta vídeos.
            </video>
          </div>
        </div>

        {/* Links para Redes Sociais do Admin abaixo do Vídeo */}
        <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
          {adminInstagram && (
            <a
              href={adminInstagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 text-white font-medium text-sm hover:opacity-95 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram</span>
            </a>
          )}

          {adminFacebook && (
            <a
              href={adminFacebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white font-medium text-sm hover:opacity-95 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.37 14.5 5 15.5 5H18V0h-3.808C10.59 0 9 1.581 9 4.75V8z"/>
              </svg>
              <span>Facebook</span>
            </a>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {session && (
            <Link
              to="/estoque"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105 inline-block text-center"
            >
              Acessar Meu Painel →
            </Link>
          )}
        </div>
      </section>

      {/* SEÇÃO DE VEÍCULOS EM DESTAQUE */}
      <section className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full">
            VEJA ALGUMAS DE NOSSAS LOJAS PARCEIRAS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            Destaques de Nossos Clientes - Itens ilustrativos &quot;fase de testes&quot;
          </h2>
        </div>

        {loadingDestaques ? (
          <div className="text-center py-8 text-gray-400 animate-pulse text-sm">
            Carregando destaques...
          </div>
        ) : veiculosDestaque.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            Nenhum veículo em destaque selecionado no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {veiculosDestaque.map((carro) => {
              const nomeLoja = carro.lojaNome;

              return (
                <div 
                  key={carro.id} 
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl hover:border-gray-700 transition group flex flex-col justify-between"
                >
                  <div>
                    {/* Foto do Veículo com Badge da Loja correta */}
                    <div className="h-56 w-full bg-gray-950 relative overflow-hidden">
                      {carro.foto_principal_url ? (
                        <img 
                          src={carro.foto_principal_url} 
                          alt={`${carro.marca} ${carro.modelo}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium">
                          Sem Imagem
                        </div>
                      )}
                      <span className="absolute top-4 left-4 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md shadow-lg truncate max-w-[200px]" title={nomeLoja}>
                        {nomeLoja}
                      </span>
                    </div>

                    {/* Informações do Veículo */}
                    <div className="p-6 space-y-4">
                      <div className="text-xs text-gray-400 font-medium">
                        {carro.ano_modelo || carro.ano_fabricacao} • {carro.combustivel || 'Flex'}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-white text-lg tracking-tight leading-snug truncate" title={`${carro.marca} ${carro.modelo}`}>
                          {carro.marca} {carro.modelo}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {carro.versao || `${carro.ano_modelo || carro.ano_fabricacao}`}
                        </p>
                      </div>

                      <div className="pt-2">
                        <span className="text-xl font-black text-green-400">
                          {Number(carro.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ver Vitrine da Loja */}
                  <div className="p-6 pt-0">
                    <button
                      onClick={() => {
                        const slugLojaUrl = carro.tenants?.slug || (carro.tenant_id === 'd1c8cb8f-dd65-45d4-8ab9-1621645d2501' ? 'mariaregina' : 'carro-barato');
                        navigate(`/${slugLojaUrl}`);
                      }}
                      className="w-full bg-gray-950 hover:bg-gray-800 text-blue-400 hover:text-blue-300 border border-gray-800 text-xs font-bold py-3 rounded-xl transition flex items-center justify-center shadow-inner cursor-pointer"
                    >
                      Ver Vitrine da Loja
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!session && (
          <div className="flex justify-center items-center gap-4 pt-12 pb-6 flex-wrap">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105 inline-block text-center"
            >
              Criar Minha Loja Agora →
            </Link>
            <button
              onClick={handleShare}
              className="bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold px-6 py-4 rounded-xl border border-gray-800 shadow-lg transition flex items-center gap-2 transform hover:scale-105 cursor-pointer text-sm sm:text-base"
              title="Compartilhar plataforma"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684" />
              </svg>
              {copiado ? 'Link Copiado! 🚀' : 'Compartilhar Site'}
            </button>
          </div>
        )}
      </section>

      {/* Seção de Recursos do Sistema */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">Recursos do Sistema</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Tudo que o VENDEDOR precisa em um único lugar.
          </h2>
          <p className="text-gray-300 text-sm sm:text-base font-normal">
            Sem planilhas complicadas ou sites lentos. Plataforma moderna pensada para quem vende no pátio e na internet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 font-bold text-xl">
              📱
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Vitrine Virtual Exclusiva</h3>
            <p className="text-gray-300 text-sm leading-relaxed font-normal">
              Tenha um link personalizado com a sua marca para colocar no Instagram e enviar aos clientes. Seu estoque organizado de forma rápida e elegante.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6 font-bold text-xl">
              💬
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Integração com WhatsApp</h3>
            <p className="text-gray-300 text-sm leading-relaxed font-normal">
              O comprador entra no seu catálogo online e clica direto para falar com você no WhatsApp, acelerando o tempo de negociação e fechamento.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="w-12 h-12 bg-amber-600/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 mb-6 font-bold text-xl">
              ⚡
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Gestão Simples de Estoque</h3>
            <p className="text-gray-300 text-sm leading-relaxed font-normal">
              Cadastre carros, adicione fotos, marque preços e altere destaques em poucos segundos. Controle total do pátio na palma da mão.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition relative overflow-hidden">
            <span className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Novo
            </span>
            <div className="w-12 h-12 bg-purple-600/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6 font-bold text-xl">
              📊
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Dashboard de Vendas</h3>
            <p className="text-gray-300 text-sm leading-relaxed font-normal">
              Acompanhe métricas de visualizações, carros mais acessados e relatórios completos para impulsionar o seu negócio automotivo.
            </p>
          </div>
        </div>
      </section>

      {/* Seção Como Funciona */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900 w-full">
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">Simplicidade</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              Como funciona na prática?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <span className="inline-block bg-white text-blue-600 text-2xl font-black px-4 py-1.5 rounded-xl shadow-md font-mono mb-3">
                1º Passo
              </span>
              <h3 className="text-xl font-bold">Crie sua Conta</h3>
              <p className="text-amber-300 text-sm leading-relaxed font-semibold">
                Faça o cadastro da sua loja em menos de 1 minuto e obtenha o seu endereço exclusivo na plataforma.
              </p>
            </div>

            <div className="space-y-3">
              <span className="inline-block bg-white text-blue-600 text-2xl font-black px-4 py-1.5 rounded-xl border border-blue-200 shadow-lg font-mono mb-3">
                2º Passo
              </span>
              <h3 className="text-xl font-bold">Adicione seus Carros</h3>
              <p className="text-amber-300 text-sm leading-relaxed font-semibold">
                Cadastre os veículos do seu pátio com fotos, detalhes, ano e valor de forma rápida e intuitiva.
              </p>
            </div>

            <div className="space-y-3">
              <span className="inline-block bg-white text-blue-600 text-2xl font-black px-4 py-1.5 rounded-xl shadow-md font-mono mb-3">
                3º Passo
              </span>
              <h3 className="text-xl font-bold">Divulgue e Venda</h3>
              <p className="text-amber-300 text-sm leading-relaxed font-semibold">
                Compartilhe o seu link exclusivo e receba clientes interessados direto no seu WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900 text-center w-full">
        <div className="max-w-3xl mx-auto bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-10 sm:p-16 shadow-2xl space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Pronto para transformar sua revenda digital?
          </h2>
          <p className="text-gray-300 text-base sm:text-lg max-w-xl mx-auto font-normal">
            Experimente por 30 dias totalmente grátis. Crie seu catálogo profissional agora mesmo.
          </p>
          {!session && (
            <div className="flex justify-center pt-6">
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105 inline-block text-center text-lg"
              >
                Começar Agora Grátis →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}