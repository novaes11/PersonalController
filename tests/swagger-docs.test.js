const request = require('supertest');
const app = require('../server');
const apiHandler = require('../api/index');
const { openApiSpec, buildOpenApiSpec } = require('../src/docs/swagger');
const { renderSwaggerUiHtml } = require('../src/docs/swaggerHtml');
const { resetRateLimitStores } = require('../src/middlewares/rateLimit.middleware');

describe('DX-01 — Documentação Interativa Swagger UI & OpenAPI 3.0', () => {
  const originalSwaggerEnabled = process.env.SWAGGER_ENABLED;

  beforeEach(() => {
    delete process.env.SWAGGER_ENABLED;
    resetRateLimitStores();
  });

  afterAll(() => {
    if (originalSwaggerEnabled === undefined) {
      delete process.env.SWAGGER_ENABLED;
    } else {
      process.env.SWAGGER_ENABLED = originalSwaggerEnabled;
    }
    resetRateLimitStores();
  });

  test('1. GET /api/docs.json, /docs.json e serverless handler retornam OpenAPI 3.0.3 válida', async () => {
    const apiJsonRes = await request(app).get('/api/docs.json');
    expect(apiJsonRes.statusCode).toBe(200);
    expect(apiJsonRes.headers['content-type']).toContain('application/json');
    expect(apiJsonRes.headers['x-ratelimit-limit']).toBeDefined();
    expect(apiJsonRes.body.openapi).toMatch(/^3\.0\.\d+$/);
    expect(apiJsonRes.body.info.title).toBe('PersonalController API');
    expect(apiJsonRes.body.servers.map(s => s.url)).toEqual(expect.arrayContaining(['/api', '/']));
    expect(apiJsonRes.body.components.securitySchemes).toHaveProperty('bearerAuth');
    expect(apiJsonRes.body.components.securitySchemes).toHaveProperty('cronAuth');

    const rootJsonRes = await request(app).get('/docs.json');
    expect(rootJsonRes.statusCode).toBe(200);
    expect(rootJsonRes.body.openapi).toBe(apiJsonRes.body.openapi);

    const serverlessJsonRes = await request(apiHandler).get('/api/index.js/docs.json');
    expect(serverlessJsonRes.statusCode).toBe(200);
    expect(serverlessJsonRes.body.info.title).toBe('PersonalController API');
  });

  test('2. GET /api/docs, /api/docs/, /docs e /docs/ servem HTML do Swagger UI com Bearer Persistente', async () => {
    const apiDocsRes = await request(app).get('/api/docs');
    expect(apiDocsRes.statusCode).toBe(200);
    expect(apiDocsRes.headers['content-type']).toContain('text/html');
    expect(apiDocsRes.text).toContain('SwaggerUIBundle');
    expect(apiDocsRes.text).toContain("url: '/api/docs.json'");
    expect(apiDocsRes.text).toContain('persistAuthorization: true');
    expect(apiDocsRes.text).toContain('swagger-ui-dist@5.18.2');

    const apiDocsSlashRes = await request(app).get('/api/docs/');
    expect(apiDocsSlashRes.statusCode).toBe(200);
    expect(apiDocsSlashRes.text).toContain("url: '/api/docs.json'");

    const rootDocsRes = await request(app).get('/docs');
    expect(rootDocsRes.statusCode).toBe(200);
    expect(rootDocsRes.text).toContain("url: '/docs.json'");

    const vercelRewrittenDocsRes = await request(apiHandler).get('/api/index.js?__path=/api/docs');
    expect(vercelRewrittenDocsRes.statusCode).toBe(200);
    expect(vercelRewrittenDocsRes.text).toContain("url: '/api/docs.json'");
  });

  test('3. Especificação OpenAPI cobre todos os endpoints atuais do PersonalController e segurança JWT', () => {
    const spec = buildOpenApiSpec();
    const expectedRouteMethods = {
      '/': ['get'],
      '/health': ['get'],
      '/auth/signup': ['post'],
      '/auth/login': ['post'],
      '/auth/logout': ['post'],
      '/auth/me': ['get'],
      '/categories': ['get', 'post'],
      '/categories/{id}': ['get', 'put', 'delete'],
      '/transactions': ['get', 'post'],
      '/transactions/parse-pdf': ['post'],
      '/transactions/batch': ['post'],
      '/transactions/{id}': ['get', 'put', 'delete'],
      '/portfolio/consolidated': ['get'],
      '/cron/quotes': ['get', 'post']
    };

    for (const [pathKey, methods] of Object.entries(expectedRouteMethods)) {
      expect(spec.paths).toHaveProperty(pathKey);
      for (const method of methods) {
        expect(spec.paths[pathKey]).toHaveProperty(method);
      }
    }

    // Endpoints protegidos devem declarar bearerAuth
    const protectedOps = [
      spec.paths['/auth/me'].get,
      spec.paths['/categories'].get,
      spec.paths['/categories'].post,
      spec.paths['/categories/{id}'].get,
      spec.paths['/categories/{id}'].put,
      spec.paths['/categories/{id}'].delete,
      spec.paths['/transactions'].get,
      spec.paths['/transactions'].post,
      spec.paths['/transactions/parse-pdf'].post,
      spec.paths['/transactions/batch'].post,
      spec.paths['/transactions/{id}'].get,
      spec.paths['/transactions/{id}'].put,
      spec.paths['/transactions/{id}'].delete,
      spec.paths['/portfolio/consolidated'].get
    ];

    for (const op of protectedOps) {
      expect(op.security).toEqual(expect.arrayContaining([{ bearerAuth: [] }]));
    }
  });

  test('4. Schemas de mutação seguem SEC-04 (additionalProperties: false e sem user_id) e zero secrets expostos', () => {
    const schemas = openApiSpec.components.schemas;
    const strictMutationSchemas = [
      'SignupRequest',
      'LoginRequest',
      'CreateCategoryRequest',
      'UpdateCategoryRequest',
      'CreateTransactionRequest',
      'UpdateTransactionRequest',
      'ParsePdfRequest',
      'BatchTransactionItem',
      'BatchCreateTransactionsRequest'
    ];

    for (const schemaName of strictMutationSchemas) {
      expect(schemas).toHaveProperty(schemaName);
      expect(schemas[schemaName].additionalProperties).toBe(false);
      expect(schemas[schemaName].properties).not.toHaveProperty('user_id');
    }

    expect(schemas.BatchTransactionItem.properties.is_automated.default).toBe(true);
    expect(schemas.BatchCreateTransactionsRequest.properties.transactions.minItems).toBe(1);
    expect(schemas.BatchCreateTransactionsRequest.properties.transactions.maxItems).toBe(200);

    // Garante que nenhum token JWT real esteja embutido na documentação
    const serialized = JSON.stringify(openApiSpec);
    const jwtHeaderPrefix = 'ey' + 'J';
    expect(serialized).not.toContain(`${jwtHeaderPrefix}hbGci`);
  });

  test('5. Variável SWAGGER_ENABLED=false oculta /api/docs e /api/docs.json sem impactar /health', async () => {
    process.env.SWAGGER_ENABLED = 'false';

    const disabledJson = await request(app).get('/api/docs.json');
    expect(disabledJson.statusCode).toBe(404);

    const disabledUi = await request(app).get('/api/docs');
    expect(disabledUi.statusCode).toBe(404);

    const healthRes = await request(app).get('/api/health');
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body).toEqual({ status: 'ok', pipeline: 'running' });

    expect(renderSwaggerUiHtml({ isApiPrefix: false })).toContain("url: '/docs.json'");
  });
});
