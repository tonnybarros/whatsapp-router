export function apiDocsHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp Router V3 API</title>
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
        <p>V3 multiusuário para n8n, sistemas internos e automações WhatsApp com workspaces isolados.</p>
      </div>
      <span class="badge">v3</span>
    </header>

    <section>
      <h2>Autenticação</h2>
      <p>Cada workspace tem sua própria API key. Use essa chave nas rotas <code>/api/*</code>:</p>
      <pre>X-Router-Key: whr_chave_do_workspace</pre>
      <pre>Authorization: Bearer whr_chave_do_workspace</pre>
      <p>O painel <code>/admin</code> usa a chave <code>ADMIN_KEY</code> do <code>.env</code>.</p>
    </section>

    <section>
      <h2>Cadastro via Código WhatsApp</h2>
      <p>Configure no admin a URL webhook do n8n que enviará o código para o usuário. A página pública de cadastro fica em <code>/cadastro</code>.</p>
      <table>
        <thead><tr><th>Método</th><th>Rota</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td><code>GET</code></td><td><code>/cadastro</code></td><td>Página pública para o usuário pedir e validar o código.</td></tr>
          <tr><td><code>GET</code></td><td><code>/painel</code></td><td>Painel do usuário/workspace com conectores, mensagens e teste de envio.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/auth/request-code</code></td><td>Gera código e envia para o webhook n8n configurado.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/auth/verify-code</code></td><td>Valida código, cria usuário, workspace e API key.</td></tr>
        </tbody>
      </table>
      <pre>curl -X POST https://multiapi.tectonny.com.br/api/auth/request-code \\
  -H 'Content-Type: application/json' \\
  -d '{"phone":"5511999999999","name":"Cliente"}'</pre>
      <pre>curl -X POST https://multiapi.tectonny.com.br/api/auth/verify-code \\
  -H 'Content-Type: application/json' \\
  -d '{"phone":"5511999999999","code":"123456","name":"Cliente","workspace_name":"Empresa"}'</pre>
    </section>

    <section>
      <h2>Webhook n8n do Código</h2>
      <p>O n8n recebe este payload quando alguém pede cadastro:</p>
      <pre>{
  "phone": "5511999999999",
  "code": "123456",
  "name": "Cliente",
  "message": "Seu codigo do WhatsApp Router e 123456. Ele expira em 10 minutos.",
  "source": "whatsapp-router-v3"
}</pre>
      <p>No n8n, use seu envio WhatsApp preferido para mandar <code>message</code> para <code>phone</code>.</p>
    </section>

    <section>
      <h2>Envio pelo n8n</h2>
      <table>
        <tbody>
          <tr><th>Method</th><td><code>POST</code></td></tr>
          <tr><th>URL</th><td><code>https://multiapi.tectonny.com.br/api/send</code></td></tr>
          <tr><th>Headers</th><td><code>X-Router-Key</code>: API key do workspace<br><code>Content-Type</code>: <code>application/json</code></td></tr>
          <tr><th>Body Content Type</th><td><code>JSON</code></td></tr>
        </tbody>
      </table>
      <pre>{
  "to": "5511999999999",
  "message": "Mensagem enviada pelo n8n",
  "source": "n8n",
  "queue": true,
  "failover": true,
  "failover_mode": "safe"
}</pre>
    </section>

    <section>
      <h2>Rotas do Workspace</h2>
      <table>
        <thead><tr><th>Método</th><th>Rota</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td><code>GET</code></td><td><code>/api/me</code></td><td>Mostra workspace e API key usada.</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/instances</code></td><td>Lista conectores do workspace.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/instances</code></td><td>Cadastra conector no workspace.</td></tr>
          <tr><td><code>GET</code></td><td><code>/api/messages?limit=50</code></td><td>Consulta mensagens do workspace.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/send</code></td><td>Envia mensagem usando somente conectores do workspace.</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Rotas Admin</h2>
      <p>Use <code>X-Admin-Key</code> com o valor de <code>ADMIN_KEY</code>.</p>
      <table>
        <thead><tr><th>Método</th><th>Rota</th><th>Uso</th></tr></thead>
        <tbody>
          <tr><td><code>GET</code></td><td><code>/api/admin/overview</code></td><td>Usuários, workspaces, chaves, exemplos n8n e mensagens recentes.</td></tr>
          <tr><td><code>PUT</code></td><td><code>/api/admin/settings</code></td><td>Salva URL webhook n8n para envio do código.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/admin/users</code></td><td>Cria usuário/workspace manualmente e retorna API key uma vez.</td></tr>
          <tr><td><code>POST</code></td><td><code>/api/admin/workspaces/:id/api-keys</code></td><td>Gera nova API key para um workspace.</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Provider Custom API</h2>
      <p>Cada workspace pode cadastrar um conector <code>custom</code> para enviar por qualquer API HTTP compatível. A rotação, fila, limite diário, intervalo, failover e logs continuam iguais aos outros providers.</p>
      <pre>{
  "name": "Minha API",
  "provider": "custom",
  "base_url": "https://api.seudominio.com",
  "send_path": "/send",
  "health_path": "/health",
  "auth_header": "Authorization",
  "api_key": "Bearer token-da-api",
  "custom_headers": "{\\"X-Origem\\":\\"router\\"}",
  "custom_body_template": "{\\"to\\":\\"{{to}}\\",\\"message\\":\\"{{message}}\\",\\"source\\":\\"{{source}}\\"}"
}</pre>
      <p>Placeholders disponíveis: <code>{{to}}</code>, <code>{{number}}</code>, <code>{{message}}</code>, <code>{{text}}</code>, <code>{{source}}</code>, <code>{{track_id}}</code>, <code>{{external_id}}</code>, <code>{{session}}</code> e <code>{{instance}}</code>.</p>
      <p>Prefira guardar segredo no campo <code>Token/API Key</code> e usar <code>auth_header</code> para dizer o nome do header. Use <code>custom_headers</code> para headers extras.</p>
    </section>

    <section>
      <h2>Payload de Envio</h2>
      <table>
        <thead><tr><th>Campo</th><th>Tipo</th><th>Obrigatório</th><th>Função</th></tr></thead>
        <tbody>
          <tr><td><code>to</code></td><td><code>string</code></td><td>Sim</td><td>Destino no formato DDI + DDD + número.</td></tr>
          <tr><td><code>message</code></td><td><code>string</code></td><td>Sim*</td><td>Texto enviado. <code>text</code> também funciona.</td></tr>
          <tr><td><code>source</code></td><td><code>string</code></td><td>Não</td><td>Origem exibida no painel.</td></tr>
          <tr><td><code>queue</code></td><td><code>boolean</code></td><td>Não</td><td>Quando <code>true</code>, coloca na fila e responde <code>202</code>.</td></tr>
          <tr><td><code>connector_id</code></td><td><code>string</code></td><td>Não</td><td>Força um conector específico dentro do workspace.</td></tr>
          <tr><td><code>exclude_connector_ids</code></td><td><code>array/string</code></td><td>Não</td><td>Remove conectores da rotação. Aceita array ou texto separado por vírgula.</td></tr>
          <tr><td><code>failover</code></td><td><code>boolean</code></td><td>Não</td><td>Tenta outro conector elegível em falhas seguras.</td></tr>
          <tr><td><code>failover_mode</code></td><td><code>string</code></td><td>Não</td><td><code>safe</code> ou <code>aggressive</code>.</td></tr>
          <tr><td><code>external_id</code></td><td><code>string</code></td><td>Não</td><td>ID externo para rastrear execução/pedido.</td></tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}
