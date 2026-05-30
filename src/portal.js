export function portalHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Painel WhatsApp Router</title>
  <style>
    :root { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #071225; background: #eef6f4; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    button, input, select, textarea { font: inherit; }
    button { cursor: pointer; border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 10px 14px; font-weight: 800; color: #071225; }
    button.primary { background: #155eef; color: #fff; border-color: #155eef; }
    button.green { background: #0f766e; color: #fff; border-color: #0f766e; }
    button.danger { color: #b42318; border-color: #fda29b; }
    input, select, textarea { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 11px 12px; background: #fff; color: #071225; }
    textarea { min-height: 112px; resize: vertical; }
    label { display: grid; gap: 6px; font-size: 12px; font-weight: 900; color: #475569; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; font-size: 14px; }
    th { background: #f8fafc; color: #334155; text-transform: uppercase; font-size: 12px; }
    tr:last-child td { border-bottom: 0; }
    code, pre, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .app { display: grid; grid-template-columns: 330px 1fr; min-height: 100vh; }
    .side { background: #122536; color: #e2e8f0; padding: 24px 18px; border-right: 4px solid #155eef; }
    .side h1 { margin: 0; font-size: 22px; }
    .side p { margin: 6px 0 20px; color: #b9c6d8; }
    .side button { width: 100%; margin-top: 8px; }
    .nav { display: grid; gap: 8px; margin-top: 18px; }
    .nav button { text-align: left; background: transparent; color: #dce7f5; border-color: #334155; }
    .nav button.active { background: #263952; border-color: #52667f; }
    .nav small { display: block; color: #b9c6d8; font-weight: 500; margin-top: 2px; }
    .main { padding: 28px 24px 60px; overflow: auto; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 18px; }
    .top h2 { margin: 0; font-size: 28px; }
    .top p { margin: 6px 0 0; color: #64748b; }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .metric, .panel { background: #fff; border: 1px solid #d8e0ea; border-radius: 8px; overflow: hidden; }
    .metric { padding: 16px; box-shadow: inset 0 3px 0 #155eef; }
    .metric:nth-child(2) { box-shadow: inset 0 3px 0 #0f766e; }
    .metric:nth-child(3) { box-shadow: inset 0 3px 0 #b54708; }
    .metric:nth-child(4) { box-shadow: inset 0 3px 0 #7c3aed; }
    .metric span { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 900; }
    .metric strong { display: block; font-size: 30px; margin-top: 8px; }
    .panel { margin-bottom: 16px; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .panel-head h3 { margin: 0; font-size: 18px; }
    .panel-body { padding: 16px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .full { grid-column: 1 / -1; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .modal { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 24px; background: rgba(15, 23, 42, .56); }
    .modal-card { width: min(980px, 100%); max-height: calc(100vh - 48px); overflow: auto; background: #fff; border: 1px solid #d8e0ea; border-radius: 8px; box-shadow: 0 24px 60px rgba(15, 23, 42, .28); }
    .modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .modal-head h3 { margin: 0; font-size: 18px; }
    .modal-close { min-width: 38px; padding: 8px 0; font-size: 20px; line-height: 1; }
    .badge { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 900; }
    .badge.active, .badge.ok, .badge.sent, .badge.dry_run { background: #d1fadf; color: #05603a; }
    .badge.paused, .badge.error, .badge.failed { background: #fee4e2; color: #b42318; }
    .muted { color: #64748b; }
    .notice { margin: 12px 0; padding: 12px 14px; border: 1px solid #99f6e4; background: #f0fdfa; color: #0f766e; border-radius: 8px; }
    .hidden { display: none !important; }
    .login { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #152131; }
    .login-card { width: min(430px, 100%); background: #fff; border-radius: 8px; padding: 22px; border: 1px solid #d8e0ea; box-shadow: 0 16px 45px rgba(0,0,0,.2); }
    .login-card h1 { margin: 0 0 8px; }
    @media (max-width: 980px) { .app { grid-template-columns: 1fr; } .metrics, .grid, .grid-3 { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <section id="loginView" class="login">
    <div class="login-card">
      <h1>Painel do usuário</h1>
      <p class="muted">Entre com a API key do seu workspace.</p>
      <label>API key <input id="portalKey" type="password" placeholder="whr_..."></label>
      <button id="login" class="primary" type="button" style="width:100%; margin-top:12px;">Entrar</button>
      <div id="loginNotice" class="notice">Use a chave gerada no cadastro.</div>
    </div>
  </section>

  <div id="appView" class="app hidden">
    <aside class="side">
      <h1>WhatsApp Router</h1>
      <p id="workspaceName">Workspace</p>
      <div class="nav">
        <button class="active" data-page="realtime" type="button">Tempo real<small>Últimas mensagens</small></button>
        <button data-page="connector" type="button">Conectores<small>Configuração e teste</small></button>
      </div>
      <button id="logout" type="button">Sair</button>
    </aside>

    <main class="main">
      <div class="top">
        <div>
          <h2 id="pageTitle">Tempo real</h2>
          <p id="pageSubtitle">Últimas mensagens e saúde dos conectores.</p>
        </div>
        <div class="actions">
          <span class="muted" id="lastRefresh">tempo real</span>
          <button id="refresh" class="primary" type="button">Atualizar</button>
        </div>
      </div>

      <section class="metrics">
        <div class="metric"><span>Instâncias</span><strong id="mTotal">-</strong></div>
        <div class="metric"><span>Ativas</span><strong id="mActive">-</strong></div>
        <div class="metric"><span>Mensagens</span><strong id="mMessages">-</strong></div>
        <div class="metric"><span>API</span><strong id="mService">OK</strong></div>
      </section>

      <div id="notice" class="notice">Conectado.</div>

      <section id="realtimeView" class="panel">
        <div class="panel-head">
          <h3>Últimas mensagens</h3>
          <select id="messageFilter" style="width:190px">
            <option value="all">Todos os status</option>
            <option value="queued">Na fila</option>
            <option value="processing">Processando</option>
            <option value="sent">Enviado</option>
            <option value="failed">Erro</option>
            <option value="dry_run">Teste</option>
          </select>
        </div>
        <table>
          <thead><tr><th>Data</th><th>Destino</th><th>Status</th><th>Origem</th><th>Conector</th><th>API</th><th>Tentativas</th><th>Erro</th></tr></thead>
          <tbody id="globalMessagesRows"></tbody>
        </table>
      </section>

      <section id="connectorView" class="hidden">
        <section class="panel">
          <div class="panel-head">
            <h3>Conectores</h3>
            <div class="actions">
              <button id="newConnector" type="button">Novo Conector</button>
            </div>
          </div>
          <div id="instanceModal" class="modal hidden">
            <div class="modal-card">
              <div class="modal-head">
                <h3 id="instanceModalTitle">Conector</h3>
                <div class="actions">
                  <button id="saveInstance" class="primary" type="button">Salvar</button>
                  <button id="closeInstanceModal" class="modal-close" type="button">×</button>
                </div>
              </div>
              <form id="instanceForm" class="panel-body grid-3">
              <input type="hidden" id="instanceId">
              <label>Nome <input id="name" required></label>
              <label>API
                <select id="provider">
                  <option value="uazapi">uazapiGO</option>
                  <option value="waha">WAHA</option>
                  <option value="evolution_go">Evolution Go</option>
                  <option value="evolution_api">Evolution API</option>
                  <option value="custom">Custom API</option>
                </select>
              </label>
              <label>Base URL <input id="base_url" required></label>
              <label>Token/API key <input id="api_key" placeholder="mantém atual se vazio"></label>
              <label>Sessão <input id="session"></label>
              <label>Instância <input id="instance"></label>
              <label>Auth header <input id="auth_header" placeholder="padrão da API"></label>
              <label>Limite/dia <input id="daily_limit" type="number" value="50"></label>
              <label>Intervalo mínimo (segundos) <input id="min_seconds_between_messages" type="number" value="60"></label>
              <label>Send path <input id="send_path" placeholder="padrão da API"></label>
              <label>Health path <input id="health_path" placeholder="padrão da API"></label>
              <label>Headers JSON <textarea id="custom_headers" placeholder='{"X-Origem":"router"}'></textarea></label>
              <label>Body template JSON <textarea id="custom_body_template" placeholder='{"to":"{{to}}","message":"{{message}}"}'></textarea></label>
            </form>
            </div>
          </div>
          <table>
            <thead><tr><th>Nome</th><th>API</th><th>Status</th><th>Saúde</th><th>Uso</th><th>Ações</th></tr></thead>
            <tbody id="instancesRows"></tbody>
          </table>
        </section>

        <section class="panel">
          <div class="panel-head"><h3>Teste de envio</h3><button id="sendTest" class="green" type="button">Enviar</button></div>
          <div class="panel-body grid">
            <label>Conector <select id="testConnector"></select></label>
            <label>Destino <input id="testTo" placeholder="5511999999999"></label>
            <label class="full">Mensagem <textarea id="testMessage">Teste do WhatsApp Router V3</textarea></label>
            <label>Origem <input id="testSource" value="painel"></label>
            <label><span>Dry run</span><input id="dryRun" type="checkbox"></label>
          </div>
        </section>
      </section>
    </main>
  </div>

  <script>
    const providers = {
      uazapi: { base_url: 'https://seu-subdominio.uazapi.com', send_path: '/send/text', session: '', instance: '' },
      waha: { base_url: 'https://waha.seudominio.com', send_path: '/api/sendText', session: 'default', instance: '' },
      evolution_go: { base_url: 'https://evolution-go.seudominio.com', send_path: '/send/text', session: '', instance: '' },
      evolution_api: { base_url: 'https://evolution.seudominio.com', send_path: '', session: '', instance: 'minha-instancia' },
      custom: { base_url: 'https://api.seudominio.com', send_path: '/send', session: '', instance: '' }
    };
    const state = { me: null, instances: [], messages: [], page: 'realtime' };
    const $ = (id) => document.getElementById(id);
    const key = () => localStorage.getItem('routerV3WorkspaceKey') || '';
    const headers = (hasBody = false) => {
      const value = { 'X-Router-Key': key() };
      if (hasBody) value['Content-Type'] = 'application/json';
      return value;
    };
    function setNotice(text) { $('notice').textContent = text; $('loginNotice').textContent = text; }
    function statusLabel(value) {
      return { active: 'Ativo', paused: 'Pausado', ok: 'OK', error: 'Erro', unknown: 'Desconhecido', sent: 'Enviado', failed: 'Erro', dry_run: 'Teste', queued: 'Na fila', processing: 'Processando', selected: 'Selecionado' }[value] || value || '-';
    }
    function badge(value) { return '<span class="badge ' + (value || 'unknown') + '">' + statusLabel(value) + '</span>'; }
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
    function lastAttempt(item) {
      const attempts = item.attempts || [];
      return attempts.map((a) => (a.instance_name || a.instance_id || '-') + ': ' + statusLabel(a.status)).join(' / ') || '-';
    }
    function connectorName(item) {
      const attempt = item.attempts?.at(-1);
      return attempt?.instance_name || state.instances.find((i) => i.id === item.selected_instance_id)?.name || '-';
    }
    async function api(path, options = {}) {
      const hasBody = Object.prototype.hasOwnProperty.call(options, 'body') && options.body !== undefined;
      const response = await fetch(path, { ...options, headers: { ...headers(hasBody), ...(options.headers || {}) } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'HTTP ' + response.status);
      return data;
    }
    async function load() {
      state.me = await api('/api/me');
      state.instances = await api('/api/instances');
      state.messages = await api('/api/messages?limit=120');
      $('loginView').classList.add('hidden');
      $('appView').classList.remove('hidden');
      $('workspaceName').textContent = state.me.workspace?.name || 'Workspace';
      $('mTotal').textContent = state.instances.length;
      $('mActive').textContent = state.instances.filter((i) => i.status === 'active').length;
      $('mMessages').textContent = state.me.workspace?.messages_total ?? state.messages.length;
      $('lastRefresh').textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      renderInstances();
      renderMessages();
      renderTestConnectors();
      renderPage();
      setNotice('Workspace conectado.');
    }
    function renderPage() {
      $('realtimeView').classList.toggle('hidden', state.page !== 'realtime');
      $('connectorView').classList.toggle('hidden', state.page !== 'connector');
      $('pageTitle').textContent = state.page === 'realtime' ? 'Tempo real' : 'Conectores';
      $('pageSubtitle').textContent = state.page === 'realtime' ? 'Últimas mensagens do workspace.' : 'Configuração, saúde e envio de teste.';
      document.querySelectorAll('.nav button').forEach((button) => button.classList.toggle('active', button.dataset.page === state.page));
    }
    function renderInstances() {
      $('instancesRows').innerHTML = state.instances.map((item) => '<tr><td><strong>' + item.name + '</strong><br><span class="muted mono">' + item.id.slice(0, 8) + '</span></td><td>' + item.provider + '</td><td>' + badge(item.status) + '</td><td>' + badge(item.health) + '</td><td>' + item.daily_sent_count + '/' + item.daily_limit + '</td><td class="actions"><button onclick="editInstance(\\'' + item.id + '\\')">Editar</button><button onclick="copyConnectorId(\\'' + item.id + '\\')">Copiar ID</button><button onclick="healthInstance(\\'' + item.id + '\\')">Health</button><button onclick="toggleInstance(\\'' + item.id + '\\', \\'' + item.status + '\\')">' + (item.status === 'active' ? 'Pausar' : 'Ativar') + '</button><button class="danger" onclick="deleteInstance(\\'' + item.id + '\\')">Excluir</button></td></tr>').join('') || '<tr><td colspan="6">Nenhum conector cadastrado.</td></tr>';
    }
    function renderMessages() {
      const filter = $('messageFilter').value;
      const rows = state.messages.filter((item) => filter === 'all' || item.status === filter);
      $('globalMessagesRows').innerHTML = rows.map((item) => '<tr><td>' + formatDate(item.created_at) + '</td><td class="mono">' + item.to + '</td><td>' + badge(item.status) + '</td><td>' + (item.source || '-') + '</td><td>' + connectorName(item) + '</td><td>' + (item.provider || '-') + '</td><td>' + lastAttempt(item) + '</td><td class="muted">' + messageError(item) + '</td></tr>').join('') || '<tr><td colspan="8">Nenhuma mensagem.</td></tr>';
    }
    function renderTestConnectors() {
      $('testConnector').innerHTML = '<option value="">Automático</option>' + state.instances.map((item) => '<option value="' + item.id + '">' + item.name + ' - ' + item.provider + '</option>').join('');
    }
    function clearForm() {
      $('instanceForm').reset();
      $('instanceId').value = '';
      $('daily_limit').value = 50;
      $('min_seconds_between_messages').value = 60;
      $('provider').value = 'uazapi';
      $('provider').onchange();
    }
    function openInstanceModal(title) {
      $('instanceModalTitle').textContent = title;
      $('instanceModal').classList.remove('hidden');
    }
    function closeInstanceModal() {
      $('instanceModal').classList.add('hidden');
    }
    window.editInstance = (id) => {
      const item = state.instances.find((instance) => instance.id === id);
      if (!item) return;
      for (const field of ['name', 'provider', 'base_url', 'auth_header', 'session', 'instance', 'daily_limit', 'min_seconds_between_messages', 'send_path', 'health_path', 'custom_headers', 'custom_body_template']) {
        $(field).value = item[field] || '';
      }
      $('api_key').value = '';
      $('instanceId').value = item.id;
      $('provider').onchange();
      state.page = 'connector';
      renderPage();
      openInstanceModal('Editar ' + item.name);
    };
    window.healthInstance = async (id) => {
      await api('/api/instances/' + id + '/health-check', { method: 'POST', body: '{}' });
      await load();
    };
    window.toggleInstance = async (id, status) => {
      const action = status === 'active' ? 'pause' : 'resume';
      await api('/api/instances/' + id + '/' + action, { method: 'POST', body: '{}' });
      await load();
    };
    window.deleteInstance = async (id) => {
      if (!confirm('Excluir conector?')) return;
      await api('/api/instances/' + id, { method: 'DELETE' });
      await load();
    };
    window.copyConnectorId = async (id) => {
      try {
        await navigator.clipboard.writeText(id);
        setNotice('ID do conector copiado.');
      } catch {
        setNotice('ID do conector: ' + id);
      }
    };
    $('login').onclick = async () => {
      localStorage.setItem('routerV3WorkspaceKey', $('portalKey').value.trim());
      await load().catch((error) => setNotice(error.message));
    };
    $('logout').onclick = () => { localStorage.removeItem('routerV3WorkspaceKey'); location.reload(); };
    $('refresh').onclick = () => load().catch((error) => setNotice(error.message));
    $('messageFilter').onchange = renderMessages;
    document.querySelectorAll('.nav button').forEach((button) => {
      button.onclick = () => { state.page = button.dataset.page; renderPage(); };
    });
    $('newConnector').onclick = () => {
      clearForm();
      openInstanceModal('Novo conector');
    };
    $('closeInstanceModal').onclick = closeInstanceModal;
    $('provider').onchange = () => {
      const meta = providers[$('provider').value] || providers.uazapi;
      $('base_url').placeholder = meta.base_url;
      $('send_path').placeholder = meta.send_path || 'padrão da API';
      $('health_path').placeholder = 'padrão da API';
      $('auth_header').placeholder = $('provider').value === 'custom' ? 'Authorization' : 'padrão da API';
      $('session').placeholder = meta.session;
      $('instance').placeholder = meta.instance;
    };
    $('saveInstance').onclick = async () => {
      const payload = {};
      for (const field of ['name', 'provider', 'base_url', 'api_key', 'auth_header', 'session', 'instance', 'daily_limit', 'min_seconds_between_messages', 'send_path', 'health_path', 'custom_headers', 'custom_body_template']) {
        payload[field] = $(field).value.trim();
      }
      payload.id = $('instanceId').value || undefined;
      if (!payload.api_key) delete payload.api_key;
      payload.daily_limit = Number(payload.daily_limit || 50);
      payload.min_seconds_between_messages = Number(payload.min_seconds_between_messages || 60);
      await api('/api/instances', { method: 'POST', body: JSON.stringify(payload) });
      clearForm();
      closeInstanceModal();
      await load();
    };
    $('sendTest').onclick = async () => {
      const payload = {
        to: $('testTo').value.trim(),
        message: $('testMessage').value,
        source: $('testSource').value || 'painel',
        connector_id: $('testConnector').value || undefined,
        dry_run: $('dryRun').checked,
        failover: true,
        failover_mode: 'safe'
      };
      await api('/api/send', { method: 'POST', body: JSON.stringify(payload) });
      setNotice('Teste registrado.');
      await load();
    };
    if (key()) {
      $('portalKey').value = key();
      load().catch((error) => setNotice(error.message));
    }
  </script>
</body>
</html>`;
}
