import React from 'react';

export default function Planos({ tenant, session, onSelectPlan, onNavigateRegister }) {
  // Identifica o plano atual do lojista logado
  const statusAssinatura = String(tenant?.subscription_status || '').toLowerCase();
  const planoAtual = String(tenant?.plano || '').toLowerCase();
  
  // Verifica se o usuário está em Trial/Teste Grátis
  const isTrial = statusAssinatura === 'trial' || planoAtual === 'trial' || planoAtual === 'gratis';
  const isMensal = planoAtual === 'mensal';
  const isAnual = planoAtual === 'anual';

  const lidarComCliquePlano = (tipoPlano) => {
    // Se não estiver logado, redireciona para o cadastro
    if (!session) {
      if (tipoPlano) sessionStorage.setItem('plano_selecionado', tipoPlano);
      if (typeof onNavigateRegister === 'function') {
        onNavigateRegister(tipoPlano);
      } else {
        window.location.href = '/#/login';
      }
      return;
    }

    // Se estiver logado e for o próprio plano atual, não faz nada
    if ((tipoPlano === 'trial' && isTrial) || (tipoPlano === 'mensal' && isMensal) || (tipoPlano === 'anual' && isAnual)) {
      return;
    }

    // Se for upgrade de lojista logado, direciona para o WhatsApp de Atendimento/Financeiro
    const whatsappAdmin = '5592991701002';
    const nomeLoja = tenant?.nome_loja || tenant?.nome || 'Minha Loja';
    const emailUser = session?.user?.email || '';

    let mensagem = `Olá! Sou da loja *${nomeLoja}* (${emailUser}) e gostaria de fazer o *UPGRADE* para o *Plano ${tipoPlano.toUpperCase()}* da plataforma Minha Loja de Carro.`;
    
    window.open(`https://wa.me/${whatsappAdmin}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Cabeçalho */}
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <div className="inline-block bg-blue-950 border border-blue-800/60 px-3 py-1 rounded-full text-xs font-semibold text-blue-400 uppercase tracking-wider">
          Planos e Assinatura
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">
          {session ? 'Gerencie ou ' : 'Evolua sua vitrine e '}
          <span className="text-blue-500">{session ? 'faça Upgrade do seu Plano' : 'venda muito mais'}</span>
        </h2>
        <p className="text-gray-400 text-sm">
          {session 
            ? 'Acompanhe seu plano ativo e solicite o upgrade para liberar recursos e continuar vendendo sem interrupções.'
            : 'Comece totalmente grátis por 30 dias ou escolha o plano ideal para gerenciar seus veículos.'
          }
        </p>
      </div>

      {/* Grade de 3 Opções */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        
        {/* 1. Teste Gratuito (30 Dias) */}
        <div className={`bg-gradient-to-b from-blue-900/30 to-gray-900 border ${isTrial ? 'border-2 border-green-500 shadow-green-900/20' : 'border-blue-500/40'} rounded-3xl p-8 shadow-xl flex flex-col justify-between relative`}>
          {isTrial && (
            <div className="absolute -top-3.5 left-8 bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
              ✓ Seu Plano Atual
            </div>
          )}
          {!isTrial && (
            <div className="absolute -top-3.5 left-8 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
              ✦ Comece Grátis
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-blue-400">Teste Gratuito</span>
              <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800 px-2.5 py-1 rounded-lg">30 Dias</span>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-black text-white">R$ 0</span>
              <span className="text-gray-400 text-sm"> / 30 dias</span>
            </div>

            <p className="text-xs text-gray-400 mb-6 pb-6 border-b border-gray-800">
              Perfeito para experimentar todas as ferramentas sem compromisso e sem precisar cadastrar cartão de crédito.
            </p>

            <ul className="space-y-3.5 text-sm text-gray-300 mb-8">
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Acesso completo por 30 dias</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Cadastro de até 05 veículos</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Vitrine digital personalizada</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Botão de WhatsApp para clientes</li>
            </ul>
          </div>

          <button
            onClick={() => lidarComCliquePlano('trial')}
            disabled={session && isTrial}
            className={`w-full text-center font-bold py-3.5 rounded-xl transition shadow-lg ${
              session && isTrial 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 cursor-pointer'
            }`}
          >
            {session ? (isTrial ? 'Plano Ativo' : 'Teste Encerrado') : 'Ativar 30 Dias Grátis'}
          </button>
        </div>

        {/* 2. Plano Mensal */}
        <div className={`bg-gray-900 border ${isMensal ? 'border-2 border-green-500 shadow-green-900/20' : 'border-gray-800 hover:border-gray-700'} rounded-3xl p-8 shadow-xl flex flex-col justify-between relative transition`}>
          {isMensal && (
            <div className="absolute -top-3.5 left-8 bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
              ✓ Seu Plano Atual
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-gray-400">Plano Mensal</span>
              <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-lg">Flexível</span>
            </div>
            
            <div className="mb-6">
              <span className="text-4xl font-black text-white">R$ 49,90</span>
              <span className="text-gray-400 text-sm"> / mês</span>
            </div>

            <p className="text-xs text-gray-400 mb-6 pb-6 border-b border-gray-800">
              Ideal para quem quer liberdade mês a mês, sem compromisso de longo prazo. Cancele quando quiser.
            </p>

            <ul className="space-y-3.5 text-sm text-gray-300 mb-8">
              <li className="flex items-center gap-2.5"><span className="text-blue-500 font-bold">✓</span> Gestão de estoque sem limites</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-500 font-bold">✓</span> Vitrine digital personalizada</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-500 font-bold">✓</span> Botão de WhatsApp direto</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-500 font-bold">✓</span> Suporte técnico especializado</li>
            </ul>
          </div>

          <button
            onClick={() => lidarComCliquePlano('mensal')}
            disabled={session && isMensal}
            className={`w-full text-center font-bold py-3.5 rounded-xl transition shadow ${
              session && isMensal
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 cursor-pointer'
            }`}
          >
            {session ? (isMensal ? 'Plano Ativo' : '🚀 Fazer Upgrade (Mensal)') : 'Assinar Plano Mensal'}
          </button>
        </div>

        {/* 3. Plano Anual */}
        <div className={`bg-gradient-to-b from-blue-950/40 to-gray-900 border-2 ${isAnual ? 'border-green-500 shadow-green-900/20' : 'border-blue-600'} rounded-3xl p-8 shadow-2xl flex flex-col justify-between relative`}>
          {isAnual ? (
            <div className="absolute -top-3.5 left-8 bg-green-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
              ✓ Seu Plano Atual
            </div>
          ) : (
            <div className="absolute -top-3.5 right-8 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
              ★ Mais Popular (2 Meses Grátis)
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-blue-400">Plano Anual</span>
              <span className="text-xs bg-blue-900/60 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-lg">Melhor Custo-Benefício</span>
            </div>
            
            <div className="mb-2">
              <span className="text-4xl font-black text-white">R$ 499,00</span>
              <span className="text-gray-400 text-sm"> / ano</span>
            </div>
            <p className="text-xs text-green-400 font-semibold mb-6">Equivale a R$ 41,58/mês (Economia garantida)</p>

            <p className="text-xs text-gray-400 mb-6 pb-6 border-b border-gray-800">
              Para lojistas visionários que querem desconto máximo e prioridade no suporte o ano todo.
            </p>

            <ul className="space-y-3.5 text-sm text-gray-300 mb-8">
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Todos os benefícios do plano mensal</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> 2 meses completamente gratuitos</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Selo de Loja Destaque na plataforma</li>
              <li className="flex items-center gap-2.5"><span className="text-blue-400 font-bold">✓</span> Garantia de preço fixo por 12 meses</li>
            </ul>
          </div>

          <button
            onClick={() => lidarComCliquePlano('anual')}
            disabled={session && isAnual}
            className={`w-full text-center font-bold py-3.5 rounded-xl transition shadow-xl ${
              session && isAnual
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40 cursor-pointer'
            }`}
          >
            {session ? (isAnual ? 'Plano Ativo' : '⭐ Fazer Upgrade (Anual)') : 'Aproveitar Plano Anual'}
          </button>
        </div>

      </div>

      <div className="mt-12 text-center text-xs text-gray-500">
        Dúvidas sobre formas de pagamento? Nossa equipe de atendimento está pronta para ajudar.
      </div>
    </div>
  );
}