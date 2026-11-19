/**
 * Gera a página HTML interativa do Swagger UI compatível com Express 5 e Vercel Serverless.
 * Utiliza exclusivamente CDN versionado (`swagger-ui-dist@5.18.2`), sem dependência de
 * leitura/gravação em disco no runtime serverless e sem interpolação de entrada do usuário (AppSec XSS-safe).
 *
 * @param {object} [options]
 * @param {boolean} [options.isApiPrefix=true] Define se a URL da especificação OpenAPI usa o prefixo `/api`
 * @returns {string} HTML completo do Swagger UI
 */
function renderSwaggerUiHtml(options = {}) {
  const isApiPrefix = options.isApiPrefix !== false;
  const specUrl = isApiPrefix ? '/api/docs.json' : '/docs.json';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PersonalController API — Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .pc-swagger-banner {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 20px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
    }
    .pc-swagger-banner strong {
      color: #818cf8;
    }
    .pc-swagger-links {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pc-swagger-links a {
      color: #93c5fd;
      text-decoration: none;
      font-weight: 600;
    }
    .pc-swagger-links a:hover {
      text-decoration: underline;
    }
    .swagger-ui .topbar {
      display: none;
    }
  </style>
</head>
<body>
  <header class="pc-swagger-banner">
    <div>
      <strong>PersonalController OpenAPI 3.0</strong> &mdash; Use <code>POST /auth/login</code> para obter o JWT e clique em <strong>Authorize</strong> para testar rotas protegidas.
    </div>
    <nav class="pc-swagger-links" aria-label="Links auxiliares">
      <a href="${specUrl}" target="_blank" rel="noopener noreferrer">OpenAPI JSON</a>
      <a href="/login">Abrir App (/login)</a>
    </nav>
  </header>
  <main id="swagger-ui"></main>

  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.addEventListener('load', function () {
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout'
      });
    });
  </script>
</body>
</html>`;
}

module.exports = {
  renderSwaggerUiHtml
};
