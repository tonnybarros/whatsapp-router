# WhatsApp Router

MVP de roteamento para múltiplas instâncias/provedores de WhatsApp.

Providers suportados:

- `uazapi`
- `waha`
- `evolution_go`
- `evolution_api`
- `custom`

## Versões

- `main` + tag `v1.0.0-basic`: versão básica estável usando JSON em arquivo.
- branch `v2-postgres`: versão 2.0 com suporte a PostgreSQL.

Na V2, o Router usa PostgreSQL quando `DATABASE_URL` está configurado. Sem `DATABASE_URL`, ele ainda roda com JSON para desenvolvimento e migração.

## Qual instalacao escolher?

Para uma VPS/LXC simples, a melhor opcao costuma ser **sem Docker, usando Node.js + PM2**. Fica facil ver logs, editar `.env`, reiniciar o servico e integrar com Caddy/Nginx.

Use **Docker/Compose** se voce quer isolar a aplicacao, padronizar deploy ou rodar em um servidor onde tudo ja e containerizado.

Minha recomendacao para producao:

1. **VPS ou LXC pequeno/medio**: use Node.js + PM2.
2. **Servidor que ja roda varios containers**: use Docker Compose.
3. **Ambiente local para desenvolvimento**: use `npm run dev`.

Resumo rapido:

| Cenario | Recomendacao |
| --- | --- |
| VPS/LXC dedicado, um unico Router | Node.js + PM2 |
| Servidor com varios containers | Docker Compose |
| Desenvolvimento local | `npm run dev` |
| Producao com HTTPS | Router na porta `3025` + proxy reverso em `443` |

## Instalacao recomendada: Node.js + PM2

Este e o caminho mais simples para instalar em VPS/LXC, principalmente quando voce ja usa Caddy/Nginx no host.

### 1. Requisitos

- Node.js 20 ou superior
- npm
- git
- PM2
- PostgreSQL 14 ou superior para produção na V2
- Um dominio apontando para o servidor, se for publicar com HTTPS

No Ubuntu/Debian, confirme Node/npm e instale o PM2:

```bash
node -v
npm -v
npm install -g pm2
```

Se `node -v` mostrar uma versao antiga, instale Node.js 20 ou superior antes de continuar.

### 2. Baixar o projeto

```bash
cd /var/www
git clone git@github.com:tonnybarros/whatsapp-router.git
cd whatsapp-router
```

Se estiver instalando sem chave SSH do GitHub:

```bash
git clone https://github.com/tonnybarros/whatsapp-router.git
cd whatsapp-router
```

### 3. Instalar dependencias

```bash
npm ci
```

Use `npm ci` em producao porque ele instala exatamente as versoes do `package-lock.json`. Para desenvolvimento local, `npm install` tambem funciona.

### 4. Criar o `.env`

```bash
cp .env.example .env
```

Gere um token forte para proteger a API:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edite o arquivo:

```bash
nano .env
```

Configuracao minima:

```env
PORT=3025
HOST=0.0.0.0
ROUTER_API_KEY=troque-por-um-token-forte
STORE_DRIVER=postgres
DATABASE_URL=postgres://usuario:senha@127.0.0.1:5432/whatsapp_router
DATABASE_SSL=false
DATA_FILE=./data/router.json
DEFAULT_DAILY_LIMIT=50
DEFAULT_MIN_SECONDS_BETWEEN_MESSAGES=60
DEFAULT_ERROR_COOLDOWN_SECONDS=900
SEND_TIMEOUT_MS=30000
QUEUE_POLL_MS=1000
QUEUE_MAX_WAIT_MS=900000
```

Cole o token gerado em `ROUTER_API_KEY`. Esse token e a chave que suas automacoes, n8n e sistemas externos vao enviar no header `X-Router-Key`.

Campos importantes:

| Variavel | Funcao |
| --- | --- |
| `PORT` | Porta HTTP interna do Router. Padrao: `3025`. |
| `HOST` | Use `0.0.0.0` em servidor. Use `127.0.0.1` se apenas proxy local puder acessar. |
| `ROUTER_API_KEY` | Chave exigida no header `X-Router-Key`. Gere uma chave forte. |
| `STORE_DRIVER` | `postgres`, `json` ou `auto`. Na V2, use `postgres` em produção. |
| `DATABASE_URL` | Conexão PostgreSQL. Se estiver vazia e `STORE_DRIVER=auto`, usa JSON. |
| `DATABASE_SSL` | Use `true` quando o PostgreSQL exigir SSL. |
| `DATA_FILE` | Arquivo JSON usado na V1, no modo `json`, ou como origem da migração. |
| `DEFAULT_DAILY_LIMIT` | Limite diario padrao por conector. |
| `DEFAULT_MIN_SECONDS_BETWEEN_MESSAGES` | Intervalo minimo padrao entre mensagens por conector. |
| `DEFAULT_ERROR_COOLDOWN_SECONDS` | Tempo de cooldown quando um provider falha. |
| `SEND_TIMEOUT_MS` | Timeout de envio para as APIs externas. |
| `QUEUE_POLL_MS` | Intervalo base de checagem da fila. |
| `QUEUE_MAX_WAIT_MS` | Tempo maximo que uma mensagem pode esperar na fila. |

### 5. Testar antes de subir em producao

```bash
npm run check
```

Agora inicie temporariamente:

```bash
npm start
```

Em outro terminal, teste:

```bash
curl http://127.0.0.1:3025/health
```

Se respondeu JSON com `"ok": true`, esta funcionando.

### 5.1. Migrar JSON para PostgreSQL

Se você já usava a versão básica com `data/router.json`, configure `DATABASE_URL` no `.env` e rode:

```bash
npm run migrate:postgres
```

Depois deixe no `.env`:

```env
STORE_DRIVER=postgres
```

O comando cria as tabelas automaticamente e copia conectores, mensagens e eventos do JSON para o PostgreSQL.

### 6. Rodar com PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 status
```

Logs:

```bash
pm2 logs whatsapp-router
```

Reiniciar apos alteracoes:

```bash
pm2 restart whatsapp-router --update-env
```

Subir automaticamente apos reboot do servidor:

```bash
pm2 startup
pm2 save
```

O comando `pm2 startup` normalmente mostra uma linha extra para executar com `sudo`. Copie e execute a linha que ele mostrar.

### 7. Publicar com HTTPS

O Router nao precisa escutar direto na porta `443`. O recomendado e deixar o Router em `3025` e usar Caddy/Nginx como proxy reverso.

Exemplo Caddy:

```caddy
api.seudominio.com.br {
  reverse_proxy 127.0.0.1:3025
}
```

Exemplo Nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name api.seudominio.com.br;

  location / {
    proxy_pass http://127.0.0.1:3025;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 8. Primeiro acesso

- Admin: `https://api.seudominio.com.br/admin`
- Docs: `https://api.seudominio.com.br/docs`
- Swagger: `https://api.seudominio.com.br/swagger`
- Health: `https://api.seudominio.com.br/health`

No admin, entre usando o valor de `ROUTER_API_KEY`.

Depois disso:

1. Crie um conector para cada API/numero.
2. Use o teste com `dry_run` primeiro, para validar selecao sem enviar mensagem real.
3. Envie um teste real.
4. Nas suas automacoes, chame `/api/v1/messages/send` com `queue=true`, `failover=true` e `failover_mode=safe`.

### 9. Atualizar sem Docker

```bash
cd /var/www/whatsapp-router
git pull
npm ci
npm run check
pm2 restart whatsapp-router --update-env
```

Se voce instalou em outro diretorio, ajuste o `cd`.

## Publicar V2 no domínio atual e manter V1 em `/v1`

A estratégia recomendada para transição é:

- V2/PostgreSQL em `https://api.tectonny.com.br`
- V1 básica em `https://api.tectonny.com.br/v1`

Exemplo de estrutura no servidor:

```text
/var/www/sse/whatsapp-router       # V2, branch v2-postgres, porta 3025
/var/www/sse/whatsapp-router-v1    # V1, tag v1.0.0-basic, porta 3026
```

Preparar a V1:

```bash
cd /var/www/sse
git clone https://github.com/tonnybarros/whatsapp-router.git whatsapp-router-v1
cd whatsapp-router-v1
git checkout v1.0.0-basic
cp ../whatsapp-router/.env .env
npm ci
PORT=3026 pm2 start src/server.js --name whatsapp-router-v1 --update-env
pm2 save
```

Manter a V2 no domínio raiz:

```bash
cd /var/www/sse/whatsapp-router
git checkout v2-postgres
npm ci
npm run check
pm2 restart whatsapp-router --update-env
```

Os arquivos de exemplo para proxy estão em:

```text
deploy/Caddyfile.api.tectonny.v2-v1
deploy/nginx.api.tectonny.v2-v1.conf
```

Eles enviam `/v1/*` para a porta `3026` e todo o restante para a porta `3025`.

## Instalacao com Docker Compose

Use este caminho se voce prefere container, ou se o servidor ja tem outros servicos em Docker.

### 1. Requisitos

- Docker
- Docker Compose v2
- git

Teste:

```bash
docker --version
docker compose version
```

### 2. Preparar arquivos

```bash
git clone https://github.com/tonnybarros/whatsapp-router.git
cd whatsapp-router
cp .env.example .env
```

Edite o `.env` e defina pelo menos:

```env
ROUTER_API_KEY=troque-por-um-token-forte
PORT=3025
```

Gere o token assim:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Se o servidor nao tiver Node.js fora do Docker, use:

```bash
openssl rand -hex 32
```

No Docker Compose, o projeto ja sobrescreve:

```env
HOST=0.0.0.0
STORE_DRIVER=postgres
DATABASE_URL=postgres://whatsapp_router:whatsapp_router@postgres:5432/whatsapp_router
```

### 3. Subir o container

```bash
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f whatsapp-router
```

Testar:

```bash
curl http://127.0.0.1:3025/health
```

Parar:

```bash
docker compose down
```

Atualizar:

```bash
git pull
docker compose up -d --build
```

Os dados ficam persistidos em:

```text
volume postgres_data
```

Para publicar com HTTPS usando Docker, mantenha o container na porta `3025` e use Caddy/Nginx no host apontando para `127.0.0.1:3025`, igual ao exemplo da instalacao sem Docker.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev
```

## Backup

Faca backup regular do arquivo:

```text
data/router.json
```

Ele contem conectores cadastrados, historico de mensagens e eventos. O `.env` tambem deve ser guardado com seguranca, porque contem `ROUTER_API_KEY`.

Arquivos que voce deve proteger e nunca publicar:

- `.env`
- `data/router.json`

Exemplo simples de backup:

```bash
tar -czf whatsapp-router-backup-$(date +%F).tar.gz .env data/router.json
```

## Autenticação

Todas as rotas `/api/*` exigem:

```http
X-Router-Key: seu-token
```

## Endpoints

```http
GET  /health
GET  /docs
GET  /api/instances
POST /api/instances
GET  /api/messages
POST /api/send
GET  /api/v1/health
GET  /api/v1/connectors
GET  /api/v1/messages
POST /api/v1/messages/send
POST /api/v1/send
POST /api/v1/whatsapp/send
POST /api/instances/:id/pause
POST /api/instances/:id/resume
POST /api/instances/:id/health-check
DELETE /api/instances/:id
```

## Exemplo de instância

```json
{
  "name": "uazapi-vendas-01",
  "provider": "uazapi",
  "base_url": "https://sua-uazapi.com",
  "api_key": "token-da-instancia",
  "daily_limit": 30,
  "min_seconds_between_messages": 90
}
```

## Custom API

Use `provider: "custom"` quando a API de WhatsApp nao for uma das integracoes nativas. O Router continua fazendo a selecao do conector, limites por dia, intervalo minimo, fila, cooldown, failover e historico; a diferenca e que voce informa como montar a chamada HTTP para a sua API.

Campos principais:

| Campo | Funcao |
| --- | --- |
| `provider` | Deve ser `custom`. |
| `base_url` | URL base da API externa, sem o path final. |
| `send_path` | Path chamado no envio. Exemplo: `/send`, `/message/text` ou `/api/whatsapp/send`. |
| `health_path` | Path usado no teste de saude. Se vazio, o Router usa um padrao simples. |
| `api_key` | Token/chave da API externa. Se precisar de Bearer, salve como `Bearer seu-token`. |
| `auth_header` | Nome do header que recebera o `api_key`. Exemplo: `Authorization`, `X-API-Key` ou `apikey`. |
| `custom_headers` | JSON com headers extras. Exemplo: `{"X-Origem":"router"}`. |
| `custom_body_template` | JSON usado como corpo do envio, com placeholders. |

Placeholders disponiveis no `custom_body_template`:

| Placeholder | Valor |
| --- | --- |
| `{{to}}` ou `{{number}}` | Numero de destino normalizado. |
| `{{message}}` ou `{{text}}` | Texto da mensagem. |
| `{{source}}` | Origem informada no envio, como `n8n`, `whazap` ou `admin`. |
| `{{track_id}}` | ID interno da mensagem no Router. |
| `{{external_id}}` | ID externo enviado pela sua aplicacao. |
| `{{session}}` | Valor do campo `session` do conector. |
| `{{instance}}` | Valor do campo `instance` do conector. |

Exemplo de conector customizado:

```json
{
  "name": "api-custom-vendas",
  "provider": "custom",
  "base_url": "https://api.seudominio.com",
  "send_path": "/send",
  "health_path": "/health",
  "auth_header": "Authorization",
  "api_key": "Bearer token-da-api",
  "custom_headers": "{\"X-Origem\":\"router\"}",
  "custom_body_template": "{\"number\":\"{{number}}\",\"text\":\"{{message}}\",\"source\":\"{{source}}\",\"track\":\"{{track_id}}\"}",
  "daily_limit": 30,
  "min_seconds_between_messages": 90
}
```

Com esse template, um envio para `5511999999999` com mensagem `Ola` gera um POST para `https://api.seudominio.com/send` com corpo parecido com:

```json
{
  "number": "5511999999999",
  "text": "Ola",
  "source": "n8n",
  "track": "msg_..."
}
```

## Exemplo de envio

```bash
curl -X POST http://127.0.0.1:3025/api/send \
  -H 'Content-Type: application/json' \
  -H 'X-Router-Key: seu-token' \
  -d '{"to":"5599999999999","message":"Teste do router","dry_run":true}'
```

## Exemplo n8n/API v1

```bash
curl -X POST https://api.tectonny.com.br/api/v1/messages/send \
  -H 'Content-Type: application/json' \
  -H 'X-Router-Key: seu-token' \
  -d '{
    "to": "5599999999999",
    "message": "Mensagem enviada pelo n8n",
    "source": "n8n",
    "dry_run": false,
    "failover": true,
    "connector_id": "opcional-id-do-conector",
    "exclude_connector_ids": ["id-do-conector-que-nao-deve-enviar"],
    "fallback_allowed": true,
    "external_id": "pedido-123"
  }'
```

Use `dry_run=true` para testar o seletor sem enviar mensagem real.

## JSON de envio

Endpoint principal:

```http
POST /api/v1/messages/send
```

Payload recomendado para automacoes:

```json
{
  "to": "5599999999999",
  "message": "Mensagem enviada pelo n8n",
  "source": "n8n",
  "queue": true,
  "failover": true,
  "fallback_allowed": true,
  "failover_mode": "safe",
  "exclude_connector_ids": ["id-do-conector-que-nao-deve-enviar"],
  "external_id": "pedido-123"
}
```

| Campo | Tipo | Obrigatorio | Funcao |
| --- | --- | --- | --- |
| `to` | string | Sim | Destino da mensagem no formato DDI + DDD + numero. Exemplo: `5511999999999`. |
| `message` | string | Sim* | Texto que sera enviado. Aceita quebras de linha. |
| `text` | string | Sim* | Alias de `message`. Use um ou outro. |
| `source` | string | Nao | Origem da chamada para aparecer no painel. Exemplos: `n8n`, `whazap`, `sistema-financeiro`. Padrao: `api`. |
| `queue` | boolean | Nao | Quando `true`, coloca a mensagem na fila e responde `202` rapidamente. Recomendado para lotes e notificacoes. |
| `dry_run` | boolean | Nao | Quando `true`, testa selecao/roteamento sem enviar mensagem real. |
| `connector_id` | string | Nao | Forca uma API/conector especifico. Se vazio, o Router escolhe automaticamente. |
| `instance_id` | string | Nao | Alias legado de `connector_id`. |
| `exclude_connector_ids` | array/string | Nao | Remove um ou mais conectores da rotacao desta mensagem. Aceita array ou texto separado por virgula. |
| `fallback_allowed` | boolean | Nao | Se `connector_id` estiver inelegivel, permite usar outro conector disponivel. |
| `failover` | boolean | Nao | Se uma tentativa falhar de forma segura, tenta outro conector elegivel. |
| `failover_mode` | string | Nao | `safe` evita duplicidade. `aggressive` tambem retenta 5xx, mas pode duplicar se o provider enviou e respondeu erro. |
| `external_id` | string | Nao | ID externo para rastrear a mensagem no seu sistema, como pedido, usuario ou execucao do n8n. |
| `track_id` | string | Nao | Alias legado de `external_id`. |
| `priority` | string | Nao | Campo informativo para futuras regras de prioridade. Hoje fica registrado no historico. |
| `delay` | number | Nao | Enviado ao provider quando ele suporta atraso interno. |
| `linkPreview` | boolean | Nao | Controla preview de links nos providers que suportam essa opcao. |

*Envie `message` ou `text`.

## JSON de resposta

Exemplo de resposta quando usa fila:

```json
{
  "id": "2f4e1f8a-0000-4000-9000-123456789abc",
  "external_id": "pedido-123",
  "to": "5599999999999",
  "message": "Mensagem enviada pelo n8n",
  "source": "n8n",
  "priority": "normal",
  "status": "queued",
  "requested_connector_id": null,
  "selected_instance_id": null,
  "provider": null,
  "dry_run": false,
  "queued": true,
  "fallback_allowed": true,
  "failover": true,
  "failover_mode": "safe",
  "attempts": [],
  "created_at": "2026-05-27T12:00:00.000Z",
  "error": null
}
```

| Campo | Funcao |
| --- | --- |
| `id` | ID interno da mensagem no Router. Tambem e usado como `track_id` para alguns providers. |
| `external_id` | ID enviado pela sua aplicacao para rastrear a mensagem fora do Router. |
| `to` | Destino solicitado. |
| `message` | Texto solicitado. |
| `source` | Origem registrada. |
| `priority` | Prioridade informada ou `normal`. |
| `status` | Estado atual da mensagem. Veja a tabela de status abaixo. |
| `requested_connector_id` | Conector solicitado no payload, quando informado. |
| `excluded_connector_ids` | Conectores removidos da rotacao pelo payload, quando informado. |
| `selected_instance_id` | Conector realmente escolhido para a tentativa atual/final. |
| `provider` | API usada na tentativa final: `uazapi`, `waha`, `evolution_go`, `evolution_api` ou `custom`. |
| `dry_run` | Indica que foi apenas teste sem envio real. |
| `queued` | Indica que a mensagem entrou pela fila. |
| `fallback_allowed` | Mostra se a chamada permitia trocar de conector quando o preferido falhasse ou estivesse inelegivel. |
| `failover` | Mostra se a chamada permitia retentativa em outro conector. |
| `failover_mode` | Modo de failover usado: `safe` ou `aggressive`. |
| `attempts` | Lista de tentativas feitas, com conector, API, status, horario e erro quando houver. |
| `provider_response` | Resposta bruta do provider quando o envio termina com sucesso. Dados sensiveis sao mascarados. |
| `error` | Detalhes do erro quando falha ou quando nao ha conector elegivel. |
| `created_at` | Data/hora UTC de criacao da mensagem. |
| `updated_at` | Data/hora UTC da ultima atualizacao, quando houver. |

## Status da mensagem

| Status | Significado |
| --- | --- |
| `queued` | Entrou na fila e sera processada em segundo plano. |
| `processing` | Worker da fila esta tentando enviar. |
| `selected` | Um conector foi selecionado para envio. Normalmente e estado rapido/intermediario. |
| `sent` | Provider confirmou o envio. |
| `dry_run` | Teste concluido sem envio real. |
| `failed` | Falhou. Veja `error` e `attempts`. |

## Envio em fila

Para lotes, envie `queue=true`. A API responde `202` com status `queued`, e o Router processa em segundo plano escolhendo o próximo conector elegível na hora do envio.

```bash
curl -X POST https://api.tectonny.com.br/api/v1/messages/send \
  -H 'Content-Type: application/json' \
  -H 'X-Router-Key: seu-token' \
  -d '{
    "to": "5599999999999",
    "message": "Mensagem em fila",
    "source": "n8n",
    "queue": true,
    "failover": true,
    "fallback_allowed": true,
    "failover_mode": "safe"
  }'
```

## Failover e fallback

- `fallback_allowed=true`: se você enviar `connector_id` e esse conector estiver pausado, em limite ou inelegível, o router pode usar outro conector elegível.
- `exclude_connector_ids`: usa a rotacao normal, mas ignora os conectores informados. Exemplo: `["id-do-waha"]`.
- `failover=true`: se o conector escolhido falhar sem resposta HTTP do provider, o router tenta o próximo conector elegível.
- `failover_mode=aggressive`: também retenta erro HTTP 5xx. Use com cuidado, porque algumas APIs podem responder 500 mesmo depois de enviar a mensagem.
