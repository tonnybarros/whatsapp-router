export function apiDocsHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp Router API</title>
  <style>
    :root { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #101827; background: #f2f5f8; }
    body { margin: 0; }
    main { max-width: 1080px; margin: 0 auto; padding: 28px 18px 48px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    p { color: #5d6878; line-height: 1.55; }
    section { background: #fff; border: 1px solid #d5dde8; border-radius: 8px; padding: 18px; margin: 14px 0; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    code { background: #eef2f7; border-radius: 6px; padding: 2px 6px; }
    pre { overflow: auto; background: #172033; color: #e7edf6; border-radius: 8px; padding: 14px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border: 1px solid #d5dde8; border-radius: 8px; }
    th, td { border-bottom: 1px solid #e6ebf1; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f7f9fc; font-size: 12px; text-transform: uppercase; color: #344054; }
    tr:last-child td { border-bottom: 0; }
    .badge { display: inline-block; border-radius: 999px; background: #d1fadf; color: #05603a; padding: 4px 9px; font-size: 12px; font-weight: 800; }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>WhatsApp Router API</h1>
        <p>API para n8n, sistemas internos e qualquer aplicação que precise enviar WhatsApp por conectores cadastrados.</p>
      </div>
      <span class="badge">v1</span>
    </header>

    <section>
      <h2>Autenticação</h2>
      <p>Envie uma destas opções em todas as rotas <code>/api/*</code>:</p>
      <pre>X-Router-Key: seu-token</pre>
      <pre>Authorization: Bearer seu-token</pre>
    </section>

    <section>
      <h2>Instalação Recomendada</h2>
      <p>Para VPS ou LXC, o caminho mais simples é rodar com Node.js + PM2 e deixar o HTTPS no Caddy/Nginx. Use Docker Compose quando o servidor já trabalha com containers.</p>
      <table>
        <thead><tr><th>Cenário</th><th>Melhor caminho</th></tr></thead>
        <tbody>
          <tr><td>VPS/LXC dedicado</td><td>Node.js + PM2</td></tr>
          <tr><td>Servidor com vários containers</td><td>Docker Compose</td></tr>
          <tr><td>Desenvolvimento local</td><td><code>npm run dev</code></td></tr>
          <tr><td>Produção com HTTPS</td><td>Router na porta <code>3025</code> + proxy reverso em <code>443</code></td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Instalar Sem Docker</h2>
      <pre>cd /var/www
git clone https://github.com/tonnybarros/whatsapp-router.git
cd whatsapp-router
npm ci
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
nano .env
npm run check
pm2 start ecosystem.config.cjs
pm2 save</pre>
      <p>No <code>.env</code>, defina <code>ROUTER_API_KEY</code> com o token gerado. Esse é o token usado por n8n, Whazap e outros sistemas no header <code>X-Router-Key</code>.</p>
      <pre>PORT=3025
HOST=0.0.0.0
ROUTER_API_KEY=troque-por-um-token-forte
DATA_FILE=./data/router.json</pre>
    </section>

    <section>
      <h2>Instalar Com Docker Compose</h2>
      <pre>git clone https://github.com/tonnybarros/whatsapp-router.git
cd whatsapp-router
cp .env.example .env
openssl rand -hex 32
nano .env
docker compose up -d --build
docker compose logs -f whatsapp-router</pre>
      <p>No Docker, os dados ficam persistidos em <code>./data/router.json</code>. Faça backup desse arquivo e do <code>.env</code>.</p>
    </section>

    <section>
      <h2>Proxy HTTPS</h2>
      <p>O Router não precisa abrir a porta <code>443</code>. Deixe o serviço na porta <code>3025</code> e publique com Caddy ou Nginx.</p>
      <pre>api.seudominio.com.br {
  reverse_proxy 127.0.0.1:3025
}</pre>
      <p>Depois de publicar, acesse <code>/admin</code>, entre com o <code>ROUTER_API_KEY</code>, cadastre os conectores e teste com <code>dry_run</code> antes do envio real.</p>
    </section>

    <section>
      <h2>Proxy de Saída por Conector</h2>
      <p>Cada conector pode usar um proxy HTTP/HTTPS próprio para as chamadas do Router até a API cadastrada. Isso afeta envio, health check e consultas auxiliares feitas pelo Router.</p>
      <pre>{
  "name": "waha-vendas-01",
  "provider": "waha",
  "base_url": "https://waha.seudominio.com",
  "api_key": "token-da-api",
  "proxy_enabled": true,
  "proxy_url": "http://usuario:senha@proxy.seudominio.com:3128"
}</pre>
      <p>Credenciais de proxy não são exibidas na listagem pública. Para remover o proxy de um conector, desative <code>proxy_enabled</code> no admin e salve.</p>
    </section>

    <section>
      <h2>Atualizar e Backup</h2>
      <pre>git pull
npm ci
npm run check
pm2 restart whatsapp-router --update-env</pre>
      <p>Arquivos que devem ser protegidos e nunca publicados: <code>.env</code> e <code>data/router.json</code>.</p>
      <pre>tar -czf whatsapp-router-backup-$(date +%F).tar.gz .env data/router.json</pre>
    </section>

    <section>
      <h2>Endpoints Para Automação</h2>
      <table>
        <thead><tr><th>Método</th><th>Rota</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td><code>POST</code></td><td><code>/api/v1/messages/send</code></td><td>Enviar mensagem pelo seletor ou por um conector específico.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/v1/send</code></td><td>Alias curto do envio.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/v1/whatsapp/send</code></td><td>Alias descritivo para WhatsApp.</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/v1/connectors</code></td><td>Listar conectores disponíveis.</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/v1/messages?limit=50</code></td><td>Consultar histórico recente.</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/v1/health</code></td><td>Status resumido do router.</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Payload de Envio</h2>
      <pre>{
  "to": "5599999999999",
  "message": "Mensagem enviada pelo n8n",
  "source": "n8n",
  "queue": true,
  "failover": true,
  "fallback_allowed": true,
  "failover_mode": "safe",
  "dry_run": false,
  "connector_id": "opcional-id-do-conector",
  "external_id": "pedido-123"
}</pre>
      <p><code>message</code> também pode ser enviado como <code>text</code>. Se <code>connector_id</code> não for informado, o router escolhe automaticamente a instância elegível mais antiga.</p>
    </section>

    <section>
      <h2>Campos do JSON de Envio</h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obrigatório</th><th>Função</th></tr></thead>
        <tbody>
          <tr><td><code>to</code></td><td><code>string</code></td><td>Sim</td><td>Destino no formato DDI + DDD + número. Exemplo: <code>5511999999999</code>.</td></tr>
          <tr><td><code>message</code></td><td><code>string</code></td><td>Sim*</td><td>Texto que será enviado.</td></tr>
          <tr><td><code>text</code></td><td><code>string</code></td><td>Sim*</td><td>Alias de <code>message</code>. Use um ou outro.</td></tr>
          <tr><td><code>source</code></td><td><code>string</code></td><td>Não</td><td>Origem exibida no painel. Exemplo: <code>n8n</code>, <code>whazap</code>, <code>financeiro</code>.</td></tr>
          <tr><td><code>queue</code></td><td><code>boolean</code></td><td>Não</td><td>Quando <code>true</code>, coloca na fila e responde <code>202</code>. Recomendado para lotes.</td></tr>
          <tr><td><code>dry_run</code></td><td><code>boolean</code></td><td>Não</td><td>Testa seleção/roteamento sem envio real.</td></tr>
          <tr><td><code>connector_id</code></td><td><code>string</code></td><td>Não</td><td>Força um conector específico. Se vazio, o Router escolhe automaticamente.</td></tr>
          <tr><td><code>instance_id</code></td><td><code>string</code></td><td>Não</td><td>Alias legado de <code>connector_id</code>.</td></tr>
          <tr><td><code>fallback_allowed</code></td><td><code>boolean</code></td><td>Não</td><td>Permite trocar de conector se o preferido estiver inelegível.</td></tr>
          <tr><td><code>failover</code></td><td><code>boolean</code></td><td>Não</td><td>Permite tentar outro conector quando uma tentativa falha de forma segura.</td></tr>
          <tr><td><code>failover_mode</code></td><td><code>string</code></td><td>Não</td><td><code>safe</code> evita duplicidade. <code>aggressive</code> também retenta 5xx, com risco de duplicar.</td></tr>
          <tr><td><code>external_id</code></td><td><code>string</code></td><td>Não</td><td>ID externo para rastrear pedido, usuário ou execução do n8n.</td></tr>
          <tr><td><code>track_id</code></td><td><code>string</code></td><td>Não</td><td>Alias legado de <code>external_id</code>.</td></tr>
          <tr><td><code>priority</code></td><td><code>string</code></td><td>Não</td><td>Campo informativo para futuras regras de prioridade.</td></tr>
          <tr><td><code>delay</code></td><td><code>number</code></td><td>Não</td><td>Enviado ao provider quando ele suporta atraso interno.</td></tr>
          <tr><td><code>linkPreview</code></td><td><code>boolean</code></td><td>Não</td><td>Controla preview de links nos providers que suportam essa opção.</td></tr>
        </tbody>
      </table>
      <p>*Envie <code>message</code> ou <code>text</code>.</p>
    </section>

    <section>
      <h2>Campos da Resposta</h2>
      <table>
        <thead><tr><th>Campo</th><th>Função</th></tr></thead>
        <tbody>
          <tr><td><code>id</code></td><td>ID interno da mensagem no Router.</td></tr>
          <tr><td><code>external_id</code></td><td>ID enviado pela sua aplicação para rastrear a mensagem fora do Router.</td></tr>
          <tr><td><code>to</code></td><td>Destino solicitado.</td></tr>
          <tr><td><code>message</code></td><td>Texto solicitado.</td></tr>
          <tr><td><code>source</code></td><td>Origem registrada.</td></tr>
          <tr><td><code>priority</code></td><td>Prioridade informada ou <code>normal</code>.</td></tr>
          <tr><td><code>status</code></td><td>Estado atual: <code>queued</code>, <code>processing</code>, <code>selected</code>, <code>sent</code>, <code>dry_run</code> ou <code>failed</code>.</td></tr>
          <tr><td><code>requested_connector_id</code></td><td>Conector solicitado no payload, quando informado.</td></tr>
          <tr><td><code>selected_instance_id</code></td><td>Conector realmente escolhido para a tentativa atual/final.</td></tr>
          <tr><td><code>provider</code></td><td>API usada: <code>uazapi</code>, <code>waha</code>, <code>evolution_go</code> ou <code>evolution_api</code>.</td></tr>
          <tr><td><code>dry_run</code></td><td>Indica teste sem envio real.</td></tr>
          <tr><td><code>queued</code></td><td>Indica que a mensagem entrou pela fila.</td></tr>
          <tr><td><code>fallback_allowed</code></td><td>Mostra se a chamada permitia trocar de conector.</td></tr>
          <tr><td><code>failover</code></td><td>Mostra se a chamada permitia retentativa em outro conector.</td></tr>
          <tr><td><code>failover_mode</code></td><td>Modo de failover usado: <code>safe</code> ou <code>aggressive</code>.</td></tr>
          <tr><td><code>attempts</code></td><td>Lista de tentativas com conector, API, status, horário e erro quando houver.</td></tr>
          <tr><td><code>provider_response</code></td><td>Resposta bruta do provider em caso de sucesso, com dados sensíveis mascarados.</td></tr>
          <tr><td><code>error</code></td><td>Detalhes da falha quando não envia ou não há conector elegível.</td></tr>
          <tr><td><code>created_at</code></td><td>Data/hora UTC de criação.</td></tr>
          <tr><td><code>updated_at</code></td><td>Data/hora UTC da última atualização, quando houver.</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Exemplo cURL</h2>
      <pre>curl -X POST https://api.tectonny.com.br/api/v1/messages/send \\
  -H 'Content-Type: application/json' \\
  -H 'X-Router-Key: SEU_TOKEN' \\
  -d '{
    "to": "5599999999999",
    "message": "Teste via API",
    "source": "curl",
    "dry_run": true
  }'</pre>
    </section>

    <section>
      <h2>n8n HTTP Request</h2>
      <table>
        <tbody>
          <tr><th>Method</th><td><code>POST</code></td></tr>
          <tr><th>URL</th><td><code>https://api.tectonny.com.br/api/v1/messages/send</code></td></tr>
          <tr><th>Headers</th><td><code>X-Router-Key</code>: seu token<br><code>Content-Type</code>: <code>application/json</code></td></tr>
          <tr><th>Body Content Type</th><td><code>JSON</code></td></tr>
          <tr><th>Body</th><td><code>{"to":"{{$json.phone}}","message":"{{$json.message}}","source":"n8n","queue":true,"failover":true,"fallback_allowed":true,"failover_mode":"safe"}</code></td></tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}
