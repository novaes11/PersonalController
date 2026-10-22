const request = require('supertest');
const { resetRateLimitStores } = require('../src/middlewares/rateLimit.middleware');

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn(async () => ({
          data: { user: { id: '11111111-1111-4111-a111-111111111111', email: 'user@exemplo.com' } },
          error: null
        })),
        signInWithPassword: jest.fn(async () => ({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        }))
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null })
      }))
    })),
    supabase: {}
  };
});

const app = require('../server');

describe('Rate Limiting Middleware - /auth e /transactions (SEC-05)', () => {
  const originalAuthMax = process.env.RATE_LIMIT_AUTH_MAX;
  const originalApiMax = process.env.RATE_LIMIT_API_MAX;
  const originalWindowMs = process.env.RATE_LIMIT_WINDOW_MS;

  beforeEach(() => {
    resetRateLimitStores();
  });

  afterAll(() => {
    process.env.RATE_LIMIT_AUTH_MAX = originalAuthMax;
    process.env.RATE_LIMIT_API_MAX = originalApiMax;
    process.env.RATE_LIMIT_WINDOW_MS = originalWindowMs;
    resetRateLimitStores();
  });

  it('deve incluir cabeçalhos X-RateLimit-* nas respostas e bloquear excesso em /auth com HTTP 429', async () => {
    process.env.RATE_LIMIT_AUTH_MAX = '3';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    const clientIp = '203.0.113.10';

    // Requisições 1, 2 e 3 dentro do limite (retornam 400 ou 401 normal da rota, não 429)
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post('/auth/login')
        .set('X-Forwarded-For', clientIp)
        .send({ email: 'user@exemplo.com', password: 'wrong_password_123' }); // allowlist-secret

      expect(res.statusCode).not.toBe(429);
      expect(res.headers['x-ratelimit-limit']).toBe('3');
      expect(res.headers['x-ratelimit-remaining']).toBe(String(3 - i));
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    }

    // 4ª requisição do mesmo IP: deve ser bloqueada pelo Rate Limiter com 429 Too Many Requests
    const blockedRes = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-For', clientIp)
      .send({ email: 'user@exemplo.com', password: 'wrong_password_123' }); // allowlist-secret

    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.body.status).toBe('error');
    expect(blockedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blockedRes.headers['retry-after']).toBeDefined();
  });

  it('deve limitar requisições excessivas em /transactions com HTTP 429 e isolar contadores por IP', async () => {
    process.env.RATE_LIMIT_API_MAX = '2';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';

    const ipA = '198.51.100.1';
    const ipB = '198.51.100.2';

    // IP A consome suas 2 requisições permitidas
    const r1 = await request(app)
      .get('/transactions')
      .set('X-Forwarded-For', ipA)
      .set('Authorization', 'Bearer valid_token');
    expect(r1.statusCode).toBe(200);

    const r2 = await request(app)
      .get('/transactions')
      .set('X-Forwarded-For', ipA)
      .set('Authorization', 'Bearer valid_token');
    expect(r2.statusCode).toBe(200);

    // 3ª requisição do IP A é bloqueada com 429
    const r3 = await request(app)
      .get('/transactions')
      .set('X-Forwarded-For', ipA)
      .set('Authorization', 'Bearer valid_token');
    expect(r3.statusCode).toBe(429);
    expect(r3.body.code).toBe('RATE_LIMIT_EXCEEDED');

    // IP B continua operando normalmente (isolamento por cliente)
    const resIpB = await request(app)
      .get('/transactions')
      .set('X-Forwarded-For', ipB)
      .set('Authorization', 'Bearer valid_token');
    expect(resIpB.statusCode).toBe(200);
    expect(resIpB.headers['x-ratelimit-remaining']).toBe('1');
  });
});
