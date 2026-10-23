const { renderKpiCardsMarkup, calculateFinancialKpis } = require('./KpiCards');
const { renderAssetAllocationChartMarkup, computeDonutChartSegments } = require('./AssetAllocationChart');
const { renderRecentTransactionsTableMarkup } = require('./RecentTransactionsTable');
const { renderTransactionFormMarkup } = require('./TransactionForm');

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
 * Normaliza transações para garantir compatibilidade com `category: { name, type }` e `categories: { name, type }`.
 */
function normalizeTransaction(tx = {}) {
  const cat = tx.category || tx.categories || { name: 'Geral', type: 'EXPENSE' };
  return {
    ...tx,
    category: cat,
    categories: cat
  };
}

/**
 * Renderiza a View Principal do Dashboard (E05.T04).
 *
 * Hierarquia de Informação Mobile-First:
 * - 1ª Dobra Mobile (375px): Cards de KPIs acionáveis (Liquidez de Curto Prazo, Burn Rate,
 *   Receitas e Despesas) em grid responsivo (1 coluna no mobile -> 2 colunas sm -> 4 colunas lg).
 * - 2ª Dobra: Gráfico de Rosca de Distribuição de Ativos (lg:col-span-5) e Tabela de
 *   Transações Recentes (lg:col-span-7) empilhados verticalmente no mobile e dispostos
 *   lado a lado no desktop.
 */
function renderDashboardViewMarkup({
  transactions = [],
  portfolio = null,
  categories = [],
  monthlyBudget = 5000,
  isFormOpen = false
} = {}) {
  const normalizedTransactions = transactions.map(normalizeTransaction);

  const kpiData = calculateFinancialKpis(normalizedTransactions, { monthlyBudget });
  const kpisHtml = renderKpiCardsMarkup({ kpis: kpiData });

  const chartHtml = renderAssetAllocationChartMarkup({
    portfolio: portfolio || { positions: [] }
  });

  const transactionsHtml = renderRecentTransactionsTableMarkup({
    transactions: normalizedTransactions.slice(0, 8),
    limit: 8,
    offset: 0
  });

  const formSectionHtml = isFormOpen
    ? `<div class="mb-6 p-4 md:p-6 rounded-2xl border border-indigo-500/30 bg-slate-900/90 shadow-lg">
        <h2 class="text-base font-semibold text-slate-100 mb-3 flex items-center gap-2">
          <span>+ Nova Transação Manual</span>
        </h2>
        ${renderTransactionFormMarkup({ categories })}
      </div>`
    : '';

  return `<div data-testid="dashboard-view" class="space-y-6">
    <!-- 1ª Dobra Mobile: Cards de KPIs Acionáveis (Liquidez & Burn Rate) -->
    <section aria-label="Indicadores Financeiros Chave" data-testid="kpis-section">
      ${kpisHtml}
    </section>

    ${formSectionHtml}

    <!-- 2ª Dobra: Gráfico de Distribuição e Transações Recentes -->
    <section aria-label="Visão Gráfica e Lançamentos" class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Donut Chart de Distribuição de Ativos (5 cols desktop) -->
      <div data-testid="dashboard-chart-col" class="lg:col-span-5 w-full">
        ${chartHtml}
      </div>

      <!-- Tabela / Cards de Transações Recentes (7 cols desktop) -->
      <div data-testid="dashboard-transactions-col" class="lg:col-span-7 w-full">
        ${transactionsHtml}
      </div>
    </section>
  </div>`;
}

/**
 * Controlador com sincronização reativa: ao criar ou excluir uma transação,
 * os KPIs de liquidez, burn rate e a lista de transações são recalculados automaticamente.
 */
function createDashboardViewController({
  initialTransactions = [],
  initialPortfolio = null,
  categories = [],
  monthlyBudget = 5000,
  onStateChange
} = {}) {
  let state = {
    transactions: initialTransactions.map(normalizeTransaction),
    portfolio: initialPortfolio ? { ...initialPortfolio } : null,
    categories: [...categories],
    monthlyBudget,
    isFormOpen: false
  };

  function getState() {
    const kpiData = calculateFinancialKpis(state.transactions, {
      monthlyBudget: state.monthlyBudget
    });
    return {
      ...state,
      kpis: kpiData
    };
  }

  function notify() {
    if (typeof onStateChange === 'function') {
      onStateChange(getState());
    }
  }

  function addTransaction(newTx) {
    if (!newTx) return getState();
    const cat = newTx.category || newTx.categories || (
      state.categories.find(c => c.id === newTx.category_id) || { name: 'Geral', type: 'EXPENSE' }
    );
    const tx = {
      id: newTx.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      amount: Number(newTx.amount) || 0,
      date: newTx.date || new Date().toISOString().slice(0, 10),
      category_id: newTx.category_id || null,
      description: newTx.description || '',
      is_automated: Boolean(newTx.is_automated),
      category: cat,
      categories: cat
    };

    state = {
      ...state,
      transactions: [tx, ...state.transactions],
      isFormOpen: false
    };

    notify();
    return getState();
  }

  function deleteTransaction(transactionId) {
    state = {
      ...state,
      transactions: state.transactions.filter(t => t.id !== transactionId)
    };

    notify();
    return getState();
  }

  function toggleForm(forceState) {
    state = {
      ...state,
      isFormOpen: typeof forceState === 'boolean' ? forceState : !state.isFormOpen
    };
    notify();
    return getState();
  }

  function updatePortfolio(newPortfolio) {
    state = {
      ...state,
      portfolio: newPortfolio ? { ...newPortfolio } : null
    };
    notify();
    return getState();
  }

  function getMarkup() {
    return renderDashboardViewMarkup({
      transactions: state.transactions,
      portfolio: state.portfolio,
      categories: state.categories,
      monthlyBudget: state.monthlyBudget,
      isFormOpen: state.isFormOpen
    });
  }

  return {
    getState,
    addTransaction,
    deleteTransaction,
    toggleForm,
    updatePortfolio,
    getMarkup
  };
}

module.exports = {
  renderDashboardViewMarkup,
  createDashboardViewController,
  calculateFinancialKpis
};
