const {
  buildAuthPayload,
  loginUser,
  signupUser,
  logoutUser,
  createDemoDataset
} = require('../services/authApi');

const LOCK_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

const SPARKLES_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>';

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
 * Renderiza o HTML SSR/isomórfico da Tela de Autenticação (/login, /signup)
 * com botão de 1 Clique para o Modo Demonstração Interativo (E05.T03).
 */
function renderAuthViewMarkup({
  mode = 'login',
  email = '',
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

  return `<section
    data-testid="auth-view"
    data-auth-mode="${isSignup ? 'signup' : 'login'}"
    aria-label="Autenticação e Acesso ao PersonalController"
    class="w-full max-w-md mx-auto px-4 py-8"
  >
    <div
      class="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8 shadow-xl"
      style="background-color: var(--bg-surface); border-color: var(--border-subtle);"
    >
      <div class="flex items-center gap-3 mb-6">
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white">
          ${LOCK_ICON_SVG}
        </span>
        <div>
          <h1 class="text-lg md:text-xl font-bold tracking-tight text-slate-50">PersonalController</h1>
          <p class="text-xs text-slate-300">Gestão financeira acionável e carteira consolidada</p>
        </div>
      </div>

      <!-- Alternância Fluida Entrar / Criar Conta -->
      <div
        role="tablist"
        aria-label="Modo de autenticação"
        class="grid grid-cols-2 gap-2 p-1 mb-6 rounded-xl bg-slate-950 border border-slate-800"
      >
        <button
          type="button"
          role="tab"
          data-testid="auth-mode-login"
          aria-selected="${!isSignup ? 'true' : 'false'}"
          class="touch-target rounded-lg text-xs md:text-sm font-semibold transition-colors ${
            !isSignup ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
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
          class="touch-target rounded-lg text-xs md:text-sm font-semibold transition-colors ${
            isSignup ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
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
            class="touch-target w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style="min-height: 44px;"
          />
        </div>

        <div>
          <label for="auth-password-input" class="block text-xs font-medium text-slate-300 mb-1.5">
            Senha (mín. 8 caracteres)
          </label>
          <input
            id="auth-password-input"
            name="password"
            type="password"
            autocomplete="${passwordAutocomplete}"
            required
            minlength="8"
            placeholder="••••••••"
            data-testid="auth-password-input"
            class="touch-target w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style="min-height: 44px;"
          />
        </div>

        <button
          type="submit"
          data-testid="auth-submit-btn"
          ${isSubmitting ? 'disabled' : ''}
          class="touch-target w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm py-3 shadow-sm transition-colors"
          style="min-height: 48px;"
        >
          ${escapeHtml(submitLabel)}
        </button>
      </form>

      <div class="relative my-6 flex items-center justify-center">
        <div class="border-t border-slate-800 w-full"></div>
        <span class="bg-slate-900 px-3 text-xs text-slate-400 uppercase tracking-wider">ou explore agora</span>
        <div class="border-t border-slate-800 w-full"></div>
      </div>

      <!-- Modo Demonstração Interativo (1 Clique) -->
      <button
        type="button"
        data-testid="demo-mode-btn"
        class="touch-target w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 font-semibold text-sm py-3 transition-colors"
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
    isSubmitting = false,
    errorMessage = null,
    successMessage = null,
    onModeChange,
    onFieldChange,
    onSubmit,
    onDemoStart
  } = props;

  const isSignup = mode === 'signup';

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

const SESSION_STORAGE_KEY = 'pc_auth_session';

/**
 * Controlador de autenticação (`/login`, `/signup`, `/logout`) e Modo Demonstração (E05.T03).
 */
function createAuthViewController({
  initialMode = 'login',
  baseUrl = '/api',
  fetchImpl = global.fetch,
  storage = null,
  onAuthenticated,
  onDemoActivated,
  onLoggedOut
} = {}) {
  let state = {
    mode: initialMode === 'signup' ? 'signup' : 'login',
    email: '',
    password: '',
    isSubmitting: false,
    errorMessage: null,
    successMessage: null,
    user: null,
    session: null,
    isDemoMode: false,
    demoData: null
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
    if (field !== 'email' && field !== 'password') return getState();
    state = {
      ...state,
      [field]: value,
      errorMessage: null
    };
    return getState();
  }

  function persistSession(sessionPayload) {
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionPayload));
    }
  }

  function clearPersistedSession() {
    if (storage && typeof storage.removeItem === 'function') {
      storage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  async function submit() {
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

      state = {
        ...state,
        isSubmitting: false,
        user: result.user,
        session: result.session,
        isDemoMode: false,
        demoData: null,
        password: '',
        successMessage: result.message
      };

      if (result.session) {
        persistSession({
          user: result.user,
          session: result.session,
          isDemoMode: false
        });
      }

      if (typeof onAuthenticated === 'function') {
        onAuthenticated(getState());
      }

      return { ok: true, user: result.user, session: result.session };
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
    state = {
      ...state,
      user: demoData.user,
      session: { token_type: 'demo', expires_at: null },
      isDemoMode: true,
      demoData,
      errorMessage: null,
      successMessage: 'Modo Demonstração ativado com sucesso!'
    };

    persistSession({
      user: demoData.user,
      isDemoMode: true
    });

    if (typeof onDemoActivated === 'function') {
      onDemoActivated(demoData, getState());
    }

    return demoData;
  }

  async function logout() {
    const token = state.session?.access_token; // allowlist-secret
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
      isDemoMode: false,
      demoData: null,
      password: '',
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
      isSubmitting: state.isSubmitting,
      errorMessage: state.errorMessage,
      successMessage: state.successMessage
    });
  }

  return {
    getState,
    setMode,
    setField,
    submit,
    enterDemoMode,
    logout,
    getMarkup
  };
}

module.exports = {
  SESSION_STORAGE_KEY,
  renderAuthViewMarkup,
  createAuthViewElement,
  createAuthViewController
};
