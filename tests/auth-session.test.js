const request = require('supertest');
const app = require('../server');
const {
  isSupabaseConfigured,
  resetLocalDevStore
} = require('../src/lib/supabase');
const {
  SESSION_STORAGE_KEY,
  buildSessionRecord,
  isSessionExpired,
  saveStoredSession,
  loadStoredSession,
  clearStoredSession,
  fetchCurrentUser
} = require('../src/frontend/services/authApi');
const { createAuthViewController } = require('../src/frontend/components/AuthView');
const { resolveAuthSessionMode } = require('../src/frontend/services/dataSyncService');
const { renderLandingPage } = require('../src/frontend/pages/renderLandingPage');

describe('AUTH-02 — Fluxo Real de Sign Up, Sign In, Gestão de Sessão e Dev Fallback sem Chaves Supabase', () => {
  beforeEach(() => {
    resetLocalDevStore();
  });

  test('1. isSupabaseConfigured() detecta ambiente local sem chaves reais e ativa Dev Fallback automaticamente', () => {
    const originalAnon = process.env.SUPABASE_ANON_KEY;
    const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;

    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(isSupabaseConfigured()).toBe(false);

    process.env.SUPABASE_ANON_KEY = 'dummy_anon_key';
    expect(isSupabaseConfigured()).toBe(false);

    process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real_key'; // allowlist-secret
    expect(isSupabaseConfigured()).toBe(true);

    if (originalAnon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = originalAnon;

    if (originalService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
  });

  test('2. Fluxo Ponta a Ponta (E2E) no Backend com Dev Fallback: Sign Up -> Sign In -> /auth/me -> Categorias & Transações -> Logout', async () => {
    // 1) Sign Up de novo usuário real
    const signupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'investidor.novo@personalcontroller.app',
        password: 'StrongPassword123!' // allowlist-secret
      });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.status).toBe('ok');
    expect(signupRes.body.user.email).toBe('investidor.novo@personalcontroller.app');
    expect(signupRes.body.token).toBeTruthy();
    expect(signupRes.body.session.access_token).toBe(signupRes.body.token);

    // 2) Tentativa de Sign Up duplicado retorna 400 com mensagem clara
    const duplicateRes = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'investidor.novo@personalcontroller.app',
        password: 'StrongPassword123!' // allowlist-secret
      });
    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.message).toContain('já cadastrado');

    // 3) Sign In com as credenciais recém-criadas
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'investidor.novo@personalcontroller.app',
        password: 'StrongPassword123!' // allowlist-secret
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.status).toBe('ok');
    const jwt = loginRes.body.session.access_token;
    expect(jwt).toBeTruthy();

    // 4) Consulta perfil autenticado GET /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${jwt}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('investidor.novo@personalcontroller.app');

    // 5) Criação de categoria e transação isoladas para o novo usuário
    const catRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'Salário Tech', type: 'INCOME' });
    expect(catRes.status).toBe(201);
    const categoryId = catRes.body.data.id;

    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        amount: 12500.5,
        date: '2026-11-10',
        category_id: categoryId,
        description: 'Pagamento Mensal',
        is_automated: false
      });
    expect(txRes.status).toBe(201);
    expect(txRes.body.data.category.name).toBe('Salário Tech');

    const listTxRes = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${jwt}`);
    expect(listTxRes.status).toBe(200);
    expect(listTxRes.body.data).toHaveLength(1);

    // 6) Logout invalida o token na sessão local
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${jwt}`);
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${jwt}`);
    expect(meAfterLogout.status).toBe(401);
  });

  test('3. Sessão persistida pelo AuthViewController transiciona diretamente para modo autenticado no dataSyncService (sem cair em modo demo)', async () => {
    const memoryMap = new Map();
    const mockStorage = {
      getItem: jest.fn(k => memoryMap.get(k) || null),
      setItem: jest.fn((k, v) => memoryMap.set(k, v)),
      removeItem: jest.fn(k => memoryMap.delete(k))
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        status: 'ok',
        message: 'Usuário cadastrado com sucesso',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real.jwt', // allowlist-secret
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'ana@personalcontroller.app'
        },
        session: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real.jwt', // allowlist-secret
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer'
        }
      })
    });

    const controller = createAuthViewController({
      initialMode: 'signup',
      storage: mockStorage,
      fetchImpl: mockFetch
    });

    controller.setField('email', 'ana@personalcontroller.app');
    controller.setField('password', 'SenhaSegura123!'); // allowlist-secret
    controller.setField('confirmPassword', 'SenhaSegura123!'); // allowlist-secret

    const res = await controller.submit();
    expect(res.ok).toBe(true);

    const rawSaved = memoryMap.get(SESSION_STORAGE_KEY);
    expect(rawSaved).toBeTruthy();

    // Verifica que dataSyncService reconhece a sessão como autenticada e NÃO força modo demo
    const syncMode = resolveAuthSessionMode(rawSaved);
    expect(syncMode.mode).toBe('authenticated');
    expect(syncMode.isDemo).toBe(false);
    expect(syncMode.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real.jwt');
    expect(syncMode.user.email).toBe('ana@personalcontroller.app');

    // Verifica restauração de sessão no controlador
    const secondController = createAuthViewController({ storage: mockStorage });
    const restoredState = secondController.restoreSession();
    expect(restoredState.user.email).toBe('ana@personalcontroller.app');
    expect(restoredState.isDemoMode).toBe(false);
  });

  test('4. Ciclo de vida e expiração de sessão: loadStoredSession descarta tokens expirados e fetchCurrentUser valida /auth/me', async () => {
    const memoryMap = new Map();
    const mockStorage = {
      getItem: k => memoryMap.get(k) || null,
      setItem: (k, v) => memoryMap.set(k, v),
      removeItem: k => memoryMap.delete(k)
    };

    const expiredRecord = buildSessionRecord({
      user: { id: 'u-exp', email: 'expirado@personalcontroller.app' },
      session: { access_token: 'jwt-expired', expires_at: 1000 }, // allowlist-secret
      isDemo: false
    });

    saveStoredSession(expiredRecord, mockStorage);
    expect(isSessionExpired(expiredRecord, 2000)).toBe(true);

    const loaded = loadStoredSession(mockStorage, 2000);
    expect(loaded).toBeNull();
    expect(memoryMap.has(SESSION_STORAGE_KEY)).toBe(false);

    // Teste de fetchCurrentUser
    const mockMeFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        user: { id: 'u-live', email: 'ativo@personalcontroller.app' }
      })
    });

    const activeUser = await fetchCurrentUser({
      token: 'jwt-live-token', // allowlist-secret
      fetchImpl: mockMeFetch
    });
    expect(activeUser.email).toBe('ativo@personalcontroller.app');

    clearStoredSession(mockStorage);
    expect(memoryMap.size).toBe(0);
  });

  test('5. renderLandingPage inclui tratamento de ?session_expired=true e verificação de expires_at', () => {
    const html = renderLandingPage({ mode: 'login' });
    expect(html).toContain('session_expired=true');
    expect(html).toContain('Sua sessão expirou. Faça login novamente para continuar.');
    expect(html).toContain('requires_email_confirmation');
  });
});
