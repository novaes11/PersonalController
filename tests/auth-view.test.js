const {
  buildAuthPayload,
  loginUser,
  signupUser,
  logoutUser,
  fetchCurrentUser,
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
  createDemoDataset
} = require('../src/frontend/services/authApi');
const {
  SESSION_STORAGE_KEY,
  renderAuthViewMarkup,
  createAuthViewElement,
  createAuthViewController
} = require('../src/frontend/components/AuthView');
const {
  resolveAuthSessionMode,
  loadDashboardState
} = require('../src/frontend/services/dataSyncService');
const { renderLandingPage } = require('../src/frontend/pages/renderLandingPage');
const { renderAppPage } = require('../src/frontend/pages/renderAppPage');

describe('E05.T03 & AUTH-02 — Tela de Autenticação (/login, /signup), Fluxo Real de Sessão e Modo Demo', () => {
  test('1. Valida e sanitiza credenciais estritas (buildAuthPayload) bloqueando e-mails inválidos e senhas curtas', () => {
    const invalidEmail = buildAuthPayload({
      email: 'invalido',
      password: 'PasswordValida123!' // allowlist-secret
    });
    expect(invalidEmail.valid).toBe(false);
    expect(invalidEmail.errors[0].field).toBe('email');

    const shortPass = buildAuthPayload({
      email: 'User@Example.com ',
      password: '123' // allowlist-secret
    });
    expect(shortPass.valid).toBe(false);
    expect(shortPass.errors[0].field).toBe('password');

    const valid = buildAuthPayload({
      email: '  Joao@PersonalController.app ',
      password: 'StrongPassword123!' // allowlist-secret
    });
    expect(valid.valid).toBe(true);
    expect(valid.payload).toEqual({
      email: 'joao@personalcontroller.app',
      password: 'StrongPassword123!' // allowlist-secret
    });
  });

  test('2. Renderiza layout Mobile-First de coluna única (w-full max-w-md mx-auto px-4) com autocomplete para gerenciadores de senha e botão Modo Demo', () => {
    const loginHtml = renderAuthViewMarkup({
      mode: 'login',
      email: 'joao@personalcontroller.app'
    });

    expect(loginHtml).toContain('data-testid="auth-view"');
    expect(loginHtml).toContain('w-full max-w-md mx-auto px-4');
    expect(loginHtml).toContain('autocomplete="email"');
    expect(loginHtml).toContain('autocomplete="current-password"');
    expect(loginHtml).toContain('data-testid="demo-mode-btn"');
    expect(loginHtml).toContain('Entrar no Modo Demonstração (1 Clique)');

    const signupHtml = renderAuthViewMarkup({
      mode: 'signup',
      errorMessage: 'E-mail já cadastrado'
    });
    expect(signupHtml).toContain('data-auth-mode="signup"');
    expect(signupHtml).toContain('autocomplete="new-password"');
    expect(signupHtml).toContain('data-testid="auth-error-alert"');
    expect(signupHtml).toContain('E-mail já cadastrado');
  });

  test('3. Integra fluxo completo de Login, Signup, erro de credenciais (401), transição para modo autenticado e Logout no controlador', async () => {
    const storageMap = new Map();
    const mockStorage = {
      getItem: jest.fn(k => storageMap.get(k) || null),
      setItem: jest.fn((k, v) => storageMap.set(k, v)),
      removeItem: jest.fn(k => storageMap.delete(k))
    };

    const mockFetch = jest.fn();
    const onAuthenticated = jest.fn();
    const onLoggedOut = jest.fn();
    const onRedirect = jest.fn();

    const controller = createAuthViewController({
      initialMode: 'login',
      baseUrl: '/api',
      fetchImpl: mockFetch,
      storage: mockStorage,
      onAuthenticated,
      onLoggedOut,
      onRedirect
    });

    // 1) Tentativa com senha inválida (401)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ status: 'error', message: 'Invalid login credentials' })
    });

    controller.setField('email', 'joao@personalcontroller.app');
    controller.setField('password', 'WrongPass123!'); // allowlist-secret

    const failedAttempt = await controller.submit();
    expect(failedAttempt.ok).toBe(false);
    expect(controller.getState().errorMessage).toContain('Credenciais inválidas');

    // 2) Login com sucesso (200) -> persiste sessão compatível com dataSyncService e redireciona para /dashboard
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        message: 'Autenticado com sucesso',
        user: { id: 'u-1', email: 'joao@personalcontroller.app' },
        token: 'jwt-valid-session', // allowlist-secret
        session: { access_token: 'jwt-valid-session', expires_at: 9999999999 } // allowlist-secret
      })
    });

    controller.setField('password', 'CorrectPass123!'); // allowlist-secret
    const successLogin = await controller.submit();
    expect(successLogin.ok).toBe(true);
    expect(successLogin.redirectTo).toBe('/dashboard');
    expect(controller.getState().user.email).toBe('joao@personalcontroller.app');
    expect(controller.getState().token).toBe('jwt-valid-session');
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      expect.stringContaining('joao@personalcontroller.app')
    );
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(onRedirect).toHaveBeenCalledWith('/dashboard', expect.objectContaining({ token: 'jwt-valid-session' })); // allowlist-secret

    // Verifica que a sessão persistida no storage é reconhecida como 'authenticated' pelo dataSyncService
    const persistedRaw = storageMap.get(SESSION_STORAGE_KEY);
    const resolvedMode = resolveAuthSessionMode(persistedRaw);
    expect(resolvedMode.mode).toBe('authenticated');
    expect(resolvedMode.isDemo).toBe(false);
    expect(resolvedMode.token).toBe('jwt-valid-session');

    // 3) Logout encerrando sessão no backend e limpando storage
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', message: 'Sessão encerrada com sucesso' })
    });

    await controller.logout();
    expect(controller.getState().user).toBeNull();
    expect(controller.getState().token).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    expect(onLoggedOut).toHaveBeenCalledTimes(1);

    // 4) Cadastro (Signup) com sucesso (201) e sessão imediata
    controller.setMode('signup');
    controller.setField('email', 'novo@personalcontroller.app');
    controller.setField('password', 'NewAccountPass123!'); // allowlist-secret

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        status: 'ok',
        message: 'Usuário cadastrado com sucesso',
        user: { id: 'u-2', email: 'novo@personalcontroller.app' },
        token: 'jwt-signup-session', // allowlist-secret
        session: { access_token: 'jwt-signup-session', expires_at: 9999999999 } // allowlist-secret
      })
    });

    const signupRes = await controller.submit();
    expect(signupRes.ok).toBe(true);
    expect(signupRes.redirectTo).toBe('/dashboard');
    expect(controller.getState().user.email).toBe('novo@personalcontroller.app');
    expect(resolveAuthSessionMode(storageMap.get(SESSION_STORAGE_KEY))).toMatchObject({
      mode: 'authenticated',
      isDemo: false,
      token: 'jwt-signup-session' // allowlist-secret
    });
  });

  test('4. Ativa o Modo Demonstração com 1 Clique populando categorias, transações e carteira B3/FII/Cripto', () => {
    const onDemoActivated = jest.fn();
    const controller = createAuthViewController({ onDemoActivated });

    const demoData = controller.enterDemoMode();

    expect(controller.getState().isDemoMode).toBe(true);
    expect(controller.getState().user.isDemo).toBe(true);
    expect(demoData.categories.length).toBeGreaterThanOrEqual(4);
    expect(demoData.transactions.length).toBeGreaterThanOrEqual(4);
    expect(demoData.portfolio.positions_count).toBe(4);
    expect(demoData.portfolio.total_portfolio_value).toBeGreaterThan(0);
    expect(onDemoActivated).toHaveBeenCalledWith(demoData, expect.objectContaining({ isDemoMode: true }));
  });

  test('5. Cria árvore React isomórfica via createAuthViewElement e valida serviços diretos loginUser/signupUser/logoutUser', async () => {
    const mockReact = {
      createElement: (type, props, ...children) => ({ type, props, children })
    };

    const tree = createAuthViewElement(mockReact, {
      mode: 'login',
      email: 'teste@personalcontroller.app'
    });

    expect(tree.type).toBe('section');
    expect(tree.props['data-testid']).toBe('auth-view');

    const dataset = createDemoDataset();
    expect(dataset.portfolio.positions.map(p => p.ticker)).toEqual([
      'TESOURO-SELIC',
      'PETR4',
      'HGLG11',
      'BTC'
    ]);

    await expect(
      loginUser({ email: 'bad', password: '123' }) // allowlist-secret
    ).rejects.toThrow();
    await expect(
      signupUser({ email: 'bad', password: '123' }) // allowlist-secret
    ).rejects.toThrow();

    const mockLogoutFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', message: 'Sessão encerrada com sucesso' })
    });
    const res = await logoutUser({ fetchImpl: mockLogoutFetch });
    expect(res.message).toBe('Sessão encerrada com sucesso');
  });

  test('6. AUTH-02: Trata confirmação de e-mail pendente no Sign Up, erros de e-mail duplicado e falha de conexão (NETWORK_ERROR)', async () => {
    const storageMap = new Map();
    const mockStorage = {
      getItem: jest.fn(k => storageMap.get(k) || null),
      setItem: jest.fn((k, v) => storageMap.set(k, v)),
      removeItem: jest.fn(k => storageMap.delete(k))
    };
    const mockFetch = jest.fn();

    const controller = createAuthViewController({
      initialMode: 'signup',
      baseUrl: '/api',
      fetchImpl: mockFetch,
      storage: mockStorage
    });

    // 6a. E-mail duplicado (400 User already registered)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ status: 'error', message: 'User already registered' })
    });

    controller.setField('email', 'existente@personalcontroller.app');
    controller.setField('password', 'StrongPass123!'); // allowlist-secret
    const dupRes = await controller.submit();
    expect(dupRes.ok).toBe(false);
    expect(controller.getState().errorMessage).toContain('já está cadastrado');

    // 6b. Falha de rede (fetch rejeita com TypeError Failed to fetch)
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const netRes = await controller.submit();
    expect(netRes.ok).toBe(false);
    expect(controller.getState().errorMessage).toContain('Falha de conexão com o servidor');

    // 6c. Sign Up com requiresEmailConfirmation=true (session=null) alterna para modo login sem salvar token falso
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        status: 'ok',
        message: 'Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro antes de entrar.',
        user: { id: 'u-confirm', email: 'confirmar@personalcontroller.app' },
        session: null,
        token: null,
        requiresEmailConfirmation: true
      })
    });

    controller.setField('email', 'confirmar@personalcontroller.app');
    controller.setField('password', 'StrongPass123!'); // allowlist-secret
    const confirmRes = await controller.submit();
    expect(confirmRes.ok).toBe(true);
    expect(confirmRes.requiresEmailConfirmation).toBe(true);
    expect(controller.getState().mode).toBe('login');
    expect(controller.getState().successMessage).toContain('Verifique seu e-mail');
    expect(storageMap.has(SESSION_STORAGE_KEY)).toBe(false);
  });

  test('7. AUTH-02: restoreSession(), fetchCurrentUser() e transição de dados privados reais sem cair em Modo Demo', async () => {
    const storageMap = new Map();
    const mockStorage = {
      getItem: jest.fn(k => storageMap.get(k) || null),
      setItem: jest.fn((k, v) => storageMap.set(k, v)),
      removeItem: jest.fn(k => storageMap.delete(k))
    };

    const saved = saveAuthSession(
      {
        user: { id: 'u-real-99', email: 'real@personalcontroller.app' },
        session: { access_token: 'jwt-real-token-99' }, // allowlist-secret
        isDemo: false
      },
      mockStorage
    );
    expect(saved.token).toBe('jwt-real-token-99');
    expect(saved.isDemo).toBe(false);

    const loaded = loadAuthSession(mockStorage);
    expect(loaded.token).toBe('jwt-real-token-99');

    const controller = createAuthViewController({ storage: mockStorage });
    const restored = controller.restoreSession();
    expect(restored.user.email).toBe('real@personalcontroller.app');
    expect(controller.getState().isDemoMode).toBe(false);
    expect(controller.getState().token).toBe('jwt-real-token-99');

    // Carrega o estado do Dashboard usando a sessão restaurada e verifica que NÃO cai em modo demo
    const dashFetch = jest.fn(async (url) => {
      if (url.startsWith('/api/categories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: [{ id: '11111111-1111-4111-8111-111111111101', name: 'Salário', type: 'INCOME' }]
          })
        };
      }
      if (url.startsWith('/api/transactions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: [] })
        };
      }
      if (url.startsWith('/api/portfolio/consolidated')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: { total_portfolio_value: 0, positions: [] } })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const dashState = await loadDashboardState({
      session: restored,
      fetchImpl: dashFetch
    });
    expect(dashState.mode).toBe('authenticated');
    expect(dashState.isDemo).toBe(false);
    expect(dashState.transactions).toEqual([]);
    expect(dashState.portfolio.total_portfolio_value).toBe(0);

    // Valida fetchCurrentUser()
    const meFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', user: { id: 'u-real-99', email: 'real@personalcontroller.app' } })
    });
    const meUser = await fetchCurrentUser({
      token: 'jwt-real-token-99', // allowlist-secret
      fetchImpl: meFetch
    });
    expect(meUser.email).toBe('real@personalcontroller.app');

    clearAuthSession(mockStorage);
    expect(loadAuthSession(mockStorage)).toBeNull();

    // Verifica que renderLandingPage não usa fallback 'session-' + Date.now() e renderAppPage limpa estado demo inicial
    const landingHtml = renderLandingPage({ mode: 'login' });
    expect(landingHtml).not.toContain("'session-' + Date.now()");
    expect(landingHtml).toContain('Verifique seu e-mail para confirmar a conta');

    const appHtml = renderAppPage();
    expect(appHtml).toContain('/api/auth/logout');
    expect(appHtml).toContain('Nenhum ativo em custódia para exibir no gráfico.');
  });
});
