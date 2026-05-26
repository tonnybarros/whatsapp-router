export function openApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "WhatsApp Router API",
      version: "1.0.0",
      description: "API para enviar mensagens WhatsApp por conectores uazapi, WAHA, Evolution Go e Evolution API."
    },
    servers: [
      { url: "https://api.tectonny.com.br", description: "Produção" },
      { url: "http://127.0.0.1:3025", description: "Local" }
    ],
    security: [
      { RouterKey: [] },
      { BearerAuth: [] }
    ],
    components: {
      securitySchemes: {
        RouterKey: {
          type: "apiKey",
          in: "header",
          name: "X-Router-Key",
          description: "Use o valor de ROUTER_API_KEY do .env do whatsapp-router."
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Alternativa: Authorization: Bearer ROUTER_API_KEY."
        }
      },
      schemas: {
        SendMessageRequest: {
          type: "object",
          required: ["to"],
          properties: {
            to: {
              type: "string",
              example: "5599999999999",
              description: "Número no formato DDI + DDD + número."
            },
            message: {
              type: "string",
              example: "Mensagem enviada pelo Swagger",
              description: "Texto da mensagem. Também é aceito o campo text."
            },
            text: {
              type: "string",
              example: "Mensagem enviada pelo Swagger",
              description: "Alias de message."
            },
            source: {
              type: "string",
              example: "swagger"
            },
            dry_run: {
              type: "boolean",
              example: true,
              description: "Quando true, valida o seletor sem enviar mensagem real."
            },
            queue: {
              type: "boolean",
              example: false,
              description: "Quando true, coloca a mensagem em fila e retorna 202 imediatamente. O worker envia depois respeitando intervalo, limite diário, cooldown, failover e fallback."
            },
            connector_id: {
              type: "string",
              example: "b5bf0c76-25a6-4b52-8215-1eecaab2d520",
              description: "Opcional. Força o envio por um conector específico."
            },
            fallback_allowed: {
              type: "boolean",
              example: false,
              description: "Quando true e o connector_id preferido estiver inelegível, permite usar outro conector elegível."
            },
            failover: {
              type: "boolean",
              example: false,
              description: "Quando true, tenta outro conector em falhas sem resposta HTTP do provider. Por segurança, HTTP 500 não é reenviado no modo padrão para evitar duplicidade."
            },
            failover_mode: {
              type: "string",
              enum: ["safe", "aggressive"],
              example: "safe",
              description: "Modo aggressive também retenta erros HTTP 5xx, com risco de mensagem duplicada se o provider enviou e respondeu erro."
            },
            external_id: {
              type: "string",
              example: "pedido-123"
            }
          },
          anyOf: [
            { required: ["message"] },
            { required: ["text"] }
          ]
        },
        MessageResponse: {
          type: "object",
          properties: {
            id: { type: "string" },
            external_id: { type: "string", nullable: true },
            to: { type: "string" },
            message: { type: "string" },
            source: { type: "string" },
            status: { type: "string", example: "dry_run" },
            selected_instance_id: { type: "string", nullable: true },
            requested_connector_id: { type: "string", nullable: true },
            provider: { type: "string", nullable: true },
            dry_run: { type: "boolean" },
            queued: { type: "boolean" },
            fallback_allowed: { type: "boolean" },
            failover: { type: "boolean" },
            failover_mode: { type: "string", nullable: true },
            attempts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  instance_id: { type: "string" },
                  instance_name: { type: "string" },
                  provider: { type: "string" },
                  status: { type: "string" },
                  at: { type: "string" },
                  error: { type: "object", nullable: true }
                }
              }
            },
            error: { type: "object", nullable: true }
          }
        },
        Connector: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            provider: { type: "string", enum: ["uazapi", "waha", "evolution_go", "evolution_api"] },
            base_url: { type: "string" },
            status: { type: "string" },
            health: { type: "string" },
            daily_limit: { type: "integer" },
            daily_sent_count: { type: "integer" },
            last_sent_at: { type: "string", nullable: true },
            has_api_key: { type: "boolean" }
          }
        }
      }
    },
    paths: {
      "/api/v1/messages/send": {
        post: {
          tags: ["Messages"],
          summary: "Enviar mensagem",
          description: "Envia mensagem pelo seletor automático ou por um conector específico.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SendMessageRequest" },
                examples: {
                  dryRun: {
                    summary: "Teste sem enviar",
                    value: {
                      to: "5599999999999",
                      message: "Teste dry run pelo Swagger",
                      source: "swagger",
                      dry_run: true
                    }
                  },
                  realSend: {
                    summary: "Envio real",
                    value: {
                      to: "5599999999999",
                      message: "Mensagem real pelo Swagger",
                      source: "swagger",
                      dry_run: false,
                      failover: true
                    }
                  },
                  queuedBatch: {
                    summary: "Enviar por fila",
                    value: {
                      to: "5599999999999",
                      message: "Mensagem em fila pelo Swagger",
                      source: "swagger",
                      queue: true,
                      failover: true,
                      fallback_allowed: true,
                      failover_mode: "safe"
                    }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Mensagem selecionada/enviada ou dry_run executado.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MessageResponse" } } }
            },
            "202": {
              description: "Mensagem entrou na fila.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MessageResponse" } } }
            },
            "409": { description: "Nenhum conector elegível." },
            "422": { description: "Payload inválido ou provider recusou destino." },
            "502": { description: "Falha no provider." }
          }
        }
      },
      "/api/v1/send": {
        post: {
          tags: ["Messages"],
          summary: "Alias curto para envio",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/SendMessageRequest" } } }
          },
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/MessageResponse" } } } }
          }
        }
      },
      "/api/v1/whatsapp/send": {
        post: {
          tags: ["Messages"],
          summary: "Alias descritivo para envio WhatsApp",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/SendMessageRequest" } } }
          },
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/MessageResponse" } } } }
          }
        }
      },
      "/api/v1/connectors": {
        get: {
          tags: ["Connectors"],
          summary: "Listar conectores",
          responses: {
            "200": {
              description: "Lista de conectores cadastrados.",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/Connector" } }
                }
              }
            }
          }
        }
      },
      "/api/v1/messages": {
        get: {
          tags: ["Messages"],
          summary: "Listar mensagens recentes",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 100, maximum: 500 } }
          ],
          responses: {
            "200": {
              description: "Histórico recente.",
              content: {
                "application/json": {
                  schema: { type: "array", items: { $ref: "#/components/schemas/MessageResponse" } }
                }
              }
            }
          }
        }
      },
      "/api/v1/health": {
        get: {
          tags: ["Health"],
          summary: "Status do router",
          responses: {
            "200": { description: "Status geral do serviço." }
          }
        }
      }
    }
  };
}

export function swaggerHtml() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp Router Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #f7f9fc; }
    .topbar { display: none; }
    .swagger-ui .info { margin: 28px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/openapi.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true
    });
  </script>
</body>
</html>`;
}
