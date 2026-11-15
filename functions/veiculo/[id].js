export async function onRequest(context) {
  const { request, env, params } = context;
  const vehicleId = params.id;

  const userAgent = request.headers.get("user-agent") || "";
  const isCrawler = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|TelegramBot|Applebot|Discordbot/i.test(userAgent);

  // Se for um usuário normal, deixa o Cloudflare entregar o SPA React normalmente
  if (!isCrawler) {
    return context.env.ASSETS.fetch(request);
  }

  try {
    const supabaseUrl = "https://motyshnlombyzidqhjgk.supabase.co";
    const supabaseKey = "sb_publishable_vV__tTFP7ULOrXqXWMuFjg__CidXYUm";

    const response = await fetch(`${supabaseUrl}/rest/v1/veiculos?id=eq.${vehicleId}&select=marca,modelo,ano_modelo,preco,foto_principal_url,tenants(nome_loja)`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });

    const data = await response.json();
    const veiculo = data && data.length > 0 ? data[0] : null;

    if (!veiculo) {
      return context.env.ASSETS.fetch(request);
    }

    const nomeLoja = veiculo.tenants?.nome_loja || "Minha Loja de Carro";
    const titulo = `${veiculo.marca} ${veiculo.modelo} (${veiculo.ano_modelo}) - R$ ${Number(veiculo.preco).toLocaleString('pt-BR')}`;
    const descricao = `Disponível na ${nomeLoja}. Veja mais detalhes, fotos e entre em contato!`;
    const imagem = veiculo.foto_principal_url || "https://www.minhalojadecarro.com/favicon.svg";
    const urlAtual = request.url;

    const htmlResponse = `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>${titulo} | ${nomeLoja}</title>
        <meta property="og:title" content="${titulo} | ${nomeLoja}" />
        <meta property="og:description" content="${descricao}" />
        <meta property="og:image" content="${imagem}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="${urlAtual}" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${titulo}" />
        <meta name="twitter:description" content="${descricao}" />
        <meta name="twitter:image" content="${imagem}" />
    </head>
    <body>
        <script>window.location.href = "/veiculo/${vehicleId}";</script>
    </body>
    </html>`;

    return new Response(htmlResponse, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    });

  } catch (err) {
    return context.env.ASSETS.fetch(request);
  }
}