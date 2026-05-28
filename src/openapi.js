export function openApiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "WhatsApp Router V3 API",
      version: "3.0.0",
      description: "API multiusuário com workspaces, API keys por cliente, cadastro por código WhatsApp via n8n e envio roteado por conectores isolados."
    },
    externalDocs: {
      description: "Documentação completa",
      url: "/docs"
    },
    servers: [
      { url: "https://multiapi.tectonny.com.br", description: "Produção V3" },
      { url: "http://127.0.0.1:3027", description: "Local V3" }
    ],
    security: [{ RouterKey: [] }],
    components: {
      securitySchemes: {
        RouterKey: {
          type: "apiKey",
          in: "header",
          name: "X-Router-Key",
          description: "API key do workspace, gerada no admin ou no cadastro por código."
        },
        AdminKey: {
          type: "apiKey",
          in: "header",
          name: "X-Admin-Key",
          description: "Chave ADMIN_KEY para rotas de administração."
        }
      },
      schemas: {
        SendMessageRequest: {
          type: "object",
          required: ["to"],
          properties: {
            to: { type: "string", example: "5511999999999" },
            message: { type: "string", example: "Mensagem enviada pelo Swagger" },
            text: { type: "string", example: "Alias de message" },
            source: { type: "string", example: "n8n" },
            queue: { type: "boolean", example: true },
            dry_run: { type: "boolean", example: false },
            connector_id: { type: "string" },
            failover: { type: "boolean", example: true },
            failover_mode: { type: "string", enum: ["safe", "aggressive"], example: "safe" },
            external_id: { type: "string", example: "pedido-123" }
          }
        },
        RequestCodeRequest: {
          type: "object",
          required: ["phone"],
          properties: {
            phone: { type: "string", example: "5511999999999" },
            name: { type: "string", example: "Cliente" }
          }
        },
        VerifyCodeRequest: {
          type: "object",
          required: ["phone", "code"],
          properties: {
            phone: { type: "string", example: "5511999999999" },
            code: { type: "string", example: "123456" },
            name: { type: "string", example: "Cliente" },
            workspace_name: { type: "string", example: "Empresa do Cliente" }
          }
        }
      }
    },
    paths: {
      "/api/auth/request-code": {
        post: {
          summary: "Solicitar código WhatsApp",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/RequestCodeRequest" } }
            }
          },
          responses: {
            200: { description: "Código criado e enviado ao webhook n8n quando configurado." }
          }
        }
      },
      "/api/auth/verify-code": {
        post: {
          summary: "Validar código e criar workspace",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/VerifyCodeRequest" } }
            }
          },
          responses: {
            200: { description: "Usuário/workspace criados. A API key é retornada uma única vez." }
          }
        }
      },
      "/api/send": {
        post: {
          summary: "Enviar mensagem pelo workspace autenticado",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SendMessageRequest" } }
            }
          },
          responses: {
            200: { description: "Mensagem enviada ou dry_run executado." },
            202: { description: "Mensagem colocada na fila." },
            409: { description: "Nenhuma instância elegível." }
          }
        }
      },
      "/api/me": {
        get: {
          summary: "Ver workspace da API key atual",
          responses: { 200: { description: "Workspace e chave atual." } }
        }
      },
      "/api/instances": {
        get: {
          summary: "Listar conectores do workspace",
          responses: { 200: { description: "Conectores." } }
        },
        post: {
          summary: "Cadastrar conector no workspace",
          responses: { 201: { description: "Conector cadastrado." } }
        }
      },
      "/api/messages": {
        get: {
          summary: "Listar mensagens do workspace",
          responses: { 200: { description: "Mensagens." } }
        }
      },
      "/api/admin/overview": {
        get: {
          summary: "Visão geral admin",
          security: [{ AdminKey: [] }],
          responses: { 200: { description: "Usuários, workspaces, chaves e exemplos." } }
        }
      },
      "/api/admin/settings": {
        put: {
          summary: "Configurar webhook n8n do código",
          security: [{ AdminKey: [] }],
          responses: { 200: { description: "Configuração salva." } }
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
  <title>WhatsApp Router V3 Swagger</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>`;
}
