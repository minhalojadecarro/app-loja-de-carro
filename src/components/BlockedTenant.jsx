import Planos from './Planos';

export default function BlockedTenant({ tenant, onLogout }) {
  const nomeLoja = tenant?.nome || tenant?.name || 'Sua Revenda';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Topo com botão de Sair */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white font-black px-3.5 py-2 rounded-xl tracking-wider text-sm shadow-lg">
            MINHA LOJA DE CARRO
          </div>
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow"
        >
          Sair da Conta
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Alerta de Bloqueio / Fim de Trial */}
        <div className="max-w-2xl w-full bg-gray-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center mb-12">
          <div className="inline-block bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
            Período de Testes Encerrado (30 Dias)
          </div>
          
          <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
            O acesso da revenda <span className="text-red-400">{nomeLoja}</span> foi suspenso.
          </h1>
          
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            O seu período de degustação gratuita de 30 dias chegou ao fim. Para reativar imediatamente o seu estoque de veículos, o link exclusivo da sua vitrine digital e continuar fechando negócios, escolha um dos planos abaixo.
          </p>
        </div>

        {/* Exibição dos Planos para Regularização */}
        <div className="w-full">
          <Planos tenant={tenant} />
        </div>
      </main>
    </div>
  );
}