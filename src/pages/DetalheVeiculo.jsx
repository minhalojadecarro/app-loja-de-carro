import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';

export default function DetalheVeiculo() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
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
          
          // Se houver o slug do lojista no tenant e for diferente do slug atual da URL,
          // redireciona para a vitrine pública do lojista
          const slugLojista = data.tenants?.slug || slug;
          if (slugLojista && slugLojista !== 'veiculo') {
            navigate(`/${slugLojista}`, { replace: true });
          }
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
  }, [id, slug, navigate]);

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
        <Link to="/" className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl text-sm font-bold transition">
          Voltar para a Página Inicial
        </Link>
      </div>
    );
  }

  const fotoPrincipal = veiculo.foto_principal_url || veiculo.foto_capa || 'https://www.minhalojadecarro.com/icon.png';
  const fotosArray = Array.isArray(veiculo.fotos) && veiculo.fotos.length > 0 
    ? veiculo.fotos 
    : [fotoPrincipal];
    
  let fotoCapaOG = fotosArray[fotoAtiva] || fotoPrincipal;
  
  if (fotoCapaOG && fotoCapaOG.startsWith('/')) {
    fotoCapaOG = `${window.location.origin}${fotoCapaOG}`;
  }

  const tituloVeiculo = `${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo || veiculo.ano_fabricacao})`;
  const precoFormatado = Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fipeFormatado = veiculo.valorfipe ? Number(veiculo.valorfipe).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

  // --- FORMATAÇÃO DOS DADOS DE FINANCIAMENTO ---
  const valorEntradaFormatado = veiculo.valor_entrada ? Number(veiculo.valor_entrada).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
  const valorParcelaFormatado = veiculo.valor_parcela ? Number(veiculo.valor_parcela).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

  const nomeLoja = veiculo.tenants?.nome_loja || 'Minha Loja de Carro';
  const whatsappLoja = veiculo.tenants?.whatsapp || '5592991701002';
  
  const linkWhatsapp = `https://wa.me/${whatsappLoja.replace(/\D/g, '')}?text=Olá! Tenho interesse no ${tituloVeiculo} anunciado por ${precoFormatado}.`;

  const tituloMetaOG = `${tituloVeiculo} por ${precoFormatado} | ${nomeLoja}`;
  const descricaoOG = `Ano: ${veiculo.ano_modelo || veiculo.ano_fabricacao} | Câmbio: ${veiculo.cambio || 'Automático'} | KM: ${veiculo.quilometragem ? Number(veiculo.quilometragem).toLocaleString('pt-BR') : '0'} km`;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Helmet>
        <title>{tituloVeiculo} | {nomeLoja}</title>
        <meta name="description" content={descricaoOG} />
        <meta property="og:title" content={tituloMetaOG} />
        <meta property="og:description" content={descricaoOG} />
        <meta property="og:image" content={fotoCapaOG} />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={tituloMetaOG} />
        <meta name="twitter:description" content={descricaoOG} />
        <meta name="twitter:image" content={fotoCapaOG} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-6 py-10 flex-1 w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link to={`/${veiculo.tenants?.slug || ''}`} className="text-sm text-gray-400 hover:text-white transition flex items-center gap-2">
            ← Voltar para a Vitrine da Loja
          </Link>
          <span className="text-xs uppercase tracking-wider font-extrabold bg-blue-950 text-blue-400 border border-blue-800 px-3 py-1 rounded-full">
            {nomeLoja}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">{tituloVeiculo}</h1>
              
              <div className="flex flex-wrap items-center gap-6 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-xs text-gray-400 block mb-1 font-medium">Valor à Vista</span>
                  <p className="text-3xl font-black text-green-400">{precoFormatado}</p>
                </div>
                {fipeFormatado && (
                  <div className="border-l border-slate-800 pl-6">
                    <span className="text-xs text-gray-400 block mb-1 font-medium">Tabela FIPE</span>
                    <p className="text-xl font-bold text-gray-300">{fipeFormatado}</p>
                  </div>
                )}
              </div>

              {/* --- BLOCO DE OPÇÕES DE FINANCIAMENTO --- */}
              {veiculo.tipo_financiamento && veiculo.tipo_financiamento !== 'nenhum' && valorEntradaFormatado && valorParcelaFormatado && (
                <div className="mb-6 bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-900/50 p-4 rounded-2xl shadow-inner">
                  {veiculo.tipo_financiamento === 'bancario' ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🏦</span>
                        <strong className="text-xs uppercase tracking-wider text-blue-400 font-bold">Simulação de Financiamento Bancário</strong>
                      </div>
                      <p className="text-sm text-gray-200 font-medium">
                        Entrada de <span className="text-white font-bold">{valorEntradaFormatado}</span> + <span className="text-blue-400 font-bold">{veiculo.num_parcelas || 48}x</span> de <span className="text-green-400 font-bold">{valorParcelaFormatado}</span>
                      </p>
                      <span className="block text-[11px] text-amber-400/90 mt-1 italic">
                        *Aprovação sujeita a análise de crédito junto ao banco parceiro.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">🔥</span>
                        <strong className="text-xs uppercase tracking-wider text-amber-400 font-bold">Financiamento Próprio da Loja</strong>
                      </div>
                      <p className="text-sm text-gray-200 font-medium">
                        Entrada de <span className="text-white font-bold">{valorEntradaFormatado}</span> + <span className="text-amber-400 font-bold">{veiculo.num_parcelas || 48}x</span> de <span className="text-green-400 font-bold">{valorParcelaFormatado}</span>
                      </p>
                      <span className="block text-[11px] text-emerald-400 font-bold mt-1">
                        *Facilidade na aprovação: **Não consulta SPC / Serasa**!
                      </span>
                    </div>
                  )}
                </div>
              )}

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