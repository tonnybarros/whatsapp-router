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
  "dry_run": false,
  "connector_id": "opcional-id-do-conector",
  "external_id": "pedido-123"
}</pre>
      <p><code>message</code> também pode ser enviado como <code>text</code>. Se <code>connector_id</code> não for informado, o router escolhe automaticamente a instância elegível mais antiga.</p>
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
          <tr><th>Body</th><td><code>{"to":"{{$json.phone}}","message":"{{$json.message}}","source":"n8n"}</code></td></tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}
