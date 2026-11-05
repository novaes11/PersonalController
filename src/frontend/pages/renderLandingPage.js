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
function renderLandingPage(options = {}) {
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

  const pageTitle = mode === 'signup'
    ? 'PersonalController — Criar Conta'
    : 'PersonalController — Entrar na Conta';

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="${normalizedTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="${themeColor}" />
  <meta name="description" content="PersonalController — Autenticação Segura e Acesso ao Dashboard Financeiro" />
  <title>${pageTitle}</title>

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

      const EYE_ICON_SVG = '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      const EYE_OFF_ICON_SVG = '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

      function saveSessionStorage(sessionObj) {
        const serialized = JSON.stringify(sessionObj);
        try {
          localStorage.setItem(STORAGE_KEY, serialized);
        } catch (err) {}
        try {
          sessionStorage.setItem(STORAGE_KEY, serialized);
        } catch (err) {}
      }

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
      const confirmContainer = document.getElementById('confirm-password-container');
      const confirmPasswordInput = document.querySelector('[data-testid="auth-confirm-password-input"]'); // allowlist-secret
      const passwordRequirements = document.getElementById('password-requirements');
      const passwordReqCounter = document.getElementById('password-req-counter');
      const authFooterToggleBtn = document.getElementById('auth-footer-toggle-btn');
      const authFooterText = document.getElementById('auth-footer-text');

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

      function translateErrorMessage(rawMessage, isSignup) {
        if (!rawMessage) {
          return isSignup ? 'Erro ao criar conta.' : 'Credenciais inválidas.';
        }
        const lower = String(rawMessage).toLowerCase();
        if (lower.includes('already registered') || lower.includes('already exists')) {
          return 'Este endereço de e-mail já está cadastrado. Tente entrar na conta.';
        }
        if (lower.includes('invalid login credentials')) {
          return 'E-mail ou senha incorretos.';
        }
        if (lower.includes('email not confirmed')) {
          return 'Confirme seu e-mail antes de fazer login (verifique sua caixa de entrada).';
        }
        return rawMessage;
      }

      function checkPassword(pwd, confirm) {
        return {
          length: pwd.length >= 8,
          uppercase: /[A-Z]/.test(pwd),
          lowercase: /[a-z]/.test(pwd),
          number: /[0-9]/.test(pwd),
          special: /[^A-Za-z0-9]/.test(pwd),
          match: Boolean(pwd.length > 0 && confirm.length > 0 && pwd === confirm)
        };
      }

      function updatePasswordRequirements() {
        const pwd = passwordInput ? passwordInput.value : '';
        const confirm = confirmPasswordInput ? confirmPasswordInput.value : '';
        const rules = checkPassword(pwd, confirm);

        let metCount = 0;
        for (const [key, isMet] of Object.entries(rules)) {
          if (isMet) metCount++;
          const itemEl = document.querySelector('[data-requirement="' + key + '"]');
          if (itemEl) {
            if (isMet) {
              itemEl.className = 'flex items-center gap-2 text-emerald-300 font-medium transition-colors';
              const indicator = itemEl.querySelector('.req-indicator');
              if (indicator) {
                indicator.className = 'req-indicator w-3.5 h-3.5 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs shrink-0 font-bold';
                indicator.textContent = '✓';
              }
            } else {
              itemEl.className = 'flex items-center gap-2 text-slate-400 transition-colors';
              const indicator = itemEl.querySelector('.req-indicator');
              if (indicator) {
                indicator.className = 'req-indicator w-3.5 h-3.5 flex items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-500 shrink-0';
                indicator.textContent = '•';
              }
            }
          }
        }

        if (passwordReqCounter) {
          passwordReqCounter.textContent = metCount + '/6';
          if (metCount === 6) {
            passwordReqCounter.className = 'text-[10px] text-emerald-400 font-semibold';
          } else {
            passwordReqCounter.className = 'text-[10px] text-slate-400';
          }
        }
      }

      function setMode(newMode) {
        currentMode = newMode;
        if (authView) authView.dataset.authMode = newMode;
        const isSignup = newMode === 'signup';
        clearAlerts();

        if (loginTab) {
          loginTab.setAttribute('aria-selected', !isSignup ? 'true' : 'false');
          loginTab.className = !isSignup
            ? 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-all bg-indigo-600 text-white shadow-sm'
            : 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-all text-slate-400 hover:text-slate-200';
        }

        if (signupTab) {
          signupTab.setAttribute('aria-selected', isSignup ? 'true' : 'false');
          signupTab.className = isSignup
            ? 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-all bg-indigo-600 text-white shadow-sm'
            : 'touch-target rounded-lg text-xs md:text-sm font-semibold transition-all text-slate-400 hover:text-slate-200';
        }

        if (submitBtn) {
          submitBtn.textContent = isSignup ? 'Criar Conta Segura' : 'Entrar na Conta';
        }

        if (passwordInput) {
          passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
        }

        if (confirmContainer) {
          if (isSignup) {
            confirmContainer.classList.remove('hidden');
            confirmContainer.classList.add('block');
          } else {
            confirmContainer.classList.remove('block');
            confirmContainer.classList.add('hidden');
          }
        }

        if (passwordRequirements) {
          if (isSignup) {
            passwordRequirements.classList.remove('hidden');
            passwordRequirements.classList.add('block');
            updatePasswordRequirements();
          } else {
            passwordRequirements.classList.remove('block');
            passwordRequirements.classList.add('hidden');
          }
        }

        if (authFooterText) {
          authFooterText.textContent = isSignup ? 'Já possui uma conta?' : 'Não possui uma conta?';
        }

        if (authFooterToggleBtn) {
          authFooterToggleBtn.textContent = isSignup ? 'Fazer login' : 'Criar conta';
        }

        document.title = isSignup
          ? 'PersonalController — Criar Conta'
          : 'PersonalController — Entrar na Conta';

        const newUrl = isSignup ? '/signup' : '/login';
        if (window.location.pathname !== newUrl && !window.location.pathname.startsWith('/api')) {
          history.pushState(null, '', newUrl);
        }
      }

      if (loginTab) loginTab.addEventListener('click', () => setMode('login'));
      if (signupTab) signupTab.addEventListener('click', () => setMode('signup'));
      if (authFooterToggleBtn) {
        authFooterToggleBtn.addEventListener('click', () => {
          setMode(currentMode === 'signup' ? 'login' : 'signup');
        });
      }

      // Verificação em tempo real por digitação (evento input)
      if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordRequirements);
        passwordInput.addEventListener('keyup', updatePasswordRequirements);
      }
      if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', updatePasswordRequirements);
        confirmPasswordInput.addEventListener('keyup', updatePasswordRequirements);
      }

      // Alternância de visibilidade de senha (ícone de olho)
      document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-toggle-password');
          const targetInput = document.getElementById(targetId);
          if (!targetInput) return;
          const isPass = targetInput.type === 'password';
          targetInput.type = isPass ? 'text' : 'password';
          btn.innerHTML = isPass ? EYE_OFF_ICON_SVG : EYE_ICON_SVG;
          btn.setAttribute('aria-label', isPass ? 'Ocultar senha' : 'Exibir senha');
        });
      });

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
          saveSessionStorage(demoSession);
          showAlert('success', 'Acesso ao Modo Demonstração concedido! Redirecionando...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 300);
        });
      }

      // Envio do Formulário de Login / Signup
      if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          clearAlerts();

          const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
          const password = passwordInput ? passwordInput.value : ''; // allowlist-secret
          const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : ''; // allowlist-secret

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

          if (currentMode === 'signup') {
            if (!confirmPassword) {
              showAlert('error', 'Por favor, confirme sua senha.');
              if (confirmPasswordInput) confirmPasswordInput.focus();
              return;
            }

            if (password !== confirmPassword) {
              showAlert('error', 'As senhas não coincidem.');
              if (confirmPasswordInput) confirmPasswordInput.focus();
              return;
            }

            const reqs = checkPassword(password, confirmPassword);
            if (!reqs.length || !reqs.uppercase || !reqs.lowercase || !reqs.number || !reqs.special) {
              showAlert('error', 'A senha informada não atende a todos os requisitos de segurança.');
              if (passwordInput) passwordInput.focus();
              return;
            }
          }

          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = currentMode === 'signup' ? 'Criando conta...' : 'Autenticando...';
          }

          try {
            const endpoint = currentMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
            const fallbackEndpoint = currentMode === 'signup' ? '/auth/signup' : '/auth/login';
            // Nota de Segurança (SEC-04): payload estrito apenas com email e password
            const requestInit = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            };

            let response = await fetch(endpoint, requestInit);
            if (response.status === 404) {
              response = await fetch(fallbackEndpoint, requestInit);
            }

            let data = {};
            try {
              data = await response.json();
            } catch (parseErr) {
              data = { message: 'Resposta inesperada do servidor (HTTP ' + response.status + ').' };
            }

            if (!response.ok) {
              const firstFieldError = Array.isArray(data.errors) && data.errors[0]?.message;
              const rawMsg = firstFieldError || data.message;
              const msg = translateErrorMessage(rawMsg, currentMode === 'signup');
              showAlert('error', msg);
              return;
            }

            // Sessão autenticada com sucesso
            const sessionData = {
              token: data.token || data.session?.access_token || 'session-' + Date.now(), // allowlist-secret
              user: data.user || { email },
              isDemo: false
            };
            saveSessionStorage(sessionData);
            showAlert(
              'success',
              currentMode === 'signup'
                ? 'Conta criada com sucesso! Redirecionando para o painel...'
                : 'Autenticação realizada com sucesso! Redirecionando...'
            );
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 400);
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
  renderLandingPage,
  renderAuthPage: renderLandingPage
};
