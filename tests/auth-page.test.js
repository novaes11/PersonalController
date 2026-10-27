const request = require('supertest');
const app = require('../server');
const { renderLandingPage } = require('../src/frontend/pages/renderLandingPage');

describe('E05.T03 & E05.T04 — Integração Visual de Autenticação (/login, /signup) e Root Deploy', () => {
  test('1. renderLandingPage() gera documento HTML5 com doctype, tokens de design e markup de login', () => {
    const html = renderLandingPage({ mode: 'login' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="pt-BR" data-theme="dark">');
    expect(html).toContain('data-testid="auth-view"');
    expect(html).toContain('data-auth-mode="login"');
    expect(html).toContain('data-testid="demo-mode-btn"');
    expect(html).toContain('Entrar no Modo Demonstração (1 Clique)');
    expect(html).toContain('<style id="pc-design-tokens">');
  });

  test('2. renderLandingPage({ mode: "signup" }) gera documento em modo cadastro', () => {
    const html = renderLandingPage({ mode: 'signup' });
    expect(html).toContain('data-auth-mode="signup"');
    expect(html).toContain('Criar Conta Segura');
  });

  test('3. Rota GET /login e GET /signup retornam HTTP 200 com text/html da tela de autenticação', async () => {
    const loginRes = await request(app).get('/login');
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers['content-type']).toMatch(/text\/html/);
    expect(loginRes.text).toContain('data-testid="auth-view"');
    expect(loginRes.text).toContain('PersonalController');

    const signupRes = await request(app).get('/signup');
    expect(signupRes.status).toBe(200);
    expect(signupRes.headers['content-type']).toMatch(/text\/html/);
    expect(signupRes.text).toContain('data-auth-mode="signup"');
  });

  test('4. Rota raiz GET / com header de navegador (Accept: text/html) entrega a tela visual de autenticação', async () => {
    const browserRes = await request(app)
      .get('/')
      .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8');

    expect(browserRes.status).toBe(200);
    expect(browserRes.headers['content-type']).toMatch(/text\/html/);
    expect(browserRes.text).toContain('data-testid="auth-view"');
    expect(browserRes.text).toContain('Entrar no Modo Demonstração (1 Clique)');
  });

  test('5. Rota raiz GET / preserva o contrato JSON para clientes de API e ferramentas sem text/html', async () => {
    const apiRes = await request(app).get('/');
    expect(apiRes.status).toBe(200);
    expect(apiRes.headers['content-type']).toMatch(/json/);
    expect(apiRes.body.status).toBe('ok');
    expect(apiRes.body.service).toBe('PersonalController API');
  });

  test('6. Rota /api preserva contrato JSON mesmo se cabeçalho contiver text/html', async () => {
    const apiPrefixRes = await request(app)
      .get('/api')
      .set('Accept', 'text/html,application/json');

    expect(apiPrefixRes.status).toBe(200);
    expect(apiPrefixRes.headers['content-type']).toMatch(/json/);
    expect(apiPrefixRes.body.status).toBe('ok');
  });

  test('7. Normalização Serverless (Vercel rewrite ?__path=/dashboard) entrega o Dashboard HTML ao invés de JSON de status', async () => {
    const dashboardRes = await request(app)
      .get('/api/index.js?__path=/dashboard')
      .set('Accept', 'text/html,application/xhtml+xml');

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.headers['content-type']).toMatch(/text\/html/);
    expect(dashboardRes.text).toContain('data-testid="app-shell"');
    expect(dashboardRes.text).toContain('data-testid="dashboard-view"');
  });

  test('8. Normalização Serverless (Vercel rewrite ?__path=/api/auth/signup) encaminha POST para o controller de cadastro (sem 404)', async () => {
    const signupPostRes = await request(app)
      .post('/api/index.js?__path=/api/auth/signup')
      .send({});

    // Deve bater no controller de auth (retornando 400 de validação de email/senha ausentes) e NUNCA 404 Cannot POST /api/index.js
    expect(signupPostRes.status).toBe(400);
    expect(signupPostRes.body.status).toBe('error');
    expect(Array.isArray(signupPostRes.body.errors)).toBe(true);
  });

  test('9. Normalização Serverless via cabeçalho x-rewritten-path restaura rota /signup e /health', async () => {
    const rewrittenSignupRes = await request(app)
      .get('/api/index.js')
      .set('x-rewritten-path', '/signup');

    expect(rewrittenSignupRes.status).toBe(200);
    expect(rewrittenSignupRes.headers['content-type']).toMatch(/text\/html/);
    expect(rewrittenSignupRes.text).toContain('data-auth-mode="signup"');

    const rewrittenHealthRes = await request(app)
      .get('/api/index.js?__path=/health');

    expect(rewrittenHealthRes.status).toBe(200);
    expect(rewrittenHealthRes.body).toEqual({ status: 'ok', pipeline: 'running' });
  });
});
