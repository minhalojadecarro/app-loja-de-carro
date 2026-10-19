import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Home({ session, tenant, adminLogo, onNavigateRegister, onNavigateVitrine }) {
  const [veiculosDestaque, setVeiculosDestaque] = useState([]);
  const [loadingDestaques, setLoadingDestaques] = useState(true);

  useEffect(() => {
    const fetchDestaques = async () => {
      setLoadingDestaques(true);

      // 1. Buscamos os veículos em destaque marcados pelo Admin
      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('*')
        .eq('destaque', true)
        .limit(4);

      if (veiculosError) {
        console.error('Erro ao buscar destaques:', veiculosError);
        setLoadingDestaques(false);
        return;
      }

      if (veiculosData && veiculosData.length > 0) {
        // 2. Buscamos as lojas correspondentes
        const tenantIds = veiculosData.map((v) => v.tenant_id).filter(Boolean);

        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('*')
          .in('id', tenantIds);

        // 3. Mapeamos as lojas para cada veículo
        const veiculosFormatados = veiculosData.map((veiculo) => {
          const loja = (tenantsData || []).find((t) => t.id === veiculo.tenant_id);
          return {
            ...veiculo,
            tenants: loja || null
          };
        });

        setVeiculosDestaque(veiculosFormatados);
      } else {
        setVeiculosDestaque([]);
      }

      setLoadingDestaques(false);
    };

    fetchDestaques();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Banner Principal (Hero) */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-8 flex flex-col items-start text-left space-y-6">
        {/* BADGE ALINHADA À ESQUERDA */}
        <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
          🔥 A plataforma ideal para revendas e autônomos
        </span>

        {/* TÍTULO COM QUEBRA DE LINHA E SEM WHITESPACE-NOWRAP */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl">
          Sua revenda de carros no <br />
          <span className="text-blue-500 block sm:inline mt-1 sm:mt-0">
            piloto automático.
          </span>
        </h1>

        {/* SUBTÍTULO / DESCRIÇÃO */}
        <p className="text-gray-200 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
          Crie sua vitrine virtual profissional em minutos, gerencie o estoque e receba compradores qualificados direto no WhatsApp.
        </p>
      </section>

      {/* SEÇÃO DE VEÍCULOS EM DESTAQUE */}
      <section className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full">
            ESTOQUE EM ALTA
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            Destaques de nossas Revendas
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
              const nomeLoja = 
                carro.tenants?.nome_loja || 
                carro.tenants?.nome || 
                carro.tenants?.name || 
                'Loja Parceira';

              return (
                <div 
                  key={carro.id} 
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl hover:border-gray-700 transition group flex flex-col justify-between"
                >
                  <div>
                    {/* Foto do Veículo com Badge da Loja */}
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
                      <span className="absolute top-4 left-4 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md shadow-lg">
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
                        const slugLoja = carro.tenants?.slug || carro.tenants?.nome_loja || carro.tenants?.nome;
                        if (slugLoja) {
                          const slugFormatado = String(slugLoja).toLowerCase().replace(/\s+/g, '-');
                          window.location.href = `/${slugFormatado}`;
                        } else if (typeof onNavigateVitrine === 'function') {
                          onNavigateVitrine(carro.tenant_id, carro.tenants);
                        }
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

        {/* Botão Criar Minha Loja Agora */}
        {!session && (
          <div className="flex justify-center pt-12 pb-6">
            <button
              onClick={onNavigateRegister}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-105"
            >
              Criar Minha Loja Agora →
            </button>
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

      {/* SEÇÃO: COMO FUNCIONA NA PRÁTICA? */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900 w-full">
        <div className="bg-gray-900/30 border border-gray-800/80 rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-bold tracking-widest text-blue-400 uppercase">Simplicidade</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2">
              Como funciona na prática?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Passo 01 */}
            <div className="space-y-3">
              <span className="inline-block bg-white text-blue-600 text-2xl font-black px-4 py-1.5 rounded-xl shadow-md font-mono mb-3">
                1º Passo
              </span>
              <h3 className="text-xl font-bold">Crie sua Conta</h3>
              <p className="text-amber-300 text-sm leading-relaxed font-semibold">
                Compartilhe o seu link exclusivo e receba clientes interessados direto no seu WhatsApp.
              </p>
            </div>

            {/* Passo 02 */}
            <div className="space-y-3">
              <span className="inline-block bg-white text-blue-600 text-2xl font-black px-4 py-1.5 rounded-xl border border-blue-200 shadow-lg font-mono mb-3">
                2º Passo
              </span>
              <h3 className="text-xl font-bold">Adicione seus Carros</h3>
              <p className="text-amber-300 text-sm leading-relaxed font-semibold">
                Compartilhe o seu link exclusivo e receba clientes interessados direto no seu WhatsApp.
              </p>
            </div>

            {/* Passo 03 */}
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

      {/* SEÇÃO: CHAMADA PARA AÇÃO (CTA FINAL) */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-900 text-center w-full">
        <div className="max-w-3xl mx-auto bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-10 sm:p-16 shadow-2xl space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Pronto para transformar sua revenda digital?
          </h2>
          <p className="text-gray-200 text-base sm:text-lg max-w-xl mx-auto font-normal">
            Experimente por 30 dias totalmente grátis. Crie seu catálogo profissional agora mesmo.
          </p>
          {!session && (
            <div className="pt-4">
              <button
                onClick={onNavigateRegister}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-xl shadow-lg shadow-blue-900/50 transition text-lg transform hover:scale-105"
              >
                Começar Agora Grátis →
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}