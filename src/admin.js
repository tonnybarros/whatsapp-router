export function adminHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp Router Admin</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #eef2f6;
      --surface: #ffffff;
      --surface-soft: #f7f9fc;
      --surface-strong: #e9eef5;
      --line: #d4dce7;
      --line-strong: #b7c4d5;
      --text: #101827;
      --muted: #667085;
      --accent: #0f766e;
      --accent-dark: #115e59;
      --blue: #2563eb;
      --danger: #b42318;
      --ok: #067647;
      --warn: #b54708;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    html, body { min-height: 100%; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    button, input, select, textarea { font: inherit; }
    button { border: 1px solid var(--line); background: #fff; color: var(--text); border-radius: 6px; min-height: 36px; padding: 0 12px; cursor: pointer; }
    button:hover { border-color: var(--line-strong); }
    button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    button.primary:hover { background: var(--accent-dark); }
    button.blue { background: var(--blue); border-color: var(--blue); color: #fff; }
    button.danger { color: var(--danger); border-color: #f4b5b0; }
    button.ghost { background: transparent; }
    button:disabled { opacity: .52; cursor: not-allowed; }
    input, select, textarea { width: 100%; border: 1px solid var(--line); background: #fff; color: var(--text); border-radius: 6px; min-height: 38px; padding: 8px 10px; outline: none; }
    input:focus, select:focus, textarea:focus { border-color: #5aaea7; box-shadow: 0 0 0 3px rgba(15,118,110,.12); }
    textarea { min-height: 96px; resize: vertical; }
    label { display: grid; gap: 6px; color: #445066; font-size: 12px; font-weight: 800; text-transform: uppercase; }
    main { min-height: 100vh; }

    .login-screen { min-height: 100vh; display: grid; place-items: center; padding: 20px; }
    .login-card { width: min(440px, 100%); background: var(--surface); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 14px 34px rgba(16,24,39,.12); overflow: hidden; }
    .login-head { padding: 22px 24px; border-bottom: 1px solid var(--line); background: var(--surface-soft); }
    .login-head h1 { margin: 0; font-size: 22px; letter-spacing: 0; }
    .login-head p { margin: 6px 0 0; color: var(--muted); }
    .login-body { display: grid; gap: 14px; padding: 22px 24px 24px; }

    .app { display: grid; grid-template-columns: 280px minmax(0, 1fr); min-height: 100vh; }
    .sidebar { background: #182230; color: #e6edf5; padding: 18px 14px; display: grid; grid-template-rows: auto auto 1fr auto; gap: 16px; }
    .brand { padding: 4px 8px 14px; border-bottom: 1px solid rgba(255,255,255,.12); }
    .brand h1 { margin: 0; font-size: 19px; letter-spacing: 0; }
    .brand p { margin: 5px 0 0; color: #a9b7c7; font-size: 13px; }
    .side-section-title { color: #a9b7c7; font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; margin: 0 8px 8px; }
    .nav-list { display: grid; gap: 6px; }
    .nav-item { width: 100%; min-height: 46px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 8px; text-align: left; background: transparent; color: #e6edf5; border-color: transparent; padding: 8px 10px; }
    .nav-item:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.08); }
    .nav-item.active { background: #243449; border-color: rgba(255,255,255,.16); }
    .nav-item strong { display: block; font-size: 14px; }
    .nav-item small { display: block; color: #a9b7c7; margin-top: 2px; }
    .nav-separator { height: 1px; background: rgba(255,255,255,.12); margin: 4px 8px; }
    .sidebar-foot { display: grid; gap: 8px; }
    .sidebar-foot button { width: 100%; color: #e6edf5; border-color: rgba(255,255,255,.16); }
    .app-version { color: #a9b7c7; font-size: 12px; padding: 4px 8px; }
    .app-version strong { color: #e6edf5; }

    .content { padding: 20px; display: grid; gap: 16px; align-content: start; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .title-block h2 { margin: 0; font-size: 24px; letter-spacing: 0; }
    .title-block p { margin: 5px 0 0; color: var(--muted); }
    .top-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .live-dot { width: 9px; height: 9px; border-radius: 50%; background: #12b76a; display: inline-block; box-shadow: 0 0 0 4px rgba(18,183,106,.12); }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .metric { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-height: 82px; }
    .metric span { display: block; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 6px; font-size: 27px; letter-spacing: 0; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .panel-head { min-height: 54px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--surface-soft); }
    .panel-head h3 { margin: 0; font-size: 16px; }
    .panel-body { padding: 16px; }
    .connector-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr); gap: 16px; align-items: start; }
    .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
    .tab { background: transparent; }
    .tab.active { background: #fff; border-color: var(--line-strong); font-weight: 800; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .full { grid-column: 1 / -1; }
    .row-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .status-line { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .status-box { border: 1px solid var(--line); background: var(--surface-soft); border-radius: 8px; padding: 12px; min-height: 70px; }
    .status-box span { display: block; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; }
    .status-box strong { display: block; margin-top: 6px; font-size: 16px; overflow-wrap: anywhere; }
    .notice { border: 1px solid var(--line); border-radius: 8px; padding: 11px 12px; background: #fff; color: var(--muted); min-height: 42px; }
    .notice.ok { border-color: #9ed9c3; background: #f0fdf4; color: var(--ok); }
    .notice.err { border-color: #f4b5b0; background: #fff6f5; color: var(--danger); }
    .notice.warn { border-color: #fedf89; background: #fffbeb; color: var(--warn); }
    .badge { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #e5e7eb; color: #344054; font-size: 12px; font-weight: 800; }
    .badge.active, .badge.ok, .badge.sent, .badge.dry_run { background: #d1fadf; color: #05603a; }
    .badge.paused, .badge.failed, .badge.error { background: #fee4e2; color: #b42318; }
    .badge.unknown, .badge.selected, .badge.queued, .badge.processing { background: #dbeafe; color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 11px 12px; text-align: left; border-bottom: 1px solid #e6ebf1; font-size: 13px; vertical-align: middle; }
    th { color: #344054; background: var(--surface-soft); font-size: 12px; text-transform: uppercase; }
    tr:last-child td { border-bottom: 0; }
    .muted { color: var(--muted); }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .hidden { display: none !important; }

    @media (max-width: 1060px) {
      .app { grid-template-columns: 1fr; }
      .sidebar { position: static; }
      .connector-layout, .metrics, .status-line { grid-template-columns: 1fr; }
    }
    @media (max-width: 720px) {
      .content { padding: 14px; }
      .form-grid { grid-template-columns: 1fr; }
      .topbar { align-items: flex-start; flex-direction: column; }
    }
  </style>
</head>
<body>
  <main>
    <section id="loginScreen" class="login-screen">
      <form id="loginForm" class="login-card">
        <div class="login-head">
          <h1>WhatsApp Router</h1>
          <p>Informe a chave da API para administrar conectores.</p>
        </div>
        <div class="login-body">
          <label>X-Router-Key <input id="loginKey" class="mono" type="password" autocomplete="current-password" required></label>
          <button class="primary" type="submit">Entrar</button>
          <div id="loginNotice" class="notice hidden"></div>
        </div>
      </form>
    </section>

    <section id="appScreen" class="app hidden">
      <aside class="sidebar">
        <div class="brand">
          <h1>WhatsApp Router</h1>
          <p>Conectores, saúde e envio de teste</p>
        </div>
        <div>
          <div class="side-section-title">Conectores</div>
          <div id="connectorNav" class="nav-list"></div>
        </div>
        <div></div>
        <div class="sidebar-foot">
          <div class="app-version">Versão <strong id="appVersion">-</strong></div>
          <button id="newConnector" class="ghost" type="button">Novo Conector</button>
          <button id="logout" class="ghost" type="button">Sair</button>
        </div>
      </aside>

      <section class="content">
        <div class="topbar">
          <div class="title-block">
            <h2 id="pageTitle">Admin</h2>
            <p id="pageSubtitle">Carregando conectores...</p>
          </div>
          <div class="top-actions">
            <span class="muted"><span class="live-dot"></span> <span id="lastRefresh">tempo real</span></span>
            <button id="refresh" class="blue" type="button">Atualizar</button>
          </div>
        </div>

        <section class="metrics">
          <div class="metric"><span>Instâncias</span><strong id="mTotal">-</strong></div>
          <div class="metric"><span>Ativas</span><strong id="mActive">-</strong></div>
          <div class="metric"><span>Mensagens</span><strong id="mMessages">-</strong></div>
          <div class="metric"><span>Serviço</span><strong id="mService">-</strong></div>
        </section>

        <div id="notice" class="notice">Pronto.</div>

        <section id="realtimeView" class="panel hidden">
          <div class="panel-head">
            <h3>Últimas mensagens</h3>
            <div class="row-actions">
              <select id="messageFilter" style="width: 190px;">
                <option value="all">Todos os status</option>
                <option value="sent">Enviado</option>
                <option value="failed">Erro</option>
                <option value="dry_run">Teste</option>
              </select>
            </div>
          </div>
          <table>
            <thead><tr><th>Data</th><th>Destino</th><th>Status</th><th>Origem</th><th>Conector</th><th>API</th><th>Tentativas</th><th>Erro</th></tr></thead>
            <tbody id="globalMessagesRows"></tbody>
          </table>
        </section>

        <section id="connectorSection" class="connector-layout">
          <div class="panel">
            <div class="panel-head">
              <h3 id="connectorHeading">Configuração</h3>
              <div class="tabs">
                <button class="tab active" data-view="config" type="button">Configuração</button>
                <button class="tab" data-view="test" type="button">Teste</button>
                <button class="tab" data-view="messages" type="button">Mensagens</button>
              </div>
            </div>

            <div id="configView" class="panel-body">
              <form id="instanceForm" class="form-grid">
                <input type="hidden" id="instanceId">
                <label>Nome <input id="name" required placeholder="vendas-01"></label>
                <label>API <select id="provider" required></select></label>
                <label class="full">Base URL <input id="base_url" required placeholder="https://api.exemplo.com"></label>
                <label class="full">Token/API Key <input id="api_key" type="password" placeholder="mantém token atual se vazio"></label>
                <label>Sessão <input id="session" placeholder="default"></label>
                <label>Instância <input id="instance" placeholder="minha-instancia"></label>
                <label>Limite/dia <input id="daily_limit" type="number" min="1" value="50"></label>
                <label>Intervalo mínimo <input id="min_seconds_between_messages" type="number" min="0" value="60"></label>
                <label class="full">Send path <input id="send_path" placeholder="padrão da API"></label>
                <label class="full">Health path <input id="health_path" placeholder="padrão da API"></label>
                <label class="full">Notas <textarea id="notes"></textarea></label>
                <div class="full row-actions">
                  <button class="primary" type="submit">Salvar</button>
                  <button id="healthBtn" type="button">Health</button>
                  <button id="pauseBtn" type="button">Pausar</button>
                  <button id="deleteBtn" class="danger" type="button">Excluir</button>
                </div>
              </form>
            </div>

            <div id="testView" class="panel-body hidden">
              <form id="sendForm" class="form-grid">
                <label class="full">Destino <input id="sendTo" required placeholder="5599999999999"></label>
                <label class="full">Mensagem <textarea id="sendMessage" required>Teste do WhatsApp Router</textarea></label>
                <label>Origem <input id="sendSource" value="admin"></label>
                <label>Modo <select id="sendMode"><option value="dry">Teste</option><option value="real">Envio real</option></select></label>
                <div class="full row-actions">
                  <button class="primary" type="submit">Enviar pelo Conector</button>
                </div>
              </form>
            </div>

            <div id="messagesView" class="hidden">
              <table>
                <thead><tr><th>Data</th><th>Destino</th><th>Status</th><th>Origem</th><th>Conector</th><th>Tentativas</th><th>Erro</th></tr></thead>
                <tbody id="messagesRows"></tbody>
              </table>
            </div>
          </div>

          <aside class="panel">
            <div class="panel-head"><h3>Status</h3></div>
            <div class="panel-body">
              <div class="status-line">
                <div class="status-box"><span>Status</span><strong id="sStatus">-</strong></div>
                <div class="status-box"><span>Saúde</span><strong id="sHealth">-</strong></div>
                <div class="status-box"><span>Uso Hoje</span><strong id="sUsage">-</strong></div>
              </div>
              <div style="height:12px"></div>
              <div class="status-line">
                <div class="status-box"><span>API</span><strong id="sProvider">-</strong></div>
                <div class="status-box"><span>Último Envio</span><strong id="sLastSent">-</strong></div>
                <div class="status-box"><span>Tecnologia</span><strong id="sEngine">-</strong></div>
              </div>
              <div style="height:12px"></div>
              <div id="lastErrorBox" class="notice">Sem erro recente.</div>
            </div>
          </aside>
        </section>
      </section>
    </section>
  </main>

  <script>
    const providers = [
      { id: 'uazapi', name: 'uazapiGO', base_url: 'https://seu-subdominio.uazapi.com', send_path: '/send/text', health_path: '/instance/status', session: '', instance: '' },
      { id: 'waha', name: 'WAHA', base_url: 'https://waha.seudominio.com', send_path: '/api/sendText', health_path: '/api/sessions/default', session: 'default', instance: '' },
      { id: 'evolution_go', name: 'Evolution Go', base_url: 'https://evolution-go.seudominio.com', send_path: '/send/text', health_path: '/instance/status', session: '', instance: '' },
      { id: 'evolution_api', name: 'Evolution API', base_url: 'https://evolution.seudominio.com', send_path: '', health_path: '', session: '', instance: 'minha-instancia' }
    ];

    const state = { instances: [], messages: [], health: null, selectedId: null, view: 'config', page: 'realtime', refreshing: false, formDirty: false };
    const $ = (id) => document.getElementById(id);
    const basePath = window.location.pathname.startsWith('/v1') ? '/v1' : '';

    function key() { return localStorage.getItem('routerKey') || ''; }
    function selected() { return state.instances.find((item) => item.id === state.selectedId) || null; }
    function providerMeta(id) { return providers.find((item) => item.id === id) || providers[0]; }

    function setNotice(text, kind = '') {
      $('notice').className = 'notice ' + kind;
      $('notice').textContent = text;
    }

    function setLoginNotice(text) {
      $('loginNotice').className = 'notice err';
      $('loginNotice').textContent = text;
    }

    function readableError(data) {
      if (!data) return '';
      if (typeof data === 'string') return data;
      const source = data.error || data.message || data;
      if (typeof source === 'string') return source;
      return source.message || source.data?.exception?.message || source.data?.error || source.data?.message || JSON.stringify(source);
    }

    async function api(path, options = {}) {
      const headers = { 'X-Router-Key': key(), ...(options.headers || {}) };
      if (options.body) headers['Content-Type'] = 'application/json';
      const response = await fetch(basePath + '/api' + path, { ...options, headers });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readableError(data) || 'HTTP ' + response.status);
      return data;
    }

    async function publicGet(path) {
      const response = await fetch(basePath + path);
      return response.json();
    }

    async function boot() {
      if (!key()) {
        $('loginScreen').classList.remove('hidden');
        $('appScreen').classList.add('hidden');
        return;
      }
      $('loginScreen').classList.add('hidden');
      $('appScreen').classList.remove('hidden');
      await loadAll();
    }

    async function loadAll() {
      state.refreshing = true;
      state.health = await publicGet('/health');
      state.instances = await api('/instances');
      state.messages = await api('/messages?limit=120');
      if (!state.selectedId && state.instances.length) state.selectedId = state.instances[0].id;
      if (state.selectedId && !state.instances.some((item) => item.id === state.selectedId)) {
        state.selectedId = state.instances[0]?.id || null;
      }
      render();
      $('lastRefresh').textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      state.refreshing = false;
      setNotice('Admin conectado.', 'ok');
    }

    async function refreshSilently() {
      if (state.refreshing || $('appScreen').classList.contains('hidden')) return;
      try {
        state.health = await publicGet('/health');
        state.instances = await api('/instances');
        state.messages = await api('/messages?limit=120');
        renderMetrics();
        renderNav();
        renderSelected();
        renderMessages();
        renderGlobalMessages();
        renderPage();
        $('lastRefresh').textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (error) {
        $('lastRefresh').textContent = 'falha ao atualizar';
      }
    }

    function render() {
      renderMetrics();
      renderNav();
      renderProviderSelect();
      renderSelected();
      renderMessages();
      renderGlobalMessages();
      renderView();
      renderPage();
    }

    function renderMetrics() {
      $('mTotal').textContent = state.health?.instances?.total ?? '-';
      $('mActive').textContent = state.health?.instances?.active ?? '-';
      $('mMessages').textContent = state.health?.messages?.total ?? '-';
      const pending = state.health?.queue?.pending ?? 0;
      const running = state.health?.queue?.running ? 1 : 0;
      $('mService').textContent = state.health?.ok ? 'OK · fila ' + (pending + running) : '-';
      $('appVersion').textContent = state.health?.version || '-';
    }

    function renderNav() {
      $('connectorNav').innerHTML =
        '<button type="button" class="nav-item ' + (state.page === 'realtime' ? 'active' : '') + '" data-page="realtime">' +
        '<span><strong>Tempo real</strong><small>Últimas mensagens</small></span><span class="badge ok">' + state.messages.length + '</span></button>' +
        '<div class="nav-separator"></div>' +
        state.instances.map((item) => (
        '<button type="button" class="nav-item ' + (state.page === 'connector' && item.id === state.selectedId ? 'active' : '') + '" data-id="' + item.id + '">' +
        '<span><strong>' + item.name + '</strong><small>' + item.provider + '</small></span>' + badge(item.health) + '</button>'
      )).join('');
      document.querySelectorAll('[data-page="realtime"]').forEach((button) => {
        button.onclick = () => { state.page = 'realtime'; render(); };
      });
      document.querySelectorAll('[data-id]').forEach((button) => {
        button.onclick = () => { state.page = 'connector'; state.selectedId = button.dataset.id; state.formDirty = false; render(); };
      });
    }

    function renderProviderSelect() {
      const current = $('provider').value;
      $('provider').innerHTML = providers.map((provider) => '<option value="' + provider.id + '">' + provider.name + '</option>').join('');
      if (current && providers.some((provider) => provider.id === current)) {
        $('provider').value = current;
      }
      $('provider').onchange = () => {
        const meta = providerMeta($('provider').value);
        $('base_url').placeholder = meta.base_url;
        $('send_path').placeholder = meta.send_path || 'padrão da API';
        $('health_path').placeholder = meta.health_path || 'padrão da API';
        if (!$('session').value) $('session').value = meta.session;
        if (!$('instance').value) $('instance').value = meta.instance;
      };
    }

    function renderSelected() {
      const item = selected();
      const isNew = !item;
      $('pageTitle').textContent = item ? item.name : 'Novo Conector';
      $('pageSubtitle').textContent = item ? providerMeta(item.provider).name + ' · ' + item.base_url : 'Cadastre uma API para começar.';
      $('connectorHeading').textContent = item ? 'Configuração de ' + item.name : 'Novo Conector';

      if (!state.formDirty) {
        $('instanceId').value = item?.id || '';
        $('name').value = item?.name || '';
        $('provider').value = item?.provider || 'uazapi';
        $('base_url').value = item?.base_url || '';
        $('api_key').value = '';
        $('api_key').required = isNew;
        $('session').value = item?.session || providerMeta($('provider').value).session || '';
        $('instance').value = item?.instance || providerMeta($('provider').value).instance || '';
        $('daily_limit').value = item?.daily_limit || 50;
        $('min_seconds_between_messages').value = item?.min_seconds_between_messages || 60;
        $('send_path').value = item?.send_path || '';
        $('health_path').value = item?.health_path || '';
        $('notes').value = item?.notes || '';
        $('provider').onchange();
      }

      $('sStatus').innerHTML = item ? badge(item.status) : '-';
      $('sHealth').innerHTML = item ? badge(item.health) : '-';
      $('sUsage').textContent = item ? item.daily_sent_count + '/' + item.daily_limit : '-';
      $('sProvider').textContent = item?.provider || '-';
      $('sLastSent').textContent = formatDateTime(item?.last_sent_at);
      $('sEngine').textContent = item?.engine || '-';
      $('lastErrorBox').className = item?.last_error ? 'notice err' : 'notice';
      $('lastErrorBox').textContent = item?.last_error ? messageError({ error: item.last_error }) : 'Sem erro recente.';
      $('pauseBtn').textContent = item?.status === 'active' ? 'Pausar' : 'Ativar';
      $('healthBtn').disabled = isNew;
      $('pauseBtn').disabled = isNew;
      $('deleteBtn').disabled = isNew;
      $('sendForm').querySelector('button').disabled = isNew;
    }

    function messageError(item) {
      if (!item.error) return attemptErrors(item);
      if (Array.isArray(item.error.rejected) && item.error.rejected.length) {
        return item.error.rejected.map((rejected) => rejected.name + ': ' + reasonLabel(rejected.reason)).join(' / ');
      }
      return item.error.message || item.error.data?.exception?.message || item.error.data?.error || item.error.data?.message || JSON.stringify(item.error);
    }

    function attemptErrors(item) {
      if (!Array.isArray(item.attempts) || item.attempts.length === 0) return '-';
      const failures = item.attempts.filter((attempt) => attempt.error);
      if (failures.length === 0) return '-';
      return failures.map((attempt) => {
        const name = attempt.instance_name || attempt.provider || attempt.instance_id || '-';
        return name + ': ' + errorText(attempt.error);
      }).join(' / ');
    }

    function errorText(error) {
      if (!error) return '-';
      if (Array.isArray(error.rejected) && error.rejected.length) {
        return error.rejected.map((rejected) => rejected.name + ': ' + reasonLabel(rejected.reason)).join(' / ');
      }
      return error.message || error.data?.exception?.message || error.data?.error || error.data?.message || JSON.stringify(error);
    }

    function reasonLabel(reason) {
      if (!reason) return '-';
      const text = String(reason);
      if (text.startsWith('cooldown ate ')) {
        return 'em cooldown até ' + formatDateTime(text.replace('cooldown ate ', ''));
      }
      if (text.startsWith('intervalo minimo ')) return 'aguardando intervalo mínimo de ' + text.replace('intervalo minimo ', '');
      if (text.startsWith('limite diario ')) return 'limite diário ' + text.replace('limite diario ', '');
      if (text.startsWith('status=')) return 'status ' + statusLabel(text.replace('status=', ''));
      if (text === 'api_key ausente') return 'token ausente';
      if (text === 'base_url ausente') return 'URL da API ausente';
      if (text === 'instancia nao encontrada') return 'instância não encontrada';
      if (text === 'tentativa anterior falhou') return 'tentativa anterior falhou';
      return text;
    }

    function statusLabel(status) {
      return {
        active: 'Ativo',
        paused: 'Pausado',
        ok: 'OK',
        error: 'Erro',
        unknown: 'Desconhecido',
        selected: 'Selecionado',
        queued: 'Na fila',
        processing: 'Processando',
        sent: 'Enviado',
        failed: 'Erro',
        dry_run: 'Teste'
      }[status] || status || '-';
    }

    function badge(status) {
      return '<span class="badge ' + (status || 'unknown') + '">' + statusLabel(status) + '</span>';
    }

    function formatDateTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }

    function connectorName(item) {
      const connector = state.instances.find((instance) => instance.id === item.selected_instance_id);
      return connector?.name || item.selected_instance_id || '-';
    }

    function attemptSummary(item) {
      if (!Array.isArray(item.attempts) || item.attempts.length === 0) return '-';
      return item.attempts.map((attempt) => {
        const name = attempt.instance_name || attempt.provider || attempt.instance_id || '-';
        return name + ': ' + statusLabel(attempt.status);
      }).join(' / ');
    }

    function renderMessages() {
      const id = state.selectedId;
      const rows = state.messages.filter((item) => !id || item.selected_instance_id === id || item.provider === selected()?.provider).slice(0, 40);
      $('messagesRows').innerHTML = rows.map((item) => (
        '<tr><td>' + formatDateTime(item.created_at) + '</td><td class="mono">' + item.to + '</td><td>' + badge(item.status) + '</td><td>' + (item.source || '-') + '</td><td>' + connectorName(item) + '</td><td>' + attemptSummary(item) + '</td><td class="muted">' + messageError(item) + '</td></tr>'
      )).join('') || '<tr><td colspan="7" class="muted">Nenhuma mensagem deste conector.</td></tr>';
    }

    function renderGlobalMessages() {
      const filter = $('messageFilter')?.value || 'all';
      const rows = state.messages
        .filter((item) => filter === 'all' || item.status === filter)
        .slice(0, 80);
      $('globalMessagesRows').innerHTML = rows.map((item) => (
        '<tr><td>' + formatDateTime(item.created_at) + '</td><td class="mono">' + item.to + '</td><td>' + badge(item.status) + '</td><td>' + (item.source || '-') + '</td><td>' + connectorName(item) + '</td><td>' + (item.provider || '-') + '</td><td>' + attemptSummary(item) + '</td><td class="muted">' + messageError(item) + '</td></tr>'
      )).join('') || '<tr><td colspan="8" class="muted">Nenhuma mensagem encontrada.</td></tr>';
    }

    function renderView() {
      document.querySelectorAll('.tab').forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));
      $('configView').classList.toggle('hidden', state.view !== 'config');
      $('testView').classList.toggle('hidden', state.view !== 'test');
      $('messagesView').classList.toggle('hidden', state.view !== 'messages');
    }

    function renderPage() {
      $('realtimeView').classList.toggle('hidden', state.page !== 'realtime');
      $('connectorSection').classList.toggle('hidden', state.page !== 'connector');
      if (state.page === 'realtime') {
        $('pageTitle').textContent = 'Tempo real';
        $('pageSubtitle').textContent = 'Últimas mensagens de todos os conectores e origens.';
      }
    }

    function formData() {
      const existing = selected();
      const data = {
        id: $('instanceId').value || undefined,
        name: $('name').value.trim(),
        provider: $('provider').value,
        base_url: $('base_url').value.trim(),
        api_key: $('api_key').value.trim(),
        session: $('session').value.trim(),
        instance: $('instance').value.trim(),
        daily_limit: Number($('daily_limit').value || 50),
        min_seconds_between_messages: Number($('min_seconds_between_messages').value || 60),
        send_path: $('send_path').value.trim(),
        health_path: $('health_path').value.trim(),
        notes: $('notes').value.trim()
      };
      if (existing && !data.api_key) delete data.api_key;
      return data;
    }

    function newConnector() {
      state.selectedId = null;
      state.view = 'config';
      state.page = 'connector';
      state.formDirty = false;
      render();
      setNotice('Novo conector.', '');
    }

    $('loginForm').onsubmit = async (event) => {
      event.preventDefault();
      localStorage.setItem('routerKey', $('loginKey').value.trim());
      try {
        await boot();
      } catch (error) {
        localStorage.removeItem('routerKey');
        setLoginNotice(error.message);
      }
    };

    $('logout').onclick = () => {
      localStorage.removeItem('routerKey');
      location.reload();
    };

    $('refresh').onclick = () => loadAll().catch((error) => setNotice(error.message, 'err'));
    $('newConnector').onclick = newConnector;
    $('messageFilter').onchange = renderGlobalMessages;
    $('instanceForm').addEventListener('input', () => { state.formDirty = true; });
    $('instanceForm').addEventListener('change', () => { state.formDirty = true; });

    document.querySelectorAll('.tab').forEach((button) => {
      button.onclick = () => { state.view = button.dataset.view; renderView(); };
    });

    $('instanceForm').onsubmit = async (event) => {
      event.preventDefault();
      setNotice('Salvando...', '');
      try {
        const saved = await api('/instances', { method: 'POST', body: JSON.stringify(formData()) });
        state.selectedId = saved.id;
        state.formDirty = false;
        await loadAll();
        setNotice('Conector salvo.', 'ok');
      } catch (error) {
        setNotice(error.message, 'err');
      }
    };

    $('healthBtn').onclick = async () => {
      const item = selected();
      if (!item) return;
      setNotice('Consultando health...', '');
      try {
        await api('/instances/' + item.id + '/health-check', { method: 'POST' });
        await loadAll();
        setNotice('Health OK.', 'ok');
      } catch (error) {
        await loadAll().catch(() => {});
        setNotice(error.message, 'err');
      }
    };

    $('pauseBtn').onclick = async () => {
      const item = selected();
      if (!item) return;
      await api('/instances/' + item.id + '/' + (item.status === 'active' ? 'pause' : 'resume'), { method: 'POST' });
      await loadAll();
    };

    $('deleteBtn').onclick = async () => {
      const item = selected();
      if (!item || !confirm('Excluir ' + item.name + '?')) return;
      await api('/instances/' + item.id, { method: 'DELETE' });
      state.selectedId = null;
      await loadAll();
    };

    $('sendForm').onsubmit = async (event) => {
      event.preventDefault();
      const item = selected();
      if (!item) return;
      const payload = {
        to: $('sendTo').value.trim(),
        message: $('sendMessage').value,
        source: $('sendSource').value.trim() || 'admin',
        dry_run: $('sendMode').value === 'dry',
        instance_id: item.id
      };
      setNotice('Enviando...', '');
      try {
        const result = await api('/send', { method: 'POST', body: JSON.stringify(payload) });
        await loadAll();
        setNotice('Mensagem: ' + statusLabel(result.status) + '.', 'ok');
      } catch (error) {
        await loadAll().catch(() => {});
        const latest = state.messages[0];
        setNotice(latest?.error ? messageError(latest) : error.message, 'err');
      }
    };

    boot().catch((error) => {
      localStorage.removeItem('routerKey');
      $('loginScreen').classList.remove('hidden');
      $('appScreen').classList.add('hidden');
      setLoginNotice(error.message);
    });

    setInterval(refreshSilently, 8000);
  </script>
</body>
</html>`;
}
