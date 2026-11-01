import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';

export default function VitrinePublicaSlug({ session }) {
  const { slug } = useParams();
  
  const [tenant, setTenant] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [copiadoVeiculoId, setCopiadoVeiculoId] = useState(null);

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

  // Função de Compartilhamento Inteligente da Loja Inteira
  const handleCompartilharLoja = () => {
    const urlAtual = window.location.href;
    const nomeLoja = tenant?.nome || tenant?.name || tenant?.nome_loja || 'nossa loja';

    const isDonoDaLoja = session?.user?.id && tenant?.user_id && session.user.id === tenant.user_id;

    const textoMensagem = isDonoDaLoja
      ? `🚗 Confira o estoque atualizado da ${nomeLoja}! Temos ofertas incríveis esperando por você: ${urlAtual}`
      : `🔥 Olha essa oportunidade de carro que achei por aqui na ${nomeLoja}, dá uma olhada na vitrine: ${urlAtual}`;

    if (navigator.share) {
      navigator.share({
        title: nomeLoja,
        text: textoMensagem,
        url: urlAtual,
      }).catch(() => {});
    } else {
      const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoMensagem)}`;
      window.open(urlWhatsApp, '_blank');
      
      navigator.clipboard.writeText(urlAtual);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  // Função de Compartilhamento Inteligente de um Veículo Específico
  const handleCompartilharVeiculo = (veiculo) => {
    const urlAtual = window.location.href;
    const nomeLoja = tenant?.nome || tenant?.name || tenant?.nome_loja || 'nossa loja';
    const precoFormatado = Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const isDonoDaLoja = session?.user?.id && tenant?.user_id && session.user.id === tenant.user_id;

    const textoMensagem = isDonoDaLoja
      ? `🚗 Oportunidade imperdível na ${nomeLoja}!\n\n*${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo || veiculo.ano_fabricacao})* por apenas ${precoFormatado}.\n\nConfira os detalhes na nossa vitrine: ${urlAtual}`
      : `🔥 Olha o carro que achei na ${nomeLoja}!\n\n*${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo || veiculo.ano_fabricacao})* por ${precoFormatado}.\n\nDá uma olhada: ${urlAtual}`;

    if (navigator.share) {
      navigator.share({
        title: `${veiculo.marca} ${veiculo.modelo}`,
        text: textoMensagem,
        url: urlAtual,
      }).catch(() => {});
    } else {
      const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textoMensagem)}`;
      window.open(urlWhatsApp, '_blank');

      navigator.clipboard.writeText(urlAtual);
      setCopiadoVeiculoId(veiculo.id);
      setTimeout(() => setCopiadoVeiculoId(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-700">
        <p className="text-lg animate-pulse font-medium">A carregar vitrine da loja...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-800 p-6 text-center">
        <h1 className="text-3xl font-black mb-2 text-red-600">Loja não encontrada</h1>
        <p className="text-slate-500">A revenda com o endereço "{slug}" não existe ou foi desativada.</p>
      </div>
    );
  }

  // Variáveis para as Tags Open Graph Dinâmicas
  const nomeLojaExibicao = tenant?.nome || tenant?.name || tenant?.nome_loja || 'Minha Loja de Carro';
  const urlAtualCompleta = window.location.href;
  const imagemCapaPadrao = "https://motyshnlombyzidhqhjgk.supabase.co/storage/v1/object/public/veiculos-fotos/1791554491753_tup6bx9wbn.jpg";
  const imagemCapaLoja = tenant?.capa_vitrine_url || imagemCapaPadrao;
  const tituloVitrineMeta = `${nomeLojaExibicao} | Estoque de Veículos`;
  const descricaoVitrineMeta = `Confira o estoque atualizado de carros e motos da revenda ${nomeLojaExibicao}. As melhores ofertas estão aqui!`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-6 md:p-12">
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
        {/* Cabeçalho da Vitrine */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-blue-600 font-bold">Vitrine Autorizada</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-1">{nomeLojaExibicao}</h1>
            <p className="text-slate-500 text-sm mt-2">Confira nosso estoque atualizado de veículos disponíveis.</p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleCompartilharLoja}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
            >
              <span>🔗 Compartilhar Vitrine</span>
            </button>
            {copiado && (
              <span className="text-[11px] font-semibold text-emerald-600 animate-fade-in">
                Link copiado com sucesso!
              </span>
            )}
          </div>
        </div>

        {/* Listagem de Veículos */}
        <h2 className="text-xl font-bold mb-6 text-slate-800">Veículos Exibidos na Vitrine ({veiculos.length})</h2>

        {veiculos.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
            Nenhum veículo disponível no momento para esta loja.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {veiculos.map((veiculo) => {
              const urlAtual = window.location.href;
              const mensagemCarro = encodeURIComponent(
                `Olá! Tenho interesse no veículo *${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo || veiculo.ano_fabricacao})* anunciado por ${Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.\n\nLink do anúncio: ${urlAtual}`
              );

              const emDestaque = veiculo.status_destaque === 'em_evidencia';

              return (
                <div 
                  key={veiculo.id} 
                  className={`bg-white rounded-2xl overflow-hidden transition-all flex flex-col justify-between ${
                    emDestaque 
                      ? 'border-2 border-amber-400 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/20' 
                      : 'border border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="h-48 bg-slate-100 relative">
                      {veiculo.foto_principal_url ? (
                        <img src={veiculo.foto_principal_url} alt={veiculo.modelo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Sem foto</div>
                      )}

                      {emDestaque && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1 border border-yellow-200 z-10">
                          <span>⭐</span> EM DESTAQUE
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded font-medium">
                        {veiculo.ano_modelo || veiculo.ano_fabricacao} {veiculo.combustivel ? `• ${veiculo.combustivel}` : ''}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-3">
                        {veiculo.marca} {veiculo.modelo}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{veiculo.versao}</p>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1">
                        {veiculo.valorfipe > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-medium">Tabela FIPE:</span>
                            <span className="text-slate-600 font-semibold">
                              {Number(veiculo.valorfipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-mono">
                            {veiculo.quilometragem ? `${veiculo.quilometragem.toLocaleString('pt-BR')} km` : ''}
                          </span>
                          <span className="text-xl font-black text-emerald-600">
                            {Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Ações do Veículo */}
                  <div className="p-6 pt-0 flex flex-col gap-2">
                    {tenant.whatsapp ? (
                      <a
                        href={`https://wa.me/55${tenant.whatsapp.replace(/\D/g, '')}?text=${mensagemCarro}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-green-50 hover:bg-green-600 text-green-700 hover:text-white border border-green-200 text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                      >
                        💬 Tenho Interesse (WhatsApp)
                      </a>
                    ) : (
                      <button disabled className="w-full bg-slate-100 text-slate-400 text-xs font-bold py-3 rounded-xl cursor-not-allowed">
                        WhatsApp Indisponível
                      </button>
                    )}

                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleCompartilharVeiculo(veiculo)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>🔗 Compartilhar Veículo</span>
                      </button>
                      {copiadoVeiculoId === veiculo.id && (
                        <span className="text-[10px] font-semibold text-emerald-600 mt-1">
                          Link do veículo copiado!
                        </span>
                      )}
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