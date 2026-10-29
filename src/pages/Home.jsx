import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import HomeLogistas from './HomeLogistas';

export default function Home({ session, tenant, adminLogo, onNavigateRegister, onNavigateVitrine }) {
  // Verificação de permissão de Administrador
  const isAdmin = Boolean(
    tenant && 
    (
      String(tenant.subscription_status || '').toLowerCase() === 'admin' || 
      String(tenant.plano || '').toLowerCase() === 'admin'
    )
  );

  // Renderização Condicional: Se houver sessão ativa e o usuário NÃO for Administrador, exibe a Home do Lojista
  if (session && !isAdmin) {
    return <HomeLogistas session={session} tenant={tenant} />;
  }

  // Fluxo normal para Administradores globais ou visitantes deslogados
  const navigate = useNavigate();
  const [veiculosDestaque, setVeiculosDestaque] = useState([]);
  const [loadingDestaques, setLoadingDestaques] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [logoRaizAdmin, setLogoRaizAdmin] = useState(adminLogo || '');

  // Busca isolada da logo oficial do Administrador (is_admin = true)
  useEffect(() => {
    const fetchLogoAdminRaiz = async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('logo_url')
        .eq('is_admin', true)
        .maybeSingle();

      if (!error && data?.logo_url) {
        setLogoRaizAdmin(data.logo_url);
        localStorage.setItem('admin_logo_cache', data.logo_url);
      }
    };

    if (!adminLogo) {
      fetchLogoAdminRaiz();
    }
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
    } catch (err) {
      alert(`Copie o link da loja: ${urlSite}`);
    }
  };

  useEffect(() => {
  const fetchDestaques = async () => {
    setLoadingDestaques(true);

    // Pede ao Supabase os veículos em evidência e faz o join direto na tabela tenants
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
      .order('data_inicio_destaque', { ascending: true })
      .limit(6);

    if (error) {
      console.error('Erro ao buscar destaques:', error);
      setVeiculosDestaque([]);
      setLoadingDestaques(false);
      return;
    }

    // Mapeia os dados extraindo a loja associada
    const veiculosFormatados = (data || []).map(carro => {
      // O Supabase retorna a relação como um objeto ou array dependendo da FK
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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Banner Principal (Hero) */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8 flex flex-col items-start text-left space-y-6">
        <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          🔥 A plataforma ideal para revendas e autônomos
        </span>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Sua revenda de carros no <br />
          <span className="text-blue-500 block sm:inline mt-1 sm:mt-0">
            piloto automático.
          </span>
        </h1>

        <p className="text-gray-200 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
          Crie sua vitrine virtual profissional em minutos, gerencie o estoque e receba compradores qualificados direto no WhatsApp.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-4">
          {!session ? (
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105 inline-block text-center"
            >
              Criar Minha Loja Agora →
            </Link>
          ) : (
            <Link
              to="/estoque"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105 inline-block text-center"
            >
              Acessar Meu Painel →
            </Link>
          )}

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
      </section>

      {/* SEÇÃO DE VEÍCULOS EM DESTAQUE */}
      <section className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full">
            ESTOQUE EM ALTA
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            Destaques de nossas Revendas - Itens ilustrativo "fase de testes"
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
              const slugLoja = carro.lojaSlug;

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
                      <div className="text-xs text-gray-300 font-medium">
                        {carro.ano_modelo || carro.ano_fabricacao} • {carro.combustivel || 'Flex'}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-white text-lg tracking-tight leading-snug truncate" title={`${carro.marca} ${carro.modelo}`}>
                          {carro.marca} {carro.modelo}
                        </h3>
                        <p className="text-xs text-gray-300 mt-1 truncate">
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
                        // Pega o slug diretamente da relação do tenant ou usa o slug amigável padrão baseado no nome/id
                        const slugLoja = carro.tenants?.slug || (carro.tenant_id === 'd1c8cb8f-dd65-45d4-8ab9-1621645d2501' ? 'mariaregina' : 'carro-barato');
                        
                        console.log("Navegando para o slug exato:", slugLoja);
                        navigate(`/${slugLoja}`);
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
          <div className="flex justify-center pt-12 pb-6">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105 inline-block text-center"
            >
              Criar Loja Agora →
            </Link>
          </div>
        )}
      </section>

      {/* Seção de Recursos do Sistema */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-bold tracking-widest text-amber-500 uppercase">Recursos do Sistema</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Tudo o que sua revenda precisa em um só lugar.
          </h2>
          <p className="text-gray-200 text-sm sm:text-base font-normal">
            Sem planilhas complicadas ou sites lentos. Plataforma moderna pensada para quem vende no pátio e na internet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-6 font-bold text-xl">
              📱
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Vitrine Virtual Exclusiva</h3>
            <p className="text-gray-200 text-sm leading-relaxed font-normal">
              Tenha um link personalizado com a sua marca para colocar no Instagram e enviar aos clientes. Seu estoque organizado de forma rápida e elegante.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="w-12 h-12 bg-emerald-600/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6 font-bold text-xl">
              💬
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Integração com WhatsApp</h3>
            <p className="text-gray-200 text-sm leading-relaxed font-normal">
              O comprador entra no seu catálogo online e clica direto para falar com você no WhatsApp, acelerando o tempo de negociação e fechamento.
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-blue-500/50 transition">
            <div className="w-12 h-12 bg-amber-600/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 mb-6 font-bold text-xl">
              ⚡
            </div>
            <h3 className="text-lg font-bold mb-2 text-white">Gestão Simples de Estoque</h3>
            <p className="text-gray-200 text-sm leading-relaxed font-normal">
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
            <p className="text-gray-200 text-sm leading-relaxed font-normal">
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
          <p className="text-gray-200 text-base sm:text-lg max-w-xl mx-auto font-normal">
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