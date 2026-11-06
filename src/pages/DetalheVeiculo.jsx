import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';

export default function DetalheVeiculo() {
  const { slug, id } = useParams();
  const [veiculo, setVeiculo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fotoAtiva, setFotoAtiva] = useState(0);

  useEffect(() => {
    const fetchVeiculoDetalhe = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('veiculos')
          .select('*, tenants(nome_loja, logo_url, whatsapp, slug)')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          setVeiculo(data);
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes do veículo:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVeiculoDetalhe();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <p className="text-lg animate-pulse">Carregando detalhes do veículo...</p>
      </div>
    );
  }

  if (!veiculo) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-xl font-bold">Veículo não encontrado ou anúncio removido.</p>
        <Link to={`/${slug}`} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl text-sm font-bold transition">
          Voltar para a Loja
        </Link>
      </div>
    );
  }

  // Tratamento limpo e unificado das fotos priorizando a coluna correta do Supabase
  const fotoPrincipal = veiculo.foto_principal_url || veiculo.foto_capa || 'https://via.placeholder.com/800';
  const fotosArray = Array.isArray(veiculo.fotos) && veiculo.fotos.length > 0 
    ? veiculo.fotos 
    : [fotoPrincipal];
    
  const fotoCapaOG = fotosArray[fotoAtiva] || fotoPrincipal;

  const tituloVeiculo = `${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo || veiculo.ano_fabricacao})`;
  const precoFormatado = Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fipeFormatado = veiculo.valorfipe ? Number(veiculo.valorfipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

  const nomeLoja = veiculo.tenants?.nome_loja || 'Minha Loja de Carro';
  const whatsappLoja = veiculo.tenants?.whatsapp || '5592991701002';
  
  const linkWhatsapp = `https://wa.me/${whatsappLoja.replace(/\D/g, '')}?text=Olá! Tenho interesse no ${tituloVeiculo} anunciado por ${precoFormatado}.`;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* INJEÇÃO DINÂMICA DE METADADOS OPEN GRAPH PARA O WHATSAPP / FACEBOOK */}
      <Helmet>
        <title>{tituloVeiculo} | {nomeLoja}</title>
        <meta property="og:title" content={`${tituloVeiculo} - ${precoFormatado}`} />
        <meta property="og:description" content={`Ano: ${veiculo.ano_modelo || veiculo.ano_fabricacao} • Câmbio: ${veiculo.cambio || 'Automático'} • KM: ${veiculo.km || 0} • ${nomeLoja}`} />
        <meta property="og:image" content={fotoCapaOG} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={fotoCapaOG} />
      </Helmet>

      {/* Conteúdo da Página do Veículo */}
      <div className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link to={`/${slug}`} className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2">
            ← Voltar para a Vitrine da Loja
          </Link>
          <span className="text-xs uppercase tracking-wider font-extrabold bg-blue-950 text-blue-400 border border-blue-800 px-3 py-1 rounded-full">
            {nomeLoja}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Galeria de Fotos */}
          <div className="space-y-4">
            <div className="h-[350px] sm:h-[420px] rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl">
              <img src={fotosArray[fotoAtiva] || fotoPrincipal} alt={tituloVeiculo} className="w-full h-full object-cover" />
            </div>
            {fotosArray.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {fotosArray.map((foto, index) => (
                  <button
                    key={index}
                    onClick={() => setFotoAtiva(index)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition shrink-0 ${fotoAtiva === index ? 'border-blue-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={foto} alt="Miniatura" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações e Ações */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">{tituloVeiculo}</h1>
              
              {/* Preço e Tabela FIPE lado a lado */}
              <div className="flex flex-wrap items-center gap-6 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs text-gray-400 block mb-1 font-medium">Valor</span>
                  <p className="text-3xl font-black text-green-400">{precoFormatado}</p>
                </div>
                {fipeFormatado && (
                  <div className="border-l border-slate-800 pl-6">
                    <span className="text-xs text-gray-400 block mb-1 font-medium">Tabela FIPE</span>
                    <p className="text-xl font-bold text-gray-300">{fipeFormatado}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 text-sm">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-gray-400 block text-xs">Ano</span>
                  <strong className="text-white text-base">{veiculo.ano_modelo || veiculo.ano_fabricacao}</strong>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-gray-400 block text-xs">Quilometragem</span>
                  <strong className="text-white text-base">
                    {veiculo.quilometragem ? `${Number(veiculo.quilometragem).toLocaleString('pt-BR')} km` : '0 km'}
                  </strong>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-gray-400 block text-xs">Câmbio</span>
                  <strong className="text-white text-base">{veiculo.cambio || 'Não informado'}</strong>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-gray-400 block text-xs">Combustível</span>
                  <strong className="text-white text-base">{veiculo.combustivel || 'Flex'}</strong>
                </div>
              </div>

              {veiculo.observacoes && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Observações do Vendedor</h3>
                  <p className="text-sm text-gray-300 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                    {veiculo.observacoes}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-green-900/30 text-center"
              >
                <span>💬</span> Falar com Vendedor no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}