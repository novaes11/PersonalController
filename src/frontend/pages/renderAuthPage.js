const { getDesignTokensCss } = require('../styles/designSystem');
const { renderAuthViewMarkup } = require('../components/AuthView');

/**
 * Gera o documento HTML5 completo da Tela de Autenticação (/login, /signup)
 * Mobile-First com suporte a 1 Clique para Modo Demo (E05.T03).
 *
 * @param {object} options
 * @param {'login'|'signup'} [options.mode='login']
 * @param {string} [options.email='']
 * @param {string|null} [options.errorMessage=null]
 * @param {string|null} [options.successMessage=null]
 * @param {'dark'|'light'} [options.theme='dark']
 * @returns {string} Documento HTML5 renderizado
 */
function renderAuthPage(options = {}) {
  const {
    mode = 'login',
    email = '',
    errorMessage = null,
    successMessage = null,
    theme = 'dark'
  } = options;

  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  const themeColor = normalizedTheme === 'light' ? '#F8FAFC' : '#0F172A';
  const tokensCss = getDesignTokensCss(); // allowlist-secret

  const authContentHtml = renderAuthViewMarkup({
    mode,
    email,
    errorMessage,
    successMessage
  });

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="${normalizedTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="${themeColor}" />
  <meta name="description" content="PersonalController — Autenticação Segura e Acesso ao Dashboard Financeiro" />
  <title>PersonalController — Entrar na Conta</title>

  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: ['class', '[data-theme="dark"]'],
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          }
        }
      }
    };
  </script>

  <!-- Design Tokens Oficiais -->
  <style id="pc-design-tokens">
${tokensCss}
  </style>

  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background-color: var(--bg-canvas, #020617);
      color: var(--text-primary, #F8FAFC);
      font-family: var(--font-sans, 'Inter', sans-serif);
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    [data-theme="light"] body {
      background-color: var(--bg-canvas, #F8FAFC);
      color: var(--text-primary, #020617);
    }
  </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">
  <main class="w-full max-w-md mx-auto">
    ${authContentHtml}
  </main>

  <script>
    (function () {
      const STORAGE_KEY = 'pc_auth_session';

      // Auto-redirecionamento se já houver sessão ativa salva
      try {
        const existingSession = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
        if (existingSession && !window.location.search.includes('logout=true')) {
          const parsed = JSON.parse(existingSession);
          if (parsed && (parsed.token || parsed.isDemo)) {
            window.location.href = '/dashboard';
            return;
          }
        }
      } catch (err) {
        console.warn('Erro ao verificar sessão local:', err);
      }

      let currentMode = '${mode}';
      const form = document.querySelector('[data-testid="auth-form"]');
      const authView = document.querySelector('[data-testid="auth-view"]');
      const loginTab = document.querySelector('[data-testid="auth-mode-login"]');
      const signupTab = document.querySelector('[data-testid="auth-mode-signup"]');
      const submitBtn = document.querySelector('[data-testid="auth-submit-btn"]');
      const demoBtn = document.querySelector('[data-testid="demo-mode-btn"]');
      const emailInput = document.querySelector('[data-testid="auth-email-input"]');
      const passwordInput = document.querySelector('[data-testid="auth-password-input"]'); // allowlist-secret

      function showAlert(type, message) {
        clearAlerts();
        const alertDiv = document.createElement('div');
        alertDiv.role = type === 'error' ? 'alert' : 'status';
        alertDiv.dataset.testid = type === 'error' ? 'auth-error-alert' : 'auth-success-alert';
        alertDiv.className = type === 'error'
          ? 'mb-4 p-3 rounded-lg border border-rose-500/40 bg-rose-950/60 text-rose-200 text-xs md:text-sm'
          : 'mb-4 p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/60 text-emerald-200 text-xs md:text-sm';
        alertDiv.textContent = message;
        form.parentNode.insertBefore(alertDiv, form);
      }

      function clearAlerts() {
        document.querySelectorAll('[data-testid="auth-error-alert"], [data-testid="auth-success-alert"]')
          .forEach(el => el.remove());
      }

      function setMode(newMode) {
        currentMode = newMode;
        if (authView) authView.dataset.authMode = newMode;
        const isSignup = newMode === 'signup';

        if (loginTab) {
          loginTab.setAttribute('aria-selected', !isSignup ? 'true' : 'false');
          loginTab.className = !isSignup
            ? 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-colors bg-indigo-600 text-white shadow-sm'
            : 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-colors text-slate-300 hover:text-white';
        }

        if (signupTab) {
          signupTab.setAttribute('aria-selected', isSignup ? 'true' : 'false');
          signupTab.className = isSignup
            ? 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-colors bg-indigo-600 text-white shadow-sm'
            : 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-colors text-slate-300 hover:text-white';
        }

        if (submitBtn) {
          submitBtn.textContent = isSignup ? 'Criar Conta Segura' : 'Entrar na Conta';
        }

        if (passwordInput) {
          passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
        }

        const newUrl = isSignup ? '/signup' : '/login';
        if (window.location.pathname !== newUrl && !window.location.pathname.startsWith('/api')) {
          history.pushState(null, '', newUrl);
        }
      }

      if (loginTab) loginTab.addEventListener('click', () => setMode('login'));
      if (signupTab) signupTab.addEventListener('click', () => setMode('signup'));

      // Modo Demonstração (1 Clique)
      if (demoBtn) {
        demoBtn.addEventListener('click', () => {
          const demoSession = {
            isDemo: true,
            user: {
              email: 'demo@personalcontroller.app',
              name: 'Investidor Demo',
              isDemo: true
            },
            token: 'demo-token-' + Date.now() // allowlist-secret
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(demoSession));
          showAlert('success', 'Acesso ao Modo Demonstração concedido! Redirecionando...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 400);
        });
      }

      // Envio do Formulário de Login / Signup
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          clearAlerts();

          const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
          const password = passwordInput ? passwordInput.value : ''; // allowlist-secret

          if (!email || !email.includes('@')) {
            showAlert('error', 'Por favor, informe um endereço de e-mail válido.');
            if (emailInput) emailInput.focus();
            return;
          }

          if (!password || password.length < 8) {
            showAlert('error', 'A senha deve conter no mínimo 8 caracteres.');
            if (passwordInput) passwordInput.focus();
            return;
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = currentMode === 'signup' ? 'Criando conta...' : 'Autenticando...';
          }

          try {
            const endpoint = currentMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
              const msg = data.message || (currentMode === 'signup' ? 'Erro ao criar conta.' : 'Credenciais inválidas.');
              showAlert('error', msg);
              return;
            }

            // Sessão autenticada com sucesso
            const sessionData = {
              token: data.token || data.session?.access_token || 'session-' + Date.now(), // allowlist-secret
              user: data.user || { email },
              isDemo: false
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
            showAlert('success', 'Autenticação realizada com sucesso! Redirecionando...');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 500);
          } catch (err) {
            showAlert('error', 'Falha de conexão com o servidor. Tente novamente.');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = currentMode === 'signup' ? 'Criar Conta Segura' : 'Entrar na Conta';
            }
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  renderAuthPage
};
