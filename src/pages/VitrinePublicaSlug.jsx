import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';

export default function VitrinePublicaSlug({ session }) {
  const { slug } = useParams();
  
  const [tenant, setTenant] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLojaEValores = async () => {
      setLoading(true);
      
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(slug);

      let tenantData = null;

      if (isUuid) {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', slug)
          .maybeSingle();
        
        if (!error) tenantData = data;
      } else {
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .ilike('slug', slug)
          .maybeSingle();

        if (!error) tenantData = data;
      }

      if (!tenantData && !isUuid) {
        const { data: tenantByName } = await supabase
          .from('tenants')
          .select('*')
          .ilike('nome_loja', slug.replace(/-/g, ' '))
          .maybeSingle();

        if (tenantByName) {
          tenantData = tenantByName;
        }
      }

      if (tenantData) {
        setTenant(tenantData);
        fetchVeiculos(tenantData.id);
      } else {
        setLoading(false);
      }
    };

    const fetchVeiculos = async (tenantId) => {
      const { data: veiculosData, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('status_destaque', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar veículos na vitrine:', error);
      }

      const veiculosDisponiveis = (veiculosData || []).filter((v) => {
        const statusVeiculo = String(v.status || '').trim().toLowerCase();
        return statusVeiculo !== 'vendido' && !statusVeiculo.includes('vendido');
      });

      setVeiculos(veiculosDisponiveis);
      setLoading(false);
    };

    if (slug) {
      fetchLojaEValores();
    }
  }, [slug]);

  // Função de Compartilhamento Inteligente no mesmo padrão da Home raiz
  const handleShareVeiculo = async (carro, nomeLoja) => {
    const urlVeiculo = window.location.href;
    const titulo = `${carro.marca} ${carro.modelo} (${carro.ano_modelo || carro.ano_fabricacao})`;
    const precoFormatado = Number(carro.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const texto = `Confira este ${titulo} por ${precoFormatado} na ${nomeLoja}! Veja mais detalhes aqui:`;

    if (navigator.share) {
      try {
        if (carro.foto_principal_url && navigator.canShare) {
          try {
            const response = await fetch(carro.foto_principal_url);
            const blob = await response.blob();
            const file = new File([blob], 'veiculo.jpg', { type: blob.type });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: titulo,
                text: texto,
                url: urlVeiculo,
                files: [file],
              });
              return;
            }
          } catch (e) {
            console.warn('Não foi possível anexar imagem diretamente, compartilhando link e texto.', e);
          }
        }

        await navigator.share({
          title: titulo,
          text: `${texto} ${urlVeiculo}`,
          url: urlVeiculo,
        });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(urlVeiculo);
        alert('Link do veículo copiado para a área de transferência!');
        return;
      } catch (err) {
        console.warn('Erro ao copiar link:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <p className="text-lg animate-pulse font-medium">A carregar vitrine da loja...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-3xl font-black mb-2 text-red-500">Loja não encontrada</h1>
        <p className="text-gray-400">A revenda com o endereço "{slug}" não existe ou foi desativada.</p>
      </div>
    );
  }

  const nomeLojaExibicao = tenant?.nome || tenant?.name || tenant?.nome_loja || 'Minha Loja de Carro';
  const urlAtualCompleta = window.location.href;
  const imagemCapaPadrao = "https://motyshnlombyzidhqhjgk.supabase.co/storage/v1/object/public/veiculos-fotos/1791554491753_tup6bx9wbn.jpg";
  const imagemCapaLoja = tenant?.capa_vitrine_url || imagemCapaPadrao;
  const tituloVitrineMeta = `${nomeLojaExibicao} | Estoque de Veículos`;
  const descricaoVitrineMeta = `Confira o estoque atualizado de carros e motos da revenda ${nomeLojaExibicao}. As melhores ofertas estão aqui!`;
  const whatsappLoja = tenant?.whatsapp ? String(tenant.whatsapp).replace(/\D/g, '') : '5592991701002';

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <Helmet>
        <title>{tituloVitrineMeta}</title>
        <meta property="og:type" content="website" />
        <meta property="og:url" content={urlAtualCompleta} />
        <meta property="og:title" content={tituloVitrineMeta} />
        <meta property="og:description" content={descricaoVitrineMeta} />
        <meta property="og:image" content={imagemCapaLoja} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={urlAtualCompleta} />
        <meta name="twitter:title" content={tituloVitrineMeta} />
        <meta name="twitter:description" content={descricaoVitrineMeta} />
        <meta name="twitter:image" content={imagemCapaLoja} />
      </Helmet>

      <div className="max-w-7xl mx-auto">
        {/* Listagem de Veículos */}
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3.5 py-1.5 rounded-full">
            VITRINE DE VEÍCULOS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 tracking-tight">
            Estoque Disponível ({veiculos.length})
          </h2>
        </div>

        {veiculos.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-400 shadow-xl">
            Nenhum veículo disponível no momento para esta loja.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {veiculos.map((veiculo) => {
              const mensagemWp = encodeURIComponent(`Olá! Vi o anúncio do ${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo || veiculo.ano_fabricacao}) na vitrine da ${nomeLojaExibicao} e gostaria de mais informações.`);
              const emDestaque = veiculo.status_destaque === 'em_evidencia';

              return (
                <div 
                  key={veiculo.id} 
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl hover:border-gray-700 transition group flex flex-col justify-between"
                >
                  <div>
                    {/* Foto do Veículo com Badge da Loja */}
                    <div className="h-56 w-full bg-gray-950 relative overflow-hidden">
                      {veiculo.foto_principal_url ? (
                        <img 
                          src={veiculo.foto_principal_url} 
                          alt={`${veiculo.marca} ${veiculo.modelo}`} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-medium">
                          Sem Imagem
                        </div>
                      )}
                      
                      <span className="absolute top-4 left-4 bg-blue-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md shadow-lg truncate max-w-[200px]" title={nomeLojaExibicao}>
                        {nomeLojaExibicao}
                      </span>

                      {emDestaque && (
                        <span className="absolute top-4 right-4 bg-amber-500 text-gray-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-lg">
                          ⭐ Destaque
                        </span>
                      )}
                    </div>

                    {/* Informações do Veículo */}
                    <div className="p-6 space-y-4">
                      <div className="text-xs text-gray-400 font-medium">
                        {veiculo.ano_modelo || veiculo.ano_fabricacao} - {veiculo.combustivel || 'Flex'}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-white text-lg tracking-tight leading-snug truncate" title={`${veiculo.marca} ${veiculo.modelo}`}>
                          {veiculo.marca} {veiculo.modelo}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {veiculo.versao || `${veiculo.ano_modelo || veiculo.ano_fabricacao}`}
                        </p>
                      </div>

                      {/* Valores: Preço de Venda e Tabela FIPE lado a lado */}
                      <div className="flex items-baseline justify-between pt-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Valor</span>
                          <span className="text-xl font-black text-green-400">
                            {Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        {veiculo.valorfipe && (
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block uppercase tracking-wider">FIPE</span>
                            <span className="text-sm font-bold text-gray-300">
                              {Number(veiculo.valorfipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações: Botão WhatsApp e Botão Compartilhar */}
                  <div className="p-6 pt-0 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`https://wa.me/55${whatsappLoja}?text=${mensagemWp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.124-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        WhatsApp
                      </a>

                      <button
                        onClick={() => handleShareVeiculo(veiculo, nomeLojaExibicao)}
                        className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        title="Compartilhar Anúncio"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684m0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684" />
                        </svg>
                        Compartilhar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}