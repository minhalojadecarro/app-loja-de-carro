import React from 'react';

export default function Sobre({ onNavigatePlanos }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12 font-sans text-white">
      {/* Cabeçalho */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-block bg-blue-950 border border-blue-800/60 px-3 py-1 rounded-full text-xs font-semibold text-blue-400 uppercase tracking-wider">
          Sobre a Plataforma
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight">
          A ferramenta definitiva para impulsionar sua <span className="text-blue-500">Revenda de Veículos</span>
        </h1>
        <p className="text-gray-200 text-base leading-relaxed">
          O <strong>Minha Loja de Carro</strong> nasceu para simplificar a gestão de estoques de seminovos e conectar lojistas diretamente aos compradores através de uma vitrine digital moderna, rápida e integrada ao WhatsApp.
        </p>
      </div>

      {/* Grid de Benefícios / Pilares */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-xl">
            ⚡
          </div>
          <h3 className="text-lg font-bold text-white">Gestão Ágil de Estoque</h3>
          <p className="text-sm text-gray-200 leading-relaxed font-normal">
            Cadastre veículos, organize fotos, especifique marcas, anos, preços e status de forma intuitiva, sem planilhas complexas.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-xl">
            🌐
          </div>
          <h3 className="text-lg font-bold text-white">Vitrine Digital Exclusiva</h3>
          <p className="text-sm text-gray-200 leading-relaxed font-normal">
            Sua loja ganha um link exclusivo na internet (ex: <em className="text-blue-300 not-italic font-semibold">minhalojadecarro/sualoja</em>) para divulgar o estoque completo para o Brasil inteiro.
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 font-bold text-xl">
            💬
          </div>
          <h3 className="text-lg font-bold text-white">Negociação Direta no WhatsApp</h3>
          <p className="text-sm text-gray-200 leading-relaxed font-normal">
            Sem intermediários ou comissões escondidas. O cliente clica no carro e fala direto com o vendedor da sua loja pelo WhatsApp.
          </p>
        </div>
      </div>

      {/* Bloco de Chamada para Ação (CTA) para os Planos */}
      <div className="bg-gradient-to-r from-blue-950/60 via-gray-900 to-blue-950/60 border border-blue-800/50 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-white">Pronto para transformar suas vendas?</h2>
          <p className="text-gray-200 text-sm font-medium">
            Aproveite nossos planos sob medida com excelente custo-benefício e comece hoje mesmo a escalar sua revenda.
          </p>
          <div className="pt-4">
            <button
              onClick={onNavigatePlanos}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-blue-900/50 transition transform hover:-translate-y-0.5 text-base tracking-wide"
            >
              VER PLANOS DE ASSINATURA &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}