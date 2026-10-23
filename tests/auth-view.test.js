const {
  buildAuthPayload,
  loginUser,
  signupUser,
  logoutUser,
  createDemoDataset
} = require('../src/frontend/services/authApi');
const {
  SESSION_STORAGE_KEY,
  renderAuthViewMarkup,
  createAuthViewElement,
  createAuthViewController
} = require('../src/frontend/components/AuthView');

describe('E05.T03 — Tela de Autenticação (/login, /signup) e Modo Demo Interativo', () => {
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

  test('3. Integra fluxo completo de Login, Signup, erro de credenciais (401) e Logout no controlador', async () => {
    const storageMap = new Map();
    const mockStorage = {
      setItem: jest.fn((k, v) => storageMap.set(k, v)),
      removeItem: jest.fn(k => storageMap.delete(k))
    };

    const mockFetch = jest.fn();
    const onAuthenticated = jest.fn();
    const onLoggedOut = jest.fn();

    const controller = createAuthViewController({
      initialMode: 'login',
      baseUrl: '/api',
      fetchImpl: mockFetch,
      storage: mockStorage,
      onAuthenticated,
      onLoggedOut
    });

    // 1) Tentativa com senha inválida (401)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ status: 'error', message: 'Credenciais inválidas' })
    });

    controller.setField('email', 'joao@personalcontroller.app');
    controller.setField('password', 'WrongPass123!'); // allowlist-secret

    const failedAttempt = await controller.submit();
    expect(failedAttempt.ok).toBe(false);
    expect(controller.getState().errorMessage).toBe('Credenciais inválidas');

    // 2) Login com sucesso (200)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'ok',
        message: 'Autenticado com sucesso',
        user: { id: 'u-1', email: 'joao@personalcontroller.app' },
        session: { access_token: 'jwt-valid-session', expires_at: 9999999999 } // allowlist-secret
      })
    });

    controller.setField('password', 'CorrectPass123!'); // allowlist-secret
    const successLogin = await controller.submit();
    expect(successLogin.ok).toBe(true);
    expect(controller.getState().user.email).toBe('joao@personalcontroller.app');
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      expect.stringContaining('joao@personalcontroller.app')
    );
    expect(onAuthenticated).toHaveBeenCalledTimes(1);

    // 3) Logout encerrando sessão no backend e limpando storage
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', message: 'Sessão encerrada com sucesso' })
    });

    await controller.logout();
    expect(controller.getState().user).toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    expect(onLoggedOut).toHaveBeenCalledTimes(1);

    // 4) Cadastro (Signup) com sucesso (201)
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
        session: { access_token: 'jwt-signup-session', expires_at: 9999999999 } // allowlist-secret
      })
    });

    const signupRes = await controller.submit();
    expect(signupRes.ok).toBe(true);
    expect(controller.getState().user.email).toBe('novo@personalcontroller.app');
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
});
