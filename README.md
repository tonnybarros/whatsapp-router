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
| `selected_instance_id` | Conector realmente escolhido para a tentativa atual/final. |
| `provider` | API usada na tentativa final: `uazapi`, `waha`, `evolution_go` ou `evolution_api`. |
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
- `failover=true`: se o conector escolhido falhar sem resposta HTTP do provider, o router tenta o próximo conector elegível.
- `failover_mode=aggressive`: também retenta erro HTTP 5xx. Use com cuidado, porque algumas APIs podem responder 500 mesmo depois de enviar a mensagem.
