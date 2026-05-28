export function registerHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cadastro WhatsApp Router</title>
  <style>
    :root { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #eef3f8; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    main { width: min(960px, 100%); display: grid; grid-template-columns: minmax(0, .9fr) minmax(320px, 1fr); gap: 18px; align-items: stretch; }
    section { background: #fff; border: 1px solid #d8e0ea; border-radius: 8px; padding: 22px; box-shadow: 0 12px 35px rgba(15, 23, 42, .08); }
    .brand { background: #152131; color: #e2e8f0; display: grid; align-content: space-between; }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
    h2 { margin: 0 0 14px; font-size: 20px; }
    p { color: #64748b; line-height: 1.55; }
    .brand p { color: #b9c6d8; }
    label { display: grid; gap: 6px; margin-bottom: 12px; font-size: 12px; font-weight: 900; color: #475569; text-transform: uppercase; }
    input { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font: inherit; color: #0f172a; }
    button { width: 100%; border: 1px solid #0f766e; background: #0f766e; color: #fff; border-radius: 8px; padding: 12px 14px; font: inherit; font-weight: 900; cursor: pointer; }
    button.secondary { margin-top: 8px; background: #fff; color: #0f766e; }
    a.button { display: block; text-align: center; text-decoration: none; width: 100%; border: 1px solid #155eef; background: #155eef; color: #fff; border-radius: 8px; padding: 12px 14px; font-weight: 900; margin-top: 10px; }
    pre { overflow: auto; background: #111827; color: #e5edf7; border-radius: 8px; padding: 12px; line-height: 1.45; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .notice { margin: 12px 0; padding: 12px 14px; border: 1px solid #99f6e4; background: #f0fdfa; color: #0f766e; border-radius: 8px; }
    .error { border-color: #fda29b; background: #fff1f3; color: #b42318; }
    .hidden { display: none !important; }
    @media (max-width: 780px) { main { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <main>
    <section class="brand">
      <div>
        <h1>WhatsApp Router</h1>
        <p>Cadastro V3 por código WhatsApp. Depois da verificação, seu workspace e sua chave de API serão criados automaticamente.</p>
      </div>
      <p><code>POST /api/send</code> com a chave do seu workspace.</p>
    </section>

    <section>
      <h2>Cadastro</h2>
      <div id="notice" class="notice">Informe seu WhatsApp para receber o código.</div>

      <div id="stepPhone">
        <label>Nome <input id="name" autocomplete="name" placeholder="Seu nome ou empresa"></label>
        <label>WhatsApp <input id="phone" inputmode="numeric" autocomplete="tel" placeholder="5511999999999"></label>
        <label>Workspace <input id="workspace" placeholder="Nome da empresa ou projeto"></label>
        <button id="requestCode" type="button">Receber código</button>
      </div>

      <div id="stepCode" class="hidden">
        <label>Código recebido no WhatsApp <input id="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456"></label>
        <button id="verifyCode" type="button">Validar e criar API</button>
        <button id="back" class="secondary" type="button">Corrigir WhatsApp</button>
      </div>

      <div id="stepDone" class="hidden">
        <p>Sua API foi criada. Guarde a chave abaixo; ela aparece completa somente agora.</p>
        <pre id="result">{}</pre>
        <a id="openPanel" class="button" href="/painel">Abrir painel</a>
      </div>
    </section>
  </main>

  <script>
    const $ = (id) => document.getElementById(id);
    function show(step) {
      $('stepPhone').classList.toggle('hidden', step !== 'phone');
      $('stepCode').classList.toggle('hidden', step !== 'code');
      $('stepDone').classList.toggle('hidden', step !== 'done');
    }
    function setNotice(text, error = false) {
      $('notice').textContent = text;
      $('notice').classList.toggle('error', error);
    }
    async function post(path, body) {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'HTTP ' + response.status);
      return data;
    }
    function payload() {
      return {
        name: $('name').value.trim(),
        phone: $('phone').value.replace(/\\D/g, ''),
        workspace_name: $('workspace').value.trim()
      };
    }
    $('requestCode').onclick = async () => {
      try {
        const data = payload();
        if (!data.phone) throw new Error('Informe o WhatsApp.');
        const result = await post('/api/auth/request-code', data);
        if (result.delivery?.configured === false) {
          setNotice('Código gerado, mas o envio pelo n8n ainda não está configurado. Avise o administrador.', true);
        } else {
          setNotice('Código enviado. Confira seu WhatsApp.');
        }
        show('code');
      } catch (error) {
        setNotice(error.message, true);
      }
    };
    $('verifyCode').onclick = async () => {
      try {
        const data = { ...payload(), code: $('code').value.trim() };
        if (!data.code) throw new Error('Informe o código.');
        const result = await post('/api/auth/verify-code', data);
        const apiKey = result.api_key || result.api_key_preview;
        if (result.api_key) localStorage.setItem('routerV3WorkspaceKey', result.api_key);
        $('result').textContent = JSON.stringify({
          workspace: result.workspace?.name,
          send_url: result.send_url,
          panel_url: location.origin + '/painel',
          api_key: apiKey,
          header: 'X-Router-Key'
        }, null, 2);
        setNotice('Cadastro concluído.');
        show('done');
      } catch (error) {
        setNotice(error.message, true);
      }
    };
    $('back').onclick = () => show('phone');
  </script>
</body>
</html>`;
}
