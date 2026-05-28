export function adminHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp Router V3</title>
  <style>
    :root { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #eef3f8; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 10px 14px; font-weight: 800; }
    button.primary { background: #0f766e; color: #fff; border-color: #0f766e; }
    button.danger { color: #b42318; border-color: #fda29b; }
    input, select, textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 11px 12px; background: #fff; color: #0f172a; }
    label { display: grid; gap: 6px; font-size: 12px; font-weight: 900; color: #475569; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #d8e0ea; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-size: 14px; }
    th { background: #f8fafc; color: #334155; text-transform: uppercase; font-size: 12px; }
    tr:last-child td { border-bottom: 0; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    pre { margin: 0; background: #111827; color: #e5edf7; border-radius: 8px; padding: 12px; overflow: auto; line-height: 1.45; }
    .app { display: grid; grid-template-columns: 310px 1fr; min-height: 100vh; }
    .side { background: #152131; color: #e2e8f0; padding: 24px 18px; }
    .side h1 { margin: 0; font-size: 22px; }
    .side p { margin: 6px 0 20px; color: #b9c6d8; }
    .side button { width: 100%; margin-top: 8px; }
    .main { padding: 28px 24px 60px; overflow: auto; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 18px; }
    .top h2 { margin: 0; font-size: 28px; }
    .top p { margin: 6px 0 0; color: #64748b; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .metric, .panel { background: #fff; border: 1px solid #d8e0ea; border-radius: 8px; }
    .metric { padding: 16px; }
    .metric span { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 900; }
    .metric strong { display: block; font-size: 30px; margin-top: 8px; }
    .panel { margin-bottom: 16px; overflow: hidden; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .panel-head h3 { margin: 0; font-size: 18px; }
    .panel-body { padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 900; }
    .badge.active, .badge.ok, .badge.sent { background: #d1fadf; color: #05603a; }
    .badge.blocked, .badge.error, .badge.failed { background: #fee4e2; color: #b42318; }
    .muted { color: #64748b; }
    .notice { margin: 12px 0; padding: 12px 14px; border: 1px solid #99f6e4; background: #f0fdfa; color: #0f766e; border-radius: 8px; }
    .hidden { display: none !important; }
    .locked .protected { display: none !important; }
    .login-card { margin-top: 18px; padding: 14px; border: 1px solid rgba(203, 213, 225, .28); border-radius: 8px; background: rgba(15, 23, 42, .26); }
    .locked .side { min-height: 100vh; }
    .locked .app { grid-template-columns: minmax(300px, 420px); justify-content: center; background: #152131; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    @media (max-width: 980px) { .app { grid-template-columns: 1fr; } .metrics, .grid, .grid-3 { grid-template-columns: 1fr; } }
  </style>
</head>
<body class="locked">
  <div class="app">
    <aside class="side">
      <h1>WhatsApp Router</h1>
      <p>V3 multiusuário</p>
      <div class="login-card">
        <label>Chave admin <input id="adminKey" type="password" placeholder="ADMIN_KEY"></label>
        <button id="login" class="primary" type="button">Entrar</button>
        <button id="logout" class="protected" type="button">Sair</button>
        <div id="loginNotice" class="notice">Informe a chave admin para abrir o painel.</div>
      </div>
      <div class="protected">
        <div style="height:18px"></div>
        <label>Workspace <select id="workspaceSelect"></select></label>
        <button id="refresh" type="button">Atualizar</button>
        <div class="notice">Envio n8n: <span class="mono">POST /api/send</span> com a chave do workspace.</div>
      </div>
    </aside>

    <main class="main protected">
      <div class="top">
        <div>
          <h2>Admin V3</h2>
          <p>Usuários, workspaces, conectores, chaves e cadastro por código WhatsApp.</p>
        </div>
        <span class="badge">v3</span>
      </div>

      <section class="metrics">
        <div class="metric"><span>Usuários</span><strong id="mUsers">-</strong></div>
        <div class="metric"><span>Workspaces</span><strong id="mWorkspaces">-</strong></div>
        <div class="metric"><span>Conectores</span><strong id="mInstances">-</strong></div>
        <div class="metric"><span>Fila</span><strong id="mQueue">-</strong></div>
      </section>

      <div id="notice" class="notice">Entre com a chave admin.</div>

      <section class="panel">
        <div class="panel-head"><h3>Cadastro via WhatsApp</h3><button id="saveSettings" class="primary" type="button">Salvar URL n8n</button></div>
        <div class="panel-body grid">
          <label>Webhook n8n para enviar código <input id="verifyWebhook" placeholder="https://n8n.seudominio/webhook/router-codigo"></label>
          <label>Endpoint público <input id="requestCodeUrl" readonly></label>
          <div>
            <p class="muted">Payload enviado para o n8n:</p>
            <pre id="verifyPayload">{}</pre>
          </div>
          <div>
            <p class="muted">Exemplo para envio no n8n:</p>
            <pre id="sendExample">{}</pre>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Criar usuário manual</h3><button id="createUser" class="primary" type="button">Criar</button></div>
        <div class="panel-body grid-3">
          <label>Nome <input id="newName" placeholder="Cliente"></label>
          <label>WhatsApp <input id="newPhone" placeholder="5511999999999"></label>
          <label>Workspace <input id="newWorkspace" placeholder="Empresa do cliente"></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Usuários</h3></div>
        <table>
          <thead><tr><th>Nome</th><th>WhatsApp</th><th>Status</th><th>Workspaces</th><th>Ações</th></tr></thead>
          <tbody id="usersRows"></tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-head">
          <h3>Conectores do workspace</h3>
          <div class="actions">
            <button id="newKey" type="button">Gerar API key</button>
            <button id="saveInstance" class="primary" type="button">Salvar conector</button>
          </div>
        </div>
        <div class="panel-body">
          <form id="instanceForm" class="grid-3">
            <input type="hidden" id="instanceId">
            <label>Nome <input id="name" required></label>
            <label>API
              <select id="provider">
                <option value="uazapi">uazapiGO</option>
                <option value="waha">WAHA</option>
                <option value="evolution_go">Evolution Go</option>
                <option value="evolution_api">Evolution API</option>
              </select>
            </label>
            <label>Base URL <input id="base_url" required></label>
            <label>Token/API key <input id="api_key" placeholder="mantém atual se vazio"></label>
            <label>Sessão <input id="session"></label>
            <label>Instância <input id="instance"></label>
            <label>Limite/dia <input id="daily_limit" type="number" value="50"></label>
            <label>Intervalo mínimo <input id="min_seconds_between_messages" type="number" value="60"></label>
            <label>Send path <input id="send_path" placeholder="padrão da API"></label>
          </form>
        </div>
        <table>
          <thead><tr><th>Nome</th><th>API</th><th>Status</th><th>Saúde</th><th>Uso</th><th>Ações</th></tr></thead>
          <tbody id="instancesRows"></tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>Mensagens recentes</h3></div>
        <table>
          <thead><tr><th>Data</th><th>Destino</th><th>Status</th><th>Origem</th><th>Conector</th><th>Erro</th></tr></thead>
          <tbody id="messagesRows"></tbody>
        </table>
      </section>
    </main>
  </div>

  <script>
    const providers = {
      uazapi: { base_url: 'https://seu-subdominio.uazapi.com', send_path: '/send/text', session: '', instance: '' },
      waha: { base_url: 'https://waha.seudominio.com', send_path: '/api/sendText', session: 'default', instance: '' },
      evolution_go: { base_url: 'https://evolution-go.seudominio.com', send_path: '/send/text', session: '', instance: '' },
      evolution_api: { base_url: 'https://evolution.seudominio.com', send_path: '', session: '', instance: 'minha-instancia' }
    };
    const state = { overview: null, instances: [], messages: [] };
    const $ = (id) => document.getElementById(id);
    const key = () => localStorage.getItem('routerV3AdminKey') || '';
    const headers = (hasBody = false) => {
      const value = { 'X-Admin-Key': key() };
      if (hasBody) value['Content-Type'] = 'application/json';
      return value;
    };
    const selectedWorkspaceId = () => $('workspaceSelect').value;

    function setNotice(text) {
      $('notice').textContent = text;
      $('loginNotice').textContent = text;
    }
    function html(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    }
    function badge(value) { return '<span class="badge ' + html(value || '') + '">' + statusLabel(value) + '</span>'; }
    function statusLabel(value) {
      return { active: 'Ativo', blocked: 'Bloqueado', ok: 'OK', error: 'Erro', unknown: 'Desconhecido', sent: 'Enviado', failed: 'Erro', dry_run: 'Teste', queued: 'Na fila', processing: 'Processando', selected: 'Selecionado' }[value] || value || '-';
    }
    function formatDate(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    function messageError(item) {
      if (!item?.error) return '-';
      return item.error.message || item.error.error || JSON.stringify(item.error);
    }
    async function api(path, options = {}) {
      const hasBody = Object.prototype.hasOwnProperty.call(options, 'body') && options.body !== undefined;
      const response = await fetch(path, { ...options, headers: { ...headers(hasBody), ...(options.headers || {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'HTTP ' + response.status);
      return data;
    }
    async function load() {
      $('adminKey').value = key();
      state.overview = await api('/api/admin/overview');
      document.body.classList.remove('locked');
      $('mUsers').textContent = state.overview.users.length;
      $('mWorkspaces').textContent = state.overview.workspaces.length;
      $('mInstances').textContent = state.overview.workspaces.reduce((sum, item) => sum + item.instances_total, 0);
      $('mQueue').textContent = state.overview.queue.pending;
      $('verifyWebhook').value = state.overview.n8n_verify_webhook_url || '';
      $('requestCodeUrl').value = state.overview.base_url + '/api/auth/request-code';
      $('verifyPayload').textContent = JSON.stringify(state.overview.n8n_verify_payload, null, 2);
      $('sendExample').textContent = JSON.stringify(state.overview.n8n_send_example, null, 2);
      renderWorkspaces();
      renderUsers();
      await loadWorkspace();
      setNotice('Admin conectado.');
    }
    function renderWorkspaces() {
      const current = selectedWorkspaceId();
      $('workspaceSelect').innerHTML = state.overview.workspaces.map((item) => '<option value="' + html(item.id) + '">' + html(item.name) + '</option>').join('');
      if (current) $('workspaceSelect').value = current;
    }
    function renderUsers() {
      $('usersRows').innerHTML = state.overview.users.map((user) => {
        const workspaces = user.workspaces.map((w) => html(w.name) + ' <span class="muted">(' + html(w.api_keys[0]?.key_preview || 'sem key') + ')</span>').join('<br>');
        return '<tr><td>' + html(user.name || '-') + '</td><td class="mono">' + html(user.phone_masked) + '</td><td>' + badge(user.status) + '</td><td>' + workspaces + '</td><td><button class="danger" onclick="deleteUser(\\'' + html(user.id) + '\\')">Excluir</button></td></tr>';
      }).join('') || '<tr><td colspan="5">Nenhum usuário.</td></tr>';
    }
    async function loadWorkspace() {
      const workspaceId = selectedWorkspaceId();
      if (!workspaceId) {
        state.instances = [];
        state.messages = [];
        renderInstances();
        renderMessages();
        return;
      }
      state.instances = await api('/api/admin/workspaces/' + workspaceId + '/instances');
      state.messages = await api('/api/admin/workspaces/' + workspaceId + '/messages?limit=80');
      renderInstances();
      renderMessages();
    }
    function renderInstances() {
      $('instancesRows').innerHTML = state.instances.map((item) => '<tr><td><strong>' + item.name + '</strong><br><span class="muted mono">' + item.id.slice(0, 8) + '</span></td><td>' + item.provider + '</td><td>' + badge(item.status) + '</td><td>' + badge(item.health) + '</td><td>' + item.daily_sent_count + '/' + item.daily_limit + '</td><td class="actions"><button onclick="editInstance(\\'' + item.id + '\\')">Editar</button><button onclick="healthInstance(\\'' + item.id + '\\')">Health</button><button onclick="toggleInstance(\\'' + item.id + '\\', \\'' + item.status + '\\')">' + (item.status === 'active' ? 'Pausar' : 'Ativar') + '</button><button class="danger" onclick="deleteInstance(\\'' + item.id + '\\')">Excluir</button></td></tr>').join('') || '<tr><td colspan="6">Nenhum conector neste workspace.</td></tr>';
    }
    function renderMessages() {
      $('messagesRows').innerHTML = state.messages.map((item) => '<tr><td>' + formatDate(item.created_at) + '</td><td class="mono">' + item.to + '</td><td>' + badge(item.status) + '</td><td>' + (item.source || '-') + '</td><td>' + (item.attempts?.at(-1)?.instance_name || '-') + '</td><td class="muted">' + messageError(item) + '</td></tr>').join('') || '<tr><td colspan="6">Nenhuma mensagem.</td></tr>';
    }
    window.editInstance = (id) => {
      const item = state.instances.find((instance) => instance.id === id);
      if (!item) return;
      for (const field of ['name', 'provider', 'base_url', 'session', 'instance', 'daily_limit', 'min_seconds_between_messages', 'send_path']) {
        $(field).value = item[field] || '';
      }
      $('api_key').value = '';
      $('instanceId').value = item.id;
    };
    window.healthInstance = async (id) => {
      await api('/api/admin/workspaces/' + selectedWorkspaceId() + '/instances/' + id + '/health-check', { method: 'POST', body: '{}' });
      await loadWorkspace();
    };
    window.toggleInstance = async (id, status) => {
      const action = status === 'active' ? 'pause' : 'resume';
      await api('/api/admin/workspaces/' + selectedWorkspaceId() + '/instances/' + id + '/' + action, { method: 'POST', body: '{}' });
      await loadWorkspace();
    };
    window.deleteInstance = async (id) => {
      if (!confirm('Excluir conector?')) return;
      await api('/api/admin/workspaces/' + selectedWorkspaceId() + '/instances/' + id, { method: 'DELETE' });
      await loadWorkspace();
    };
    window.deleteUser = async (id) => {
      const user = state.overview.users.find((item) => item.id === id);
      const name = user?.name || user?.phone_masked || id;
      if (!confirm('Excluir usuário ' + name + '? Isso apaga workspaces, API keys, conectores e mensagens dele.')) return;
      try {
        await api('/api/admin/users/' + id, { method: 'DELETE' });
        await load();
        setNotice('Usuário excluído.');
      } catch (error) {
        setNotice(error.message);
      }
    };
    $('login').onclick = async () => {
      localStorage.setItem('routerV3AdminKey', $('adminKey').value.trim());
      await load().catch((error) => {
        document.body.classList.add('locked');
        setNotice(error.message);
      });
    };
    $('logout').onclick = () => { localStorage.removeItem('routerV3AdminKey'); location.reload(); };
    $('refresh').onclick = () => load().catch((error) => setNotice(error.message));
    $('workspaceSelect').onchange = () => loadWorkspace().catch((error) => setNotice(error.message));
    $('saveSettings').onclick = async () => {
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ n8n_verify_webhook_url: $('verifyWebhook').value.trim() }) });
      await load();
    };
    $('createUser').onclick = async () => {
      const data = await api('/api/admin/users', { method: 'POST', body: JSON.stringify({ name: $('newName').value.trim(), phone: $('newPhone').value.trim(), workspace_name: $('newWorkspace').value.trim() }) });
      setNotice('Usuário criado. API key: ' + (data.api_key || data.api_key_preview));
      await load();
    };
    $('newKey').onclick = async () => {
      const data = await api('/api/admin/workspaces/' + selectedWorkspaceId() + '/api-keys', { method: 'POST', body: JSON.stringify({ label: 'API n8n' }) });
      setNotice('Nova API key: ' + data.api_key);
      await load();
    };
    $('provider').onchange = () => {
      const meta = providers[$('provider').value] || providers.uazapi;
      $('base_url').placeholder = meta.base_url;
      $('send_path').placeholder = meta.send_path || 'padrão da API';
      $('session').placeholder = meta.session;
      $('instance').placeholder = meta.instance;
    };
    $('saveInstance').onclick = async () => {
      const payload = {};
      for (const field of ['name', 'provider', 'base_url', 'api_key', 'session', 'instance', 'daily_limit', 'min_seconds_between_messages', 'send_path']) {
        payload[field] = $(field).value.trim();
      }
      payload.id = $('instanceId').value || undefined;
      if (!payload.api_key) delete payload.api_key;
      payload.daily_limit = Number(payload.daily_limit || 50);
      payload.min_seconds_between_messages = Number(payload.min_seconds_between_messages || 60);
      await api('/api/admin/workspaces/' + selectedWorkspaceId() + '/instances', { method: 'POST', body: JSON.stringify(payload) });
      $('instanceForm').reset();
      $('instanceId').value = '';
      await loadWorkspace();
    };
    if (key()) load().catch((error) => {
      document.body.classList.add('locked');
      setNotice(error.message);
    });
  </script>
</body>
</html>`;
}
