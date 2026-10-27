const { getDesignTokensCss } = require('../styles/designSystem');
const { renderAppShellMarkup } = require('../components/AppShell');
const { renderDashboardViewMarkup } = require('../components/DashboardView');
const { createDemoDataset } = require('../services/authApi');

/**
 * Gera o documento HTML5 completo da Single-Page Application (SPA) Mobile-First (E05.T04),
 * servido em `GET /dashboard` e `GET /app`.
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

  const appShellHtml = renderAppShellMarkup({
    activeTab,
    theme: normalizedTheme,
    user: demoData.user,
    isRefreshing: false,
    contentHtml: dashboardContentHtml
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
    [data-theme="light"] .bg-slate-900,
    [data-theme="light"] .bg-slate-900\\/95,
    [data-theme="light"] .bg-slate-900\\/90,
    [data-theme="light"] .bg-slate-900\\/50,
    [data-theme="light"] .bg-slate-900\\/40,
    [data-theme="light"] .bg-slate-800,
    [data-theme="light"] .bg-slate-800\\/60,
    [data-theme="light"] .bg-slate-800\\/40,
    [data-theme="light"] .bg-slate-800\\/30 {
      background-color: var(--bg-surface) !important;
    }

    [data-theme="light"] .border-slate-900,
    [data-theme="light"] .border-slate-800,
    [data-theme="light"] .border-slate-800\\/80,
    [data-theme="light"] .border-slate-800\\/70,
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
  </style>
</head>
<body>
  <div id="app-root">
    ${appShellHtml}
  </div>

  <!-- Runtime Interativo SPA do Cliente (E05.T04) -->
  <script>
    (function () {
      // Estado reativo em memória
      const state = {
        theme: '${normalizedTheme}',
        activeTab: '${activeTab}',
        isFormOpen: false,
        transactions: ${JSON.stringify(demoData.transactions)},
        categories: ${JSON.stringify(demoData.categories)},
        portfolio: ${JSON.stringify(demoData.portfolio)},
        monthlyBudget: 5000,
        upcomingExpenses15d: 0
      };

      // Alternância de Tema (Dark / Light)
      function applyTheme(nextTheme) {
        state.theme = nextTheme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        const appShell = document.querySelector('[data-testid="app-shell"]');
        if (appShell) appShell.setAttribute('data-theme', state.theme);
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
          themeMeta.setAttribute('content', state.theme === 'light' ? '#F8FAFC' : '#0F172A');
        }
        document.querySelectorAll('[data-testid="theme-toggle-btn"], [data-testid="sidebar-theme-toggle-btn"]')
          .forEach(btn => btn.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false'));
      }

      function toggleTheme() {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      }

      applyTheme(state.theme);

      // Conexão de botões de tema
      document.querySelectorAll('[data-testid="theme-toggle-btn"], [data-testid="sidebar-theme-toggle-btn"]')
        .forEach(btn => btn.addEventListener('click', toggleTheme));

      // Ação de Logout / Retorno para Login
      document.querySelectorAll('[data-testid="logout-btn"], [data-testid="account-indicator"]')
        .forEach(el => {
          el.style.cursor = 'pointer';
          el.title = 'Clique para sair da conta ou trocar de usuário';
          el.addEventListener('click', () => {
            try {
              localStorage.removeItem('pc_auth_session');
              sessionStorage.removeItem('pc_auth_session');
            } catch (err) {}
            window.location.href = '/login?logout=true';
          });
        });

      // Alternância de abas de navegação
      function switchTab(tabId) {
        state.activeTab = tabId;
        document.querySelectorAll('[data-nav-tab]').forEach(btn => {
          const isCurrent = btn.getAttribute('data-nav-tab') === tabId;
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

        const titles = {
          overview: 'Visão Geral',
          cashflow: 'Fluxo de Caixa',
          portfolio: 'Carteira',
          settings: 'Configurações',
          inbox: 'Inbox / Produtividade'
        };

        const viewTitle = document.querySelector('[data-testid="active-view-title"]');
        if (viewTitle && titles[tabId]) {
          viewTitle.textContent = titles[tabId];
        }
      }

      document.querySelectorAll('[data-nav-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-nav-tab')));
      });

      // Ação Rápida (+ Nova Transação)
      function setQuickActionExpanded(isExpanded) {
        document.querySelectorAll('[data-testid="quick-new-transaction-btn"], [data-testid="sidebar-new-transaction-btn"]')
          .forEach(btn => btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false'));
      }

      function formatCurrencyBRL(value) {
        const amount = Number(value) || 0;
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
        const tx = transaction || {};
        const type = tx.categories?.type || 'EXPENSE';
        const isIncome = type === 'INCOME';
        const txId = escapeHtml(tx.id);
        const description = escapeHtml(tx.description || 'Sem descrição');
        const categoryName = escapeHtml(tx.categories?.name || 'Sem categoria');
        const tr = document.createElement('tr');
        tr.setAttribute('data-testid', 'transaction-row-' + txId);
        tr.setAttribute('data-transaction-id', txId);
        tr.className = 'border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors';
        tr.innerHTML = \`
          <td class="py-3.5 px-4 text-sm text-slate-300 whitespace-nowrap">\${String(tx.date || '').split('-').reverse().join('/')}</td>
          <td class="py-3.5 px-4 text-sm font-medium text-slate-100">\${description}</td>
          <td class="py-3.5 px-4 text-sm text-slate-300"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">\${categoryName}</span></td>
          <td class="py-3.5 px-4 text-sm whitespace-nowrap"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border \${isIncome ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/70 text-rose-300 border-rose-800/60'}">\${isIncome ? 'Receita' : 'Despesa'}</span></td>
          <td class="py-3.5 px-4 text-sm font-semibold text-right whitespace-nowrap \${isIncome ? 'text-emerald-400' : 'text-rose-400'}">\${isIncome ? '+' : '-'} R$ \${formatCurrencyBRL(tx.amount)}</td>
          <td class="py-3.5 px-4 text-sm text-right whitespace-nowrap">
            <button type="button" data-action="delete" data-tx-id="\${txId}" data-transaction-id="\${txId}" aria-label="Excluir transação \${description}" class="delete-btn touch-target inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 transition-colors" style="min-height: 44px; min-width: 44px;">Excluir</button>
          </td>
        \`;
        return tr;
      }

      function createMobileCardElement(transaction) {
        const tx = transaction || {};
        const type = tx.categories?.type || 'EXPENSE';
        const isIncome = type === 'INCOME';
        const txId = escapeHtml(tx.id);
        const description = escapeHtml(tx.description || 'Sem descrição');
        const categoryName = escapeHtml(tx.categories?.name || 'Sem categoria');
        const li = document.createElement('li');
        li.setAttribute('data-testid', 'transaction-card-' + txId);
        li.className = 'rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3';
        li.innerHTML = \`
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm font-semibold text-slate-100">\${description}</p>
              <p class="text-xs text-slate-400 mt-1">\${String(tx.date || '').split('-').reverse().join('/')}</p>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border \${isIncome ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' : 'bg-rose-950/70 text-rose-300 border-rose-800/60'}">\${isIncome ? 'Receita' : 'Despesa'}</span>
          </div>
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">\${categoryName}</span>
            <span class="text-sm font-semibold \${isIncome ? 'text-emerald-400' : 'text-rose-400'}">\${isIncome ? '+' : '-'} R$ \${formatCurrencyBRL(tx.amount)}</span>
          </div>
          <button type="button" data-action="delete" data-tx-id="\${txId}" data-transaction-id="\${txId}" aria-label="Excluir transação \${description}" class="delete-btn touch-target w-full inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 transition-colors" style="min-height: 44px; min-width: 44px;">Excluir</button>
        \`;
        return li;
      }

      function prependTransactionViews(transaction) {
        const tbody = document.querySelector('[data-testid="transactions-table-body"]');
        if (tbody) {
          tbody.prepend(createTableRowElement(transaction));
        }
        const mobileList = document.querySelector('[data-testid="transactions-mobile-list"]');
        if (mobileList) {
          mobileList.prepend(createMobileCardElement(transaction));
        }
      }

      function removeTransactionViews(transactionId) {
        const row = document.querySelector('[data-testid="transaction-row-' + transactionId + '"]');
        if (row) row.remove();
        const card = document.querySelector('[data-testid="transaction-card-' + transactionId + '"]');
        if (card) card.remove();
      }

      function toggleNewTransactionForm() {
        const existingModal = document.getElementById('quick-transaction-modal');
        if (existingModal) {
          existingModal.remove();
          state.isFormOpen = false;
          setQuickActionExpanded(false);
          return;
        }

        const modal = document.createElement('div');
        modal.id = 'quick-transaction-modal';
        modal.className = 'fixed inset-0 z-50 flex items-end md:items-center justify-center';
        modal.innerHTML = \`
          <button type="button" data-testid="quick-transaction-backdrop" aria-label="Fechar formulário de nova transação" class="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"></button>
          <div role="dialog" aria-modal="true" aria-label="Nova Transação" class="relative w-full md:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl border border-slate-800 bg-slate-900 p-4 md:p-6 shadow-2xl" style="padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-bold text-slate-100">+ Nova Transação Manual</h3>
              <button type="button" id="close-modal-btn" class="touch-target inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700" style="min-height: 44px; min-width: 44px;">
                Fechar
              </button>
            </div>
            <form id="inline-tx-form" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" min="0.01" id="tx-amount" required placeholder="0,00" inputmode="decimal" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-1">Data</label>
                  <input type="date" id="tx-date" required value="\${new Date().toISOString().slice(0, 10)}" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                <input type="text" id="tx-description" placeholder="Ex: Supermercado, Aluguel, Pro-labore" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;" />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Categoria</label>
                <select id="tx-category" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50" style="min-height: 44px;">
                  \${state.categories.map(c => \`<option value="\${escapeHtml(c.id)}">\${escapeHtml(c.name)} (\${escapeHtml(c.type)})</option>\`).join('')}
                </select>
              </div>
              <button type="submit" class="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-2.5 transition-colors" style="min-height: 48px;">
                Salvar Transação
              </button>
            </form>
          </div>
        \`;

        const closeModal = () => {
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

        const closeButton = modal.querySelector('#close-modal-btn');
        const backdropButton = modal.querySelector('[data-testid="quick-transaction-backdrop"]');
        if (closeButton) closeButton.addEventListener('click', closeModal);
        if (backdropButton) backdropButton.addEventListener('click', closeModal);

        const form = modal.querySelector('#inline-tx-form');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('tx-amount').value);
            const date = document.getElementById('tx-date').value;
            const description = document.getElementById('tx-description').value;
            const categoryId = document.getElementById('tx-category').value;
            const cat = state.categories.find(c => c.id === categoryId) || { name: 'Geral', type: 'EXPENSE' };

            const newTx = {
              id: 'tx-' + Date.now(),
              amount,
              date,
              description: description || 'Lançamento manual',
              category_id: categoryId,
              category: cat,
              categories: cat,
              is_automated: false
            };

            state.transactions.unshift(newTx);
            closeModal();
            recalculateAndRender({ prependTransaction: newTx });
          });
        }
      }

      document.querySelectorAll('[data-testid="quick-new-transaction-btn"], [data-testid="sidebar-new-transaction-btn"]')
        .forEach(btn => btn.addEventListener('click', toggleNewTransactionForm));
      setQuickActionExpanded(false);

      // Sincronização reativa de KPIs e Tabela
      function recalculateAndRender({ prependTransaction = null } = {}) {
        let totalIncome = 0;
        let totalExpenses = 0;

        for (const t of state.transactions) {
          const type = t.categories?.type;
          const val = Number(t.amount) || 0;
          if (type === 'INCOME') totalIncome += val;
          else if (type === 'EXPENSE') totalExpenses += val;
        }

        const netBalance = totalIncome - totalExpenses;
        const burnRatePct = state.monthlyBudget > 0 ? (totalExpenses / state.monthlyBudget) * 100 : 0;

        // Atualiza Card de Saldo Líquido
        const balanceElem = document.querySelector('[data-testid="kpi-card-liquidity"] [data-testid="kpi-value"]');
        if (balanceElem) {
          balanceElem.textContent = 'R$ ' + netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Atualiza Card de Burn Rate
        const burnRateElem = document.querySelector('[data-testid="kpi-card-burn-rate"] [data-testid="kpi-value"]');
        if (burnRateElem) {
          burnRateElem.textContent = burnRatePct.toFixed(1) + '%';
        }

        if (prependTransaction) {
          prependTransactionViews(prependTransaction);
        }
      }

      // Handler para exclusão de transações
      document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('delete-btn')) {
          const txId = e.target.getAttribute('data-tx-id');
          if (txId) {
            state.transactions = state.transactions.filter(t => t.id !== txId);
            removeTransactionViews(txId);
            recalculateAndRender();
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
