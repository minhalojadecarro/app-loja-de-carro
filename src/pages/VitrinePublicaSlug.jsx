import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // 1. Importar o useParams
import { supabase } from '../supabaseClient';

export default function VitrinePublicaSlug() {
  const { slug } = useParams(); // 2. Capturar o slug diretamente da URL (ex: /carrobarato)
  
  const [tenant, setTenant] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ... o restante do código continua exatamente igual abaixo

  useEffect(() => {
    const fetchLojaEValores = async () => {
      setLoading(true);
      
      // Verifica se o parâmetro na URL é um UUID válido
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(slug);

      let tenantData = null;

      if (isUuid) {
        // Se a URL recebeu um ID/UUID, busca diretamente pela coluna 'id' do Supabase
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', slug)
          .maybeSingle();
        
        if (!error) tenantData = data;
      } else {
        // Se recebeu um texto, busca pela coluna 'slug'
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .ilike('slug', slug)
          .maybeSingle();

        if (!error) tenantData = data;
      }

      // Fallback por segurança caso venha nome formatado
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
        .order('destaque_home', { ascending: false })
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho da Vitrine */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 mb-10 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-blue-600 font-bold">Vitrine Autorizada</span>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-1">{tenant.nome || tenant.name || tenant.nome_loja}</h1>
            <p className="text-slate-500 text-sm mt-2">Confira nosso estoque atualizado de veículos disponíveis.</p>
          </div>
          {tenant.whatsapp && (
            <a
              href={`https://wa.me/55${tenant.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi sua vitrine na plataforma e tenho interesse em conversar sobre o estoque.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-green-600/20 flex items-center gap-2"
            >
              Falar no WhatsApp
            </a>
          )}
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

              return (
                <div key={veiculo.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="h-48 bg-slate-100 relative">
                      {veiculo.foto_principal_url ? (
                        <img src={veiculo.foto_principal_url} alt={veiculo.modelo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Sem foto</div>
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

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xl font-black text-emerald-600">
                          {Number(veiculo.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {veiculo.quilometragem ? `${veiculo.quilometragem.toLocaleString('pt-BR')} km` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de WhatsApp Específico para o Veículo */}
                  <div className="p-6 pt-0">
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