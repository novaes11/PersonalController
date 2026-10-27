const { getDesignTokensCss } = require('../styles/designSystem');
const { renderAppShellMarkup } = require('../components/AppShell');
const { renderDashboardViewMarkup } = require('../components/DashboardView');
const { renderCashflowViewMarkup } = require('../components/CashflowView');
const { renderPortfolioViewMarkup } = require('../components/PortfolioView');
const { renderSettingsViewMarkup } = require('../components/SettingsView');
const { renderInboxViewMarkup } = require('../components/InboxView');
const { createDemoDataset } = require('../services/authApi');

/**
 * Gera o documento HTML5 completo da Single-Page Application (SPA) Mobile-First,
 * com suporte completo a abas dinâmicas, header, sidebar e interatividade (E06.T02).
 */
function renderAppPage(options = {}) {
  const {
    activeTab = 'overview',
    theme = 'dark'
  } = options;
  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  const themeColor = normalizedTheme === 'light' ? '#F8FAFC' : '#0F172A';

  const demoData = createDemoDataset();
  const tokensCss = getDesignTokensCss(); // allowlist-secret

  const dashboardContentHtml = renderDashboardViewMarkup({
    transactions: demoData.transactions,
    portfolio: demoData.portfolio,
    categories: demoData.categories,
    monthlyBudget: 5000,
    upcomingExpenses15d: 0,
    isFormOpen: false
  });

  const cashflowContentHtml = renderCashflowViewMarkup({
    transactions: demoData.transactions,
    categories: demoData.categories
  });

  const portfolioContentHtml = renderPortfolioViewMarkup({
    portfolio: demoData.portfolio
  });

  const settingsContentHtml = renderSettingsViewMarkup({
    user: demoData.user,
    theme: normalizedTheme,
    categories: demoData.categories
  });

  const inboxContentHtml = renderInboxViewMarkup();

  // Envelopamento em containers de abas (tab panes) dinâmicos
  const tabsContentHtml = [
    '<div id="tab-pane-overview" data-testid="tab-pane-overview" class="tab-pane ' + (activeTab === 'overview' ? 'block' : 'hidden') + '">',
    dashboardContentHtml,
    '</div>',
    '<div id="tab-pane-cashflow" data-testid="tab-pane-cashflow" class="tab-pane ' + (activeTab === 'cashflow' ? 'block' : 'hidden') + '">',
    cashflowContentHtml,
    '</div>',
    '<div id="tab-pane-portfolio" data-testid="tab-pane-portfolio" class="tab-pane ' + (activeTab === 'portfolio' ? 'block' : 'hidden') + '">',
    portfolioContentHtml,
    '</div>',
    '<div id="tab-pane-settings" data-testid="tab-pane-settings" class="tab-pane ' + (activeTab === 'settings' ? 'block' : 'hidden') + '">',
    settingsContentHtml,
    '</div>',
    '<div id="tab-pane-inbox" data-testid="tab-pane-inbox" class="tab-pane ' + (activeTab === 'inbox' ? 'block' : 'hidden') + '">',
    inboxContentHtml,
    '</div>'
  ].join('\n');

  const appShellHtml = renderAppShellMarkup({
    activeTab,
    theme: normalizedTheme,
    user: demoData.user,
    isRefreshing: false,
    contentHtml: tabsContentHtml
  });

  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="${normalizedTheme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="theme-color" content="${themeColor}" />
  <meta name="description" content="PersonalController — Gestão Financeira Inteligente Mobile-First e Carteira Consolidada" />
  <title>PersonalController — Dashboard Financeiro</title>

  <!-- Google Fonts: Inter & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

  <!-- Tailwind CSS CDN para renderização imediata sem build step -->
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

  <!-- Design Tokens Oficiais (E05.T01) -->
  <style id="pc-design-tokens">
${tokensCss}
  </style>

  <style>
    /* Estilos complementares de acessibilidade e transições suaves */
    body {
      margin: 0;
      padding: 0;
      background-color: var(--bg-canvas, #020617);
      color: var(--text-primary, #F8FAFC);
      font-family: var(--font-sans, 'Inter', sans-serif);
      -webkit-font-smoothing: antialiased;
      -webkit-tap-highlight-color: transparent;
    }

    [data-theme="light"] body {
      background-color: var(--bg-canvas, #F8FAFC);
      color: var(--text-primary, #020617);
    }

    /* Paridade global de tema (light) para utilitários Tailwind usados nos componentes SSR */
    [data-theme="light"] .bg-slate-950,
    [data-theme="light"] .bg-slate-950\\/95,
    [data-theme="light"] .bg-slate-950\\/90,
    [data-theme="light"] .bg-slate-950\\/60,
    [data-theme="light"] .bg-slate-950\\/50,
    [data-theme="light"] .bg-slate-950\\/40,
    [data-theme="light"] .bg-slate-900,
    [data-theme="light"] .bg-slate-900\\/95,
    [data-theme="light"] .bg-slate-900\\/90,
    [data-theme="light"] .bg-slate-900\\/50,
    [data-theme="light"] .bg-slate-900\\/40,
    [data-theme="light"] .bg-slate-800,
    [data-theme="light"] .bg-slate-800\\/80,
    [data-theme="light"] .bg-slate-800\\/60,
    [data-theme="light"] .bg-slate-800\\/40,
    [data-theme="light"] .bg-slate-800\\/30 {
      background-color: var(--bg-surface) !important;
    }

    [data-theme="light"] .border-slate-900,
    [data-theme="light"] .border-slate-800,
    [data-theme="light"] .border-slate-800\\/80,
    [data-theme="light"] .border-slate-800\\/70,
    [data-theme="light"] .border-slate-800\\/60,
    [data-theme="light"] .border-slate-700 {
      border-color: var(--border-subtle) !important;
    }

    [data-theme="light"] .text-white,
    [data-theme="light"] .text-slate-100,
    [data-theme="light"] .text-slate-50 {
      color: var(--text-primary) !important;
    }

    [data-theme="light"] .text-slate-400,
    [data-theme="light"] .text-slate-300,
    [data-theme="light"] .text-slate-200 {
      color: var(--text-secondary) !important;
    }

    [data-theme="light"] .hover\\:bg-slate-900\\/60:hover,
    [data-theme="light"] .hover\\:bg-slate-900\\/50:hover,
    [data-theme="light"] .hover\\:bg-slate-800:hover,
    [data-theme="light"] .hover\\:bg-slate-700:hover {
      background-color: var(--bg-elevated) !important;
    }

    [data-theme="light"] .hover\\:text-white:hover,
    [data-theme="light"] .hover\\:text-slate-100:hover {
      color: var(--text-primary) !important;
    }

    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }

    /* Container de Toasts de Notificação */
    #pc-toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }

    .pc-toast {
      pointer-events: auto;
      animation: toastFadeIn 0.25s ease-out;
    }

    @keyframes toastFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div id="app-root">
    ${appShellHtml}
  </div>

  <div id="pc-toast-container" aria-live="polite" aria-atomic="true"></div>

  <!-- Runtime Interativo SPA do Cliente (E06.T02) -->
  <script>
    (function () {
      // Estado reativo em memória
      var state = {
        theme: '${normalizedTheme}',
        activeTab: '${activeTab}',
        isFormOpen: false,
        isRefreshing: false,
        cashflowFilter: 'ALL',
        cashflowSearch: '',
        transactions: ${JSON.stringify(demoData.transactions)},
        categories: ${JSON.stringify(demoData.categories)},
        portfolio: ${JSON.stringify(demoData.portfolio)},
        monthlyBudget: 5000,
        upcomingExpenses15d: 0
      };

      // Exibição de Toasts Flutuantes Acessíveis
      function showToast(message, type) {
        var container = document.getElementById('pc-toast-container');
        if (!container) return;

        var toast = document.createElement('div');
        toast.setAttribute('role', 'status');
        toast.className = 'pc-toast flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg text-xs font-medium ' +
          (type === 'error'
            ? 'bg-rose-950 text-rose-200 border-rose-800'
            : 'bg-slate-900 text-slate-100 border-slate-700');

        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(function () {
          toast.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(function () { toast.remove(); }, 300);
        }, 2500);
      }

      // Alternância de Tema (Dark / Light) com Persistência
      function applyTheme(nextTheme) {
        state.theme = nextTheme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        var appShell = document.querySelector('[data-testid="app-shell"]');
        if (appShell) appShell.setAttribute('data-theme', state.theme);
        var themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
          themeMeta.setAttribute('content', state.theme === 'light' ? '#F8FAFC' : '#0F172A');
        }

        try {
          localStorage.setItem('pc_theme', state.theme);
        } catch (e) {}

        document.querySelectorAll('[data-testid="theme-toggle-btn"], [data-testid="sidebar-theme-toggle-btn"]')
          .forEach(function (btn) { btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'); });

        document.querySelectorAll('[data-theme-select]').forEach(function (btn) {
          var isSelected = btn.getAttribute('data-theme-select') === state.theme;
          if (isSelected) {
            btn.classList.add('border-indigo-500', 'bg-slate-800/80');
            btn.classList.remove('border-slate-800', 'bg-slate-950/50');
          } else {
            btn.classList.remove('border-indigo-500', 'bg-slate-800/80');
            btn.classList.add('border-slate-800', 'bg-slate-950/50');
          }
        });
      }

      function toggleTheme() {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
        showToast('Tema alterado para modo ' + (state.theme === 'light' ? 'Claro' : 'Escuro'));
      }

      try {
        var savedTheme = localStorage.getItem('pc_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          state.theme = savedTheme;
        }
      } catch (e) {}
      applyTheme(state.theme);

      document.querySelectorAll('[data-testid="theme-toggle-btn"], [data-testid="sidebar-theme-toggle-btn"]')
        .forEach(function (btn) { btn.addEventListener('click', toggleTheme); });

      document.querySelectorAll('[data-theme-select]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var selected = btn.getAttribute('data-theme-select');
          if (selected) {
            applyTheme(selected);
            showToast('Tema alterado para modo ' + (selected === 'light' ? 'Claro' : 'Escuro'));
          }
        });
      });

      // Ação Unificada de Logout / Retorno para Login
      function handleLogout() {
        try {
          localStorage.removeItem('pc_auth_session');
          sessionStorage.removeItem('pc_auth_session');
        } catch (err) {}
        window.location.href = '/login?logout=true';
      }

      document.querySelectorAll('[data-testid="logout-btn"], [data-testid="account-indicator"], [data-testid="sidebar-account-indicator"], [data-testid="settings-logout-btn"]')
        .forEach(function (el) {
          el.style.cursor = 'pointer';
          el.title = 'Clique para sair da conta ou trocar de usuário';
          el.addEventListener('click', handleLogout);
        });

      var TAB_META = {
        overview: {
          title: 'Visão Geral',
          description: 'Dashboard principal de liquidez, burn rate e alocação'
        },
        cashflow: {
          title: 'Fluxo de Caixa',
          description: 'Lançamentos, orçamentos e despesas recorrentes'
        },
        portfolio: {
          title: 'Carteira',
          description: 'Posição consolidada, rentabilidade e distribuição de ativos'
        },
        settings: {
          title: 'Configurações',
          description: 'Categorias, preferências de conta e aparência'
        },
        inbox: {
          title: 'Inbox / Produtividade',
          description: 'E-mails lidos, alertas gerados por IA e triagem pendente'
        }
      };

      // Alternância de Abas com Mudança Dinâmica de Conteúdo
      function switchTab(tabId) {
        if (!TAB_META[tabId]) tabId = 'overview';
        state.activeTab = tabId;

        document.querySelectorAll('[data-nav-tab]').forEach(function (btn) {
          var isCurrent = btn.getAttribute('data-nav-tab') === tabId;
          btn.setAttribute('aria-current', isCurrent ? 'page' : 'false');
          if (btn.hasAttribute('data-testid') && btn.getAttribute('data-testid').startsWith('sidebar-tab-')) {
            btn.className = isCurrent
              ? 'touch-target w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white shadow-sm'
              : 'touch-target w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white';
          } else if (btn.hasAttribute('data-testid') && btn.getAttribute('data-testid').startsWith('bottom-nav-tab-')) {
            btn.className = isCurrent
              ? 'touch-target flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors text-indigo-400'
              : 'touch-target flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors text-slate-400 hover:text-slate-100';
          }
        });

        var viewTitle = document.querySelector('[data-testid="active-view-title"]');
        if (viewTitle) viewTitle.textContent = TAB_META[tabId].title;
        var viewDesc = document.querySelector('[data-testid="active-view-description"]');
        if (viewDesc) viewDesc.textContent = TAB_META[tabId].description;

        document.querySelectorAll('.tab-pane').forEach(function (pane) {
          pane.classList.remove('block');
          pane.classList.add('hidden');
        });
        var activePane = document.getElementById('tab-pane-' + tabId);
        if (activePane) {
          activePane.classList.remove('hidden');
          activePane.classList.add('block');
        }

        try {
          var url = new URL(window.location.href);
          url.searchParams.set('tab', tabId);
          window.history.replaceState(null, '', url.toString());
        } catch (e) {}
      }

      document.querySelectorAll('[data-nav-tab]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          switchTab(btn.getAttribute('data-nav-tab'));
        });
      });

      try {
        var urlParams = new URLSearchParams(window.location.search);
        var tabFromUrl = urlParams.get('tab') || window.location.hash.replace('#', '');
        if (tabFromUrl && TAB_META[tabFromUrl]) {
          switchTab(tabFromUrl);
        }
      } catch (e) {}

      // Ação de Atualização Funcional (Header, Sidebar e Portfolio Sync)
      function triggerRefreshAction() {
        if (state.isRefreshing) return;
        state.isRefreshing = true;

        var refreshBtns = document.querySelectorAll(
          '[data-testid="quick-refresh-btn"], [data-testid="sidebar-refresh-btn"], [data-testid="portfolio-sync-quotes-btn"]'
        );

        refreshBtns.forEach(function (btn) {
          btn.setAttribute('aria-busy', 'true');
          var svg = btn.querySelector('svg');
          if (svg) svg.classList.add('animate-spin');
        });

        setTimeout(function () {
          recalculateAndRender();
          refreshBtns.forEach(function (btn) {
            btn.setAttribute('aria-busy', 'false');
            var svg = btn.querySelector('svg');
            if (svg) svg.classList.remove('animate-spin');
          });
          state.isRefreshing = false;
          showToast('Dados e cotações sincronizados com sucesso!');
        }, 500);
      }

      document.querySelectorAll('[data-testid="quick-refresh-btn"], [data-testid="sidebar-refresh-btn"], [data-testid="portfolio-sync-quotes-btn"]')
        .forEach(function (btn) { btn.addEventListener('click', triggerRefreshAction); });

      function setQuickActionExpanded(isExpanded) {
        document.querySelectorAll('[data-testid="quick-new-transaction-btn"], [data-testid="sidebar-new-transaction-btn"], [data-testid="cashflow-add-btn"]')
          .forEach(function (btn) { btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false'); });
      }

      function formatCurrencyBRL(value) {
        var amount = Number(value) || 0;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }

      function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function createTableRowElement(transaction) {
        var tx = transaction || {};
        var type = tx.categories?.type || tx.category?.type || 'EXPENSE';
        var isIncome = type === 'INCOME';
        var txId = escapeHtml(tx.id);
        var description = escapeHtml(tx.description || 'Sem descrição');
        var categoryName = escapeHtml(tx.categories?.name || tx.category?.name || 'Sem categoria');
        var tr = document.createElement('tr');
        tr.setAttribute('data-testid', 'transaction-row-' + txId);
        tr.setAttribute('data-transaction-id', txId);
        tr.className = 'border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors';
        tr.innerHTML = [
          '<td class="py-3.5 px-4 text-sm text-slate-300 whitespace-nowrap">' + String(tx.date || '').split('-').reverse().join('/') + '</td>',
          '<td class="py-3.5 px-4 text-sm font-medium text-slate-100">' + description + '</td>',
          '<td class="py-3.5 px-4 text-sm text-slate-300"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">' + categoryName + '</span></td>',
          '<td class="py-3.5 px-4 text-sm whitespace-nowrap"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ' + (isIncome ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/70 text-rose-300 border-rose-800/60') + '">' + (isIncome ? 'Receita' : 'Despesa') + '</span></td>',
          '<td class="py-3.5 px-4 text-sm font-semibold text-right whitespace-nowrap ' + (isIncome ? 'text-emerald-400' : 'text-rose-400') + '">' + (isIncome ? '+' : '-') + ' R$ ' + formatCurrencyBRL(tx.amount) + '</td>',
          '<td class="py-3.5 px-4 text-sm text-right whitespace-nowrap">',
          '  <button type="button" data-action="delete" data-tx-id="' + txId + '" data-transaction-id="' + txId + '" aria-label="Excluir transação ' + description + '" class="delete-btn touch-target inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 transition-colors" style="min-height: 44px; min-width: 44px;">Excluir</button>',
          '</td>'
        ].join('');
        return tr;
      }

      function createMobileCardElement(transaction) {
        var tx = transaction || {};
        var type = tx.categories?.type || tx.category?.type || 'EXPENSE';
        var isIncome = type === 'INCOME';
        var txId = escapeHtml(tx.id);
        var description = escapeHtml(tx.description || 'Sem descrição');
        var categoryName = escapeHtml(tx.categories?.name || tx.category?.name || 'Sem categoria');
        var li = document.createElement('li');
        li.setAttribute('data-testid', 'transaction-card-' + txId);
        li.className = 'rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3';
        li.innerHTML = [
          '<div class="flex items-start justify-between gap-2">',
          '  <div>',
          '    <p class="text-sm font-semibold text-slate-100">' + description + '</p>',
          '    <p class="text-xs text-slate-400 mt-1">' + String(tx.date || '').split('-').reverse().join('/') + '</p>',
          '  </div>',
          '  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ' + (isIncome ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/70 text-rose-300 border-rose-800/60') + '">' + (isIncome ? 'Receita' : 'Despesa') + '</span>',
          '</div>',
          '<div class="flex items-center justify-between gap-2">',
          '  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">' + categoryName + '</span>',
          '  <span class="text-sm font-semibold ' + (isIncome ? 'text-emerald-400' : 'text-rose-400') + '">' + (isIncome ? '+' : '-') + ' R$ ' + formatCurrencyBRL(tx.amount) + '</span>',
          '</div>',
          '<button type="button" data-action="delete" data-tx-id="' + txId + '" data-transaction-id="' + txId + '" aria-label="Excluir transação ' + description + '" class="delete-btn touch-target w-full inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 transition-colors" style="min-height: 44px; min-width: 44px;">Excluir</button>'
        ].join('');
        return li;
      }

      function createCashflowRowElement(transaction) {
        var tx = transaction || {};
        var type = tx.category?.type || tx.categories?.type || 'EXPENSE';
        var isIncome = type === 'INCOME';
        var txId = escapeHtml(tx.id);
        var description = escapeHtml(tx.description || 'Sem descrição');
        var categoryName = escapeHtml(tx.category?.name || tx.categories?.name || 'Sem categoria');
        var tr = document.createElement('tr');
        tr.setAttribute('data-testid', 'cashflow-row-' + txId);
        tr.setAttribute('data-cashflow-tx-id', txId);
        tr.setAttribute('data-tx-type', type);
        tr.className = 'border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors';
        tr.innerHTML = [
          '<td class="py-3.5 px-4 text-sm text-slate-300 whitespace-nowrap">' + String(tx.date || '').split('-').reverse().join('/') + '</td>',
          '<td class="py-3.5 px-4 text-sm font-medium text-slate-100">' + description + '</td>',
          '<td class="py-3.5 px-4 text-sm text-slate-300"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">' + categoryName + '</span></td>',
          '<td class="py-3.5 px-4 text-sm whitespace-nowrap"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ' + (isIncome ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/70 text-rose-300 border-rose-800/60') + '">' + (isIncome ? 'Receita' : 'Despesa') + '</span></td>',
          '<td class="py-3.5 px-4 text-sm font-semibold text-right whitespace-nowrap ' + (isIncome ? 'text-emerald-400' : 'text-rose-400') + '">' + (isIncome ? '+' : '-') + ' R$ ' + formatCurrencyBRL(tx.amount) + '</td>',
          '<td class="py-3.5 px-4 text-sm text-right whitespace-nowrap">',
          '  <button type="button" data-action="delete" data-tx-id="' + txId + '" aria-label="Excluir transação ' + description + '" class="delete-btn touch-target inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors" style="min-height: 44px; min-width: 44px;">Excluir</button>',
          '</td>'
        ].join('');
        return tr;
      }

      function createCashflowMobileCardElement(transaction) {
        var tx = transaction || {};
        var type = tx.category?.type || tx.categories?.type || 'EXPENSE';
        var isIncome = type === 'INCOME';
        var txId = escapeHtml(tx.id);
        var description = escapeHtml(tx.description || 'Sem descrição');
        var categoryName = escapeHtml(tx.category?.name || tx.categories?.name || 'Sem categoria');
        var li = document.createElement('li');
        li.setAttribute('data-testid', 'cashflow-mobile-card-' + txId);
        li.setAttribute('data-cashflow-tx-id', txId);
        li.setAttribute('data-tx-type', type);
        li.className = 'rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3';
        li.innerHTML = [
          '<div class="flex items-start justify-between gap-2">',
          '  <div>',
          '    <p class="text-sm font-semibold text-slate-100">' + description + '</p>',
          '    <p class="text-xs text-slate-400 mt-1">' + String(tx.date || '').split('-').reverse().join('/') + '</p>',
          '  </div>',
          '  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ' + (isIncome ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/70 text-rose-300 border-rose-800/60') + '">' + (isIncome ? 'Receita' : 'Despesa') + '</span>',
          '</div>',
          '<div class="flex items-center justify-between gap-2">',
          '  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">' + categoryName + '</span>',
          '  <span class="text-sm font-semibold ' + (isIncome ? 'text-emerald-400' : 'text-rose-400') + '">' + (isIncome ? '+' : '-') + ' R$ ' + formatCurrencyBRL(tx.amount) + '</span>',
          '</div>',
          '<button type="button" data-action="delete" data-tx-id="' + txId + '" aria-label="Excluir transação ' + description + '" class="delete-btn touch-target w-full inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors" style="min-height: 44px; min-width: 44px;">Excluir</button>'
        ].join('');
        return li;
      }

      function prependTransactionViews(transaction) {
        var tbody = document.querySelector('[data-testid="transactions-table-body"]');
        if (tbody) tbody.prepend(createTableRowElement(transaction));
        var mobileList = document.querySelector('[data-testid="transactions-mobile-list"]');
        if (mobileList) mobileList.prepend(createMobileCardElement(transaction));

        var cashflowBody = document.getElementById('cashflow-table-body');
        if (cashflowBody) cashflowBody.prepend(createCashflowRowElement(transaction));
        var cashflowMobileList = document.getElementById('cashflow-mobile-list');
        if (cashflowMobileList) cashflowMobileList.prepend(createCashflowMobileCardElement(transaction));
      }

      function removeTransactionViews(transactionId) {
        var row = document.querySelector('[data-testid="transaction-row-' + transactionId + '"]');
        if (row) row.remove();
        var card = document.querySelector('[data-testid="transaction-card-' + transactionId + '"]');
        if (card) card.remove();

        var cfRow = document.querySelector('[data-testid="cashflow-row-' + transactionId + '"]');
        if (cfRow) cfRow.remove();
        var cfCard = document.querySelector('[data-testid="cashflow-mobile-card-' + transactionId + '"]');
        if (cfCard) cfCard.remove();
      }

      function applyCashflowFilters() {
        var searchTerm = (state.cashflowSearch || '').toLowerCase().trim();
        var filterType = state.cashflowFilter;

        var visibleCount = 0;

        var updateItem = function (el) {
          var txType = el.getAttribute('data-tx-type');
          var text = (el.textContent || '').toLowerCase();
          var matchesType = filterType === 'ALL' || txType === filterType;
          var matchesSearch = !searchTerm || text.includes(searchTerm);

          if (matchesType && matchesSearch) {
            el.style.display = '';
            visibleCount++;
          } else {
            el.style.display = 'none';
          }
        };

        document.querySelectorAll('#cashflow-table-body tr[data-cashflow-tx-id]').forEach(updateItem);
        document.querySelectorAll('#cashflow-mobile-list li[data-cashflow-tx-id]').forEach(updateItem);

        var countElem = document.getElementById('cashflow-visible-count');
        if (countElem) {
          countElem.textContent = String(Math.floor(visibleCount / 2) || visibleCount);
        }
      }

      document.querySelectorAll('.filter-pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.cashflowFilter = btn.getAttribute('data-filter-type') || 'ALL';
          document.querySelectorAll('.filter-pill').forEach(function (p) {
            p.classList.remove('bg-indigo-600', 'text-white');
            p.classList.add('bg-slate-800', 'text-slate-300');
          });
          btn.classList.add('bg-indigo-600', 'text-white');
          btn.classList.remove('bg-slate-800', 'text-slate-300');
          applyCashflowFilters();
        });
      });

      var searchInput = document.getElementById('cashflow-search');
      if (searchInput) {
        searchInput.addEventListener('input', function (e) {
          state.cashflowSearch = e.target.value;
          applyCashflowFilters();
        });
      }

      // Modal / Bottom Sheet de Nova Transação
      function toggleNewTransactionForm() {
        var existingModal = document.getElementById('quick-transaction-modal');
        if (existingModal) {
          existingModal.remove();
          state.isFormOpen = false;
          setQuickActionExpanded(false);
          return;
        }

        var modal = document.createElement('div');
        modal.id = 'quick-transaction-modal';
        modal.className = 'fixed inset-0 z-50 flex items-end md:items-center justify-center';

        var categoryOptions = state.categories.map(function (c) {
          return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + ' (' + escapeHtml(c.type) + ')</option>';
        }).join('');

        modal.innerHTML = [
          '<button type="button" data-testid="quick-transaction-backdrop" aria-label="Fechar formulário de nova transação" class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"></button>',
          '<div role="dialog" aria-modal="true" aria-label="Nova Transação" class="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-2xl" style="padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));">',
          '  <div class="flex items-center justify-between mb-4">',
          '    <h3 class="text-base font-bold text-slate-100">+ Nova Transação Manual</h3>',
          '    <button type="button" id="close-modal-btn" class="touch-target inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700" style="min-height: 44px; min-width: 44px;">Fechar</button>',
          '  </div>',
          '  <form id="inline-tx-form" class="space-y-4">',
          '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">',
          '      <div>',
          '        <label class="block text-xs font-medium text-slate-300 mb-1">Valor (R$)</label>',
          '        <input type="number" step="0.01" min="0.01" id="tx-amount" required placeholder="0,00" inputmode="decimal" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;" />',
          '      </div>',
          '      <div>',
          '        <label class="block text-xs font-medium text-slate-300 mb-1">Data</label>',
          '        <input type="date" id="tx-date" required value="' + new Date().toISOString().slice(0, 10) + '" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;" />',
          '      </div>',
          '    </div>',
          '    <div>',
          '      <label class="block text-xs font-medium text-slate-300 mb-1">Descrição</label>',
          '      <input type="text" id="tx-description" placeholder="Ex: Supermercado, Aluguel, Pro-labore" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;" />',
          '    </div>',
          '    <div>',
          '      <label class="block text-xs font-medium text-slate-300 mb-1">Categoria</label>',
          '      <select id="tx-category" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;">',
          categoryOptions,
          '      </select>',
          '    </div>',
          '    <button type="submit" class="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 transition-colors" style="min-height: 48px;">Salvar Transação</button>',
          '  </form>',
          '</div>'
        ].join('');

        var closeModal = function () {
          modal.remove();
          document.removeEventListener('keydown', handleEscKey);
          state.isFormOpen = false;
          setQuickActionExpanded(false);
        };

        function handleEscKey(event) {
          if (event.key === 'Escape') closeModal();
        }

        document.body.appendChild(modal);
        document.addEventListener('keydown', handleEscKey);
        state.isFormOpen = true;
        setQuickActionExpanded(true);

        var closeButton = modal.querySelector('#close-modal-btn');
        var backdropButton = modal.querySelector('[data-testid="quick-transaction-backdrop"]');
        if (closeButton) closeButton.addEventListener('click', closeModal);
        if (backdropButton) backdropButton.addEventListener('click', closeModal);

        var form = modal.querySelector('#inline-tx-form');
        if (form) {
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            var amount = parseFloat(document.getElementById('tx-amount').value);
            var date = document.getElementById('tx-date').value;
            var description = document.getElementById('tx-description').value;
            var categoryId = document.getElementById('tx-category').value;
            var cat = state.categories.find(function (c) { return c.id === categoryId; }) || { name: 'Geral', type: 'EXPENSE' };

            var newTx = {
              id: 'tx-' + Date.now(),
              amount: amount,
              date: date,
              description: description || 'Lançamento manual',
              category_id: categoryId,
              category: cat,
              categories: cat,
              is_automated: false
            };

            state.transactions.unshift(newTx);
            closeModal();
            recalculateAndRender({ prependTransaction: newTx });
            showToast('Transação adicionada com sucesso!');
          });
        }
      }

      document.querySelectorAll('[data-testid="quick-new-transaction-btn"], [data-testid="sidebar-new-transaction-btn"], [data-testid="cashflow-add-btn"]')
        .forEach(function (btn) { btn.addEventListener('click', toggleNewTransactionForm); });
      setQuickActionExpanded(false);

      // Sincronização reativa de KPIs, Tabela e Fluxo de Caixa
      function recalculateAndRender(opts) {
        var prependTx = (opts && opts.prependTransaction) || null;
        var totalIncome = 0;
        var totalExpenses = 0;

        for (var i = 0; i < state.transactions.length; i++) {
          var t = state.transactions[i];
          var type = t.categories?.type || t.category?.type;
          var val = Number(t.amount) || 0;
          if (type === 'INCOME') totalIncome += val;
          else if (type === 'EXPENSE') totalExpenses += val;
        }

        var netBalance = totalIncome - totalExpenses;
        var burnRatePct = state.monthlyBudget > 0 ? (totalExpenses / state.monthlyBudget) * 100 : 0;

        var balanceElem = document.querySelector('[data-testid="kpi-card-liquidity"] [data-testid="kpi-value"]');
        if (balanceElem) {
          balanceElem.textContent = 'R$ ' + netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        var burnRateElem = document.querySelector('[data-testid="kpi-card-burn-rate"] [data-testid="kpi-value"]');
        if (burnRateElem) {
          burnRateElem.textContent = burnRatePct.toFixed(1) + '%';
        }

        var cfIncome = document.querySelector('[data-testid="cashflow-income-total"]');
        if (cfIncome) cfIncome.textContent = '+ R$ ' + formatCurrencyBRL(totalIncome);
        var cfExpense = document.querySelector('[data-testid="cashflow-expense-total"]');
        if (cfExpense) cfExpense.textContent = '- R$ ' + formatCurrencyBRL(totalExpenses);
        var cfNet = document.querySelector('[data-testid="cashflow-net-total"]');
        if (cfNet) cfNet.textContent = 'R$ ' + formatCurrencyBRL(netBalance);

        if (prependTx) {
          prependTransactionViews(prependTx);
        }
      }

      // Handler Unificado para exclusão de transações
      document.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
          var txId = e.target.getAttribute('data-tx-id') || e.target.getAttribute('data-transaction-id');
          if (txId) {
            state.transactions = state.transactions.filter(function (t) { return t.id !== txId; });
            removeTransactionViews(txId);
            recalculateAndRender();
            showToast('Transação excluída com sucesso!');
          }
        }
      });
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  renderAppPage
};
