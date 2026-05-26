# WhatsApp Router

MVP de roteamento para múltiplas instâncias/provedores de WhatsApp.

Providers iniciais:

- `uazapi`
- `waha`
- `evolution_go`
- `evolution_api`

## Rodar

```bash
npm install
cp .env.example .env
npm start
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
    "fallback_allowed": true,
    "external_id": "pedido-123"
  }'
```

Use `dry_run=true` para testar o seletor sem enviar mensagem real.

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
- `failover=true`: se o conector escolhido falhar sem resposta HTTP do provider, o router tenta o próximo conector elegível.
- `failover_mode=aggressive`: também retenta erro HTTP 5xx. Use com cuidado, porque algumas APIs podem responder 500 mesmo depois de enviar a mensagem.
