const {
  SESSION_STORAGE_KEY,
  saveAuthSession,
  loadAuthSession,
  clearAuthSession,
  buildAuthPayload,
  loginUser,
  signupUser,
  logoutUser,
  createDemoDataset
} = require('../services/authApi');

const LOCK_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="1.5"/></svg>';

const EYE_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';

const EYE_OFF_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

const SPARKLES_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validador das regras de complexidade da senha em tempo real.
 */
function checkPasswordRequirements(password = '', confirmPassword = '') {
  const pwd = String(password || '');
  const confirm = String(confirmPassword || '');
  const length = pwd.length >= 8;
  const uppercase = /[A-Z]/.test(pwd);
  const lowercase = /[a-z]/.test(pwd);
  const number = /[0-9]/.test(pwd);
  const special = /[^A-Za-z0-9]/.test(pwd);
  const match = Boolean(pwd && confirm && pwd === confirm);
  const allRulesMet = length && uppercase && lowercase && number && special;
  const isCompleteSignup = allRulesMet && match;

  return {
    length,
    uppercase,
    lowercase,
    number,
    special,
    match,
    allRulesMet,
    isCompleteSignup
  };
}

/**
 * Renderiza o HTML SSR/isomórfico da Tela de Autenticação (/login, /signup)
 * com design limpo, checklist de senha em tempo real, confirmação de senha
 * e alternância fluida na base do formulário.
 */
function renderAuthViewMarkup({
  mode = 'login',
  email = '',
  password = '',
  confirmPassword = '',
  isSubmitting = false,
  errorMessage = null,
  successMessage = null
} = {}) {
  const isSignup = mode === 'signup';
  const passwordAutocomplete = isSignup ? 'new-password' : 'current-password';
  const submitLabel = isSubmitting
    ? isSignup
      ? 'Criando conta...'
      : 'Autenticando...'
    : isSignup
      ? 'Criar Conta Segura'
      : 'Entrar na Conta';

  const reqStatus = checkPasswordRequirements(password, confirmPassword);

  const errorBannerHtml = errorMessage
    ? `<div
        role="alert"
        data-testid="auth-error-alert"
        class="mb-4 p-3 rounded-lg border border-rose-500/40 bg-rose-950/60 text-rose-200 text-xs md:text-sm"
      >
        ${escapeHtml(errorMessage)}
      </div>`
    : '';

  const successBannerHtml = successMessage
    ? `<div
        role="status"
        data-testid="auth-success-alert"
        class="mb-4 p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 text-xs md:text-sm"
      >
        ${escapeHtml(successMessage)}
      </div>`
    : '';

  function renderReqItem(key, label, isMet) {
    const indicatorHtml = isMet
      ? '<span class="req-indicator w-3.5 h-3.5 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs shrink-0 font-bold">✓</span>'
      : '<span class="req-indicator w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-500 shrink-0">•</span>';
    const textClass = isMet ? 'text-emerald-300 font-medium' : 'text-slate-400';

    return `<li data-requirement="${key}" class="flex items-center gap-2 ${textClass} transition-colors">
      ${indicatorHtml}
      <span>${label}</span>
    </li>`;
  }

  return `<section
    data-testid="auth-view"
    data-auth-mode="${isSignup ? 'signup' : 'login'}"
    aria-label="Autenticação e Acesso ao PersonalController"
    class="w-full max-w-md mx-auto px-4 py-8"
  >
    <div
      class="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-sm"
      style="background-color: var(--bg-surface); border-color: var(--border-subtle);"
    >
      <div class="flex items-center gap-3.5 mb-6">
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-sm shrink-0">
          ${LOCK_ICON_SVG}
        </span>
        <div>
          <h1 class="text-xl font-bold tracking-tight text-slate-100">PersonalController</h1>
          <p class="text-xs text-slate-400">Controle financeiro pessoal e carteira consolidada</p>
        </div>
      </div>

      <!-- Alternância de Modo (Abas superiores discretas) -->
      <div
        role="tablist"
        aria-label="Modo de autenticação"
        class="grid grid-cols-2 gap-1.5 p-1 mb-6 rounded-xl bg-slate-950/80 border border-slate-800/80"
      >
        <button
          type="button"
          role="tab"
          data-testid="auth-mode-login"
          aria-selected="${!isSignup ? 'true' : 'false'}"
          class="touch-target rounded-lg text-xs md:text-sm font-semibold transition-all ${
            !isSignup ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }"
          style="min-height: 44px; min-width: 44px;"
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          data-testid="auth-mode-signup"
          aria-selected="${isSignup ? 'true' : 'false'}"
          class="touch-target rounded-lg text-xs md:text-sm font-semibold transition-all ${
            isSignup ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }"
          style="min-height: 44px; min-width: 44px;"
        >
          Criar Conta
        </button>
      </div>

      ${errorBannerHtml}
      ${successBannerHtml}

      <form data-testid="auth-form" novalidate class="space-y-4">
        <div>
          <label for="auth-email-input" class="block text-xs font-medium text-slate-300 mb-1.5">
            E-mail
          </label>
          <input
            id="auth-email-input"
            name="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            required
            placeholder="voce@exemplo.com"
            value="${escapeHtml(email)}"
            data-testid="auth-email-input"
            class="touch-target w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
            style="min-height: 44px;"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="auth-password-input" class="block text-xs font-medium text-slate-300">
              Senha ${!isSignup ? '' : '<span class="text-slate-400 font-normal">(mín. 8 caracteres)</span>'}
            </label>
          </div>
          <div class="relative">
            <input
              id="auth-password-input"
              name="password"
              type="password"
              autocomplete="${passwordAutocomplete}"
              required
              minlength="8"
              placeholder="••••••••"
              value="${escapeHtml(password)}"
              data-testid="auth-password-input"
              class="touch-target w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 pr-10 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
              style="min-height: 44px;"
            />
            <button
              type="button"
              data-toggle-password="auth-password-input"
              aria-label="Mostrar ou ocultar senha"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
            >
              ${EYE_ICON_SVG}
            </button>
          </div>
        </div>

        <!-- Confirmação de Senha (Exclusivo da tela de cadastro / criar conta) -->
        <div id="confirm-password-container" class="${isSignup ? 'block' : 'hidden'}">
          <label for="auth-confirm-password-input" class="block text-xs font-medium text-slate-300 mb-1.5">
            Confirmar Senha
          </label>
          <div class="relative">
            <input
              id="auth-confirm-password-input"
              name="confirmPassword"
              type="password"
              autocomplete="${isSignup ? 'new-password' : 'off'}"
              placeholder="••••••••"
              value="${escapeHtml(confirmPassword)}"
              data-testid="auth-confirm-password-input"
              class="touch-target w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3.5 py-2.5 pr-10 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all"
              style="min-height: 44px;"
            />
            <button
              type="button"
              data-toggle-password="auth-confirm-password-input"
              aria-label="Mostrar ou ocultar confirmação de senha"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
            >
              ${EYE_ICON_SVG}
            </button>
          </div>
        </div>

        <!-- Tabela / Checklist de Requisitos da Senha em Tempo Real -->
        <div
          id="password-requirements"
          data-testid="password-requirements"
          class="${isSignup ? 'block' : 'hidden'} p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 my-3 space-y-2"
        >
          <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span>Requisitos de segurança</span>
            <span id="password-req-counter" class="text-[10px] text-slate-400">0/5</span>
          </div>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-xs" role="list">
            ${renderReqItem('length', 'Mínimo 8 caracteres', reqStatus.length)}
            ${renderReqItem('uppercase', 'Letra maiúscula', reqStatus.uppercase)}
            ${renderReqItem('lowercase', 'Letra minúscula', reqStatus.lowercase)}
            ${renderReqItem('number', 'Número (0-9)', reqStatus.number)}
            ${renderReqItem('special', 'Caractere especial (@, #, $)', reqStatus.special)}
            ${renderReqItem('match', 'Senhas coincidem', reqStatus.match)}
          </ul>
        </div>

        <button
          type="submit"
          data-testid="auth-submit-btn"
          ${isSubmitting ? 'disabled' : ''}
          class="touch-target w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm py-3 shadow-sm transition-all"
          style="min-height: 48px;"
        >
          ${escapeHtml(submitLabel)}
        </button>
      </form>

      <!-- Alternância na Base do Formulário ("Não possui conta?..." / "Já possui conta?...") -->
      <div
        class="mt-5 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400"
        data-testid="auth-footer-prompt"
      >
        <span id="auth-footer-text">${!isSignup ? 'Não possui uma conta?' : 'Já possui uma conta?'}</span>
        <button
          type="button"
          id="auth-footer-toggle-btn"
          data-testid="auth-footer-toggle-btn"
          class="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 ml-1 transition-colors"
        >
          ${!isSignup ? 'Criar conta' : 'Fazer login'}
        </button>
      </div>

      <div class="relative my-6 flex items-center justify-center">
        <div class="border-t border-slate-800/80 w-full"></div>
        <span class="bg-slate-900 px-3 text-[11px] text-slate-400 uppercase tracking-wider">ou explore sem cadastro</span>
        <div class="border-t border-slate-800/80 w-full"></div>
      </div>

      <!-- Modo Demonstração Interativo (1 Clique) -->
      <button
        type="button"
        data-testid="demo-mode-btn"
        class="touch-target w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-semibold text-xs md:text-sm py-3 transition-colors"
        style="min-height: 48px;"
      >
        ${SPARKLES_ICON_SVG}
        <span>Entrar no Modo Demonstração (1 Clique)</span>
      </button>
    </div>
  </section>`;
}

/**
 * Renderiza elemento React isomórfico sem exigir transpilação JSX.
 */
function createAuthViewElement(React, props = {}) {
  if (!React || typeof React.createElement !== 'function') {
    throw new Error('Instância do React com createElement é obrigatória.');
  }

  const {
    mode = 'login',
    email = '',
    password = '',
    confirmPassword = '',
    isSubmitting = false,
    errorMessage = null,
    successMessage = null,
    onModeChange,
    onFieldChange,
    onSubmit,
    onDemoStart
  } = props;

  const isSignup = mode === 'signup';
  const reqStatus = checkPasswordRequirements(password, confirmPassword);

  return React.createElement(
    'section',
    {
      'data-testid': 'auth-view',
      'data-auth-mode': isSignup ? 'signup' : 'login',
      className: 'w-full max-w-md mx-auto px-4 py-8'
    },
    React.createElement(
      'div',
      { role: 'tablist', className: 'grid grid-cols-2 gap-2 mb-6' },
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'auth-mode-login',
          'aria-selected': !isSignup ? 'true' : 'false',
          style: { minHeight: '44px', minWidth: '44px' },
          onClick: () => typeof onModeChange === 'function' && onModeChange('login')
        },
        'Entrar'
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'auth-mode-signup',
          'aria-selected': isSignup ? 'true' : 'false',
          style: { minHeight: '44px', minWidth: '44px' },
          onClick: () => typeof onModeChange === 'function' && onModeChange('signup')
        },
        'Criar Conta'
      )
    ),
    errorMessage
      ? React.createElement('div', { role: 'alert', 'data-testid': 'auth-error-alert' }, errorMessage)
      : null,
    successMessage
      ? React.createElement('div', { role: 'status', 'data-testid': 'auth-success-alert' }, successMessage)
      : null,
    React.createElement(
      'form',
      {
        'data-testid': 'auth-form',
        onSubmit: e => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof onSubmit === 'function') onSubmit();
        }
      },
      React.createElement('input', {
        type: 'email',
        name: 'email',
        autoComplete: 'email',
        'data-testid': 'auth-email-input',
        value: email,
        style: { minHeight: '44px' },
        onChange: e => typeof onFieldChange === 'function' && onFieldChange('email', e?.target?.value ?? '')
      }),
      React.createElement('input', {
        type: 'password',
        name: 'password',
        autoComplete: isSignup ? 'new-password' : 'current-password',
        'data-testid': 'auth-password-input',
        value: password,
        style: { minHeight: '44px' },
        onChange: e => typeof onFieldChange === 'function' && onFieldChange('password', e?.target?.value ?? '')
      }),
      isSignup
        ? React.createElement('input', {
            type: 'password',
            name: 'confirmPassword',
            autoComplete: 'new-password',
            'data-testid': 'auth-confirm-password-input',
            value: confirmPassword,
            style: { minHeight: '44px' },
            onChange: e => typeof onFieldChange === 'function' && onFieldChange('confirmPassword', e?.target?.value ?? '')
          })
        : null,
      isSignup
        ? React.createElement(
            'div',
            { 'data-testid': 'password-requirements' },
            React.createElement('div', { 'data-requirement': 'length' }, reqStatus.length ? 'OK' : 'Pendente'),
            React.createElement('div', { 'data-requirement': 'match' }, reqStatus.match ? 'OK' : 'Pendente')
          )
        : null,
      React.createElement(
        'button',
        {
          type: 'submit',
          'data-testid': 'auth-submit-btn',
          disabled: isSubmitting,
          style: { minHeight: '48px' }
        },
        isSignup ? 'Criar Conta Segura' : 'Entrar na Conta'
      )
    ),
    React.createElement(
      'div',
      { 'data-testid': 'auth-footer-prompt' },
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'auth-footer-toggle-btn',
          onClick: () => typeof onModeChange === 'function' && onModeChange(isSignup ? 'login' : 'signup')
        },
        !isSignup ? 'Criar conta' : 'Fazer login'
      )
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'demo-mode-btn',
        style: { minHeight: '48px' },
        onClick: () => typeof onDemoStart === 'function' && onDemoStart()
      },
      'Entrar no Modo Demonstração (1 Clique)'
    )
  );
}

/**
 * Controlador de autenticação (`/login`, `/signup`, `/logout`) e Modo Demonstração (E05.T03 & AUTH-02).
 */
function createAuthViewController({
  initialMode = 'login',
  baseUrl = '/api',
  redirectUrl = '/dashboard',
  fetchImpl = global.fetch,
  storage = null,
  onAuthenticated,
  onDemoActivated,
  onLoggedOut,
  onRedirect
} = {}) {
  let state = {
    mode: initialMode === 'signup' ? 'signup' : 'login',
    email: '',
    password: '',
    confirmPassword: '',
    isSubmitting: false,
    errorMessage: null,
    successMessage: null,
    user: null,
    session: null,
    token: null,
    isDemoMode: false,
    isDemo: false,
    demoData: null,
    redirectTo: null
  };

  function getState() {
    return { ...state };
  }

  function setMode(nextMode) {
    state = {
      ...state,
      mode: nextMode === 'signup' ? 'signup' : 'login',
      errorMessage: null,
      successMessage: null
    };
    return getState();
  }

  function setField(field, value) {
    if (field !== 'email' && field !== 'password' && field !== 'confirmPassword') return getState();
    state = {
      ...state,
      [field]: value,
      errorMessage: null
    };
    return getState();
  }

  function persistSession(sessionPayload) {
    return saveAuthSession(sessionPayload, storage);
  }

  function clearPersistedSession() {
    clearAuthSession(storage);
  }

  function restoreSession() {
    const restored = loadAuthSession(storage);
    if (!restored) return null;

    state = {
      ...state,
      user: restored.user,
      session: restored.session,
      token: restored.token,
      isDemoMode: restored.isDemo,
      isDemo: restored.isDemo,
      demoData: restored.isDemo ? createDemoDataset() : null
    };

    return getState();
  }

  async function submit() {
    if (state.mode === 'signup' && state.confirmPassword) {
      if (state.password !== state.confirmPassword) {
        state = {
          ...state,
          errorMessage: 'As senhas não coincidem.',
          successMessage: null
        };
        return { ok: false, error: new Error('As senhas não coincidem.') };
      }
    }

    const validation = buildAuthPayload({
      email: state.email,
      password: state.password
    });

    if (!validation.valid) {
      state = {
        ...state,
        errorMessage: validation.errors[0].message,
        successMessage: null
      };
      return { ok: false, errors: validation.errors };
    }

    state = {
      ...state,
      isSubmitting: true,
      errorMessage: null,
      successMessage: null
    };

    try {
      const action = state.mode === 'signup' ? signupUser : loginUser;
      const result = await action(validation.payload, { baseUrl, fetchImpl });
      const resolvedToken = result.token || result.session?.access_token || null; // allowlist-secret

      if (!resolvedToken) {
        clearPersistedSession();
        state = {
          ...state,
          mode: 'login',
          isSubmitting: false,
          user: result.user,
          session: null,
          token: null,
          isDemoMode: false,
          isDemo: false,
          demoData: null,
          redirectTo: null,
          password: '',
          confirmPassword: '',
          successMessage:
            result.message ||
            'Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.'
        };

        return {
          ok: true,
          user: result.user,
          session: null,
          token: null,
          requiresEmailConfirmation: true
        };
      }

      const persistedRecord = persistSession({
        user: result.user,
        session: result.session,
        token: resolvedToken, // allowlist-secret
        isDemo: false
      });

      state = {
        ...state,
        isSubmitting: false,
        user: persistedRecord.user,
        session: persistedRecord.session,
        token: persistedRecord.token, // allowlist-secret
        isDemoMode: false,
        isDemo: false,
        demoData: null,
        redirectTo: redirectUrl,
        password: '',
        confirmPassword: '',
        successMessage: result.message
      };

      if (typeof onAuthenticated === 'function') {
        onAuthenticated(getState());
      }

      if (typeof onRedirect === 'function') {
        onRedirect(redirectUrl, getState());
      }

      return {
        ok: true,
        user: state.user,
        session: state.session,
        token: state.token, // allowlist-secret
        redirectTo: redirectUrl
      };
    } catch (err) {
      state = {
        ...state,
        isSubmitting: false,
        errorMessage: err.message || 'Falha na autenticação'
      };
      return { ok: false, error: err };
    }
  }

  /**
   * Ativa o Modo Demonstração com 1 Clique populando transações, categorias e carteira B3/FII/Cripto.
   */
  function enterDemoMode() {
    const demoData = createDemoDataset();
    const persistedDemo = persistSession({
      user: demoData.user,
      session: { token_type: 'demo', expires_at: null }, // allowlist-secret
      isDemo: true
    });

    state = {
      ...state,
      user: demoData.user,
      session: persistedDemo.session,
      token: persistedDemo.token, // allowlist-secret
      isDemoMode: true,
      isDemo: true,
      demoData,
      redirectTo: redirectUrl,
      errorMessage: null,
      successMessage: 'Modo Demonstração ativado com sucesso!'
    };

    if (typeof onDemoActivated === 'function') {
      onDemoActivated(demoData, getState());
    }

    if (typeof onRedirect === 'function') {
      onRedirect(redirectUrl, getState());
    }

    return demoData;
  }

  async function logout() {
    const token = state.token || state.session?.access_token; // allowlist-secret
    if (!state.isDemoMode && token) {
      try {
        await logoutUser({ token, baseUrl, fetchImpl });
      } catch (_) {
        // Limpa estado local mesmo em caso de erro de rede no logout
      }
    }

    clearPersistedSession();
    state = {
      ...state,
      user: null,
      session: null,
      token: null,
      isDemoMode: false,
      isDemo: false,
      demoData: null,
      redirectTo: null,
      password: '',
      confirmPassword: '',
      errorMessage: null,
      successMessage: 'Sessão encerrada com sucesso'
    };

    if (typeof onLoggedOut === 'function') {
      onLoggedOut(getState());
    }

    return getState();
  }

  function getMarkup() {
    return renderAuthViewMarkup({
      mode: state.mode,
      email: state.email,
      password: state.password,
      confirmPassword: state.confirmPassword,
      isSubmitting: state.isSubmitting,
      errorMessage: state.errorMessage,
      successMessage: state.successMessage
    });
  }

  return {
    getState,
    setMode,
    setField,
    restoreSession,
    submit,
    enterDemoMode,
    logout,
    getMarkup
  };
}

module.exports = {
  SESSION_STORAGE_KEY,
  checkPasswordRequirements,
  renderAuthViewMarkup,
  createAuthViewElement,
  createAuthViewController
};
