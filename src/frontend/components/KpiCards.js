const { fetchTransactions } = require('../services/transactionsApi');

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/**
 * Formata valor numérico para moeda BRL (R$ X.XXX,XX).
 * @param {number} value
 */
function formatMoneyBRL(value) {
  const num = Number(value) || 0;
  const absFormatted = Math.abs(num).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return num < 0 ? `-R$ ${absFormatted}` : `R$ ${absFormatted}`;
}

/**
 * Calcula os KPIs financeiros (Saldo/Liquidez, Receita, Despesa e Burn Rate)
 * a partir da lista de transações retornada por GET /api/transactions (E04.T03).
 *
 * @param {Array} [transactions=[]]
 * @param {object} [options]
 * @param {number} [options.monthlyBudget] Orçamento mensal opcional para cálculo do Burn Rate
 */
function calculateFinancialKpis(transactions = [], options = {}) {
  const { monthlyBudget = 0 } = options;

  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const amount = Number(tx?.amount) || 0;
    if (amount <= 0) continue;

    const categoryType = tx?.category?.type || tx?.categories?.type || tx?.type || 'EXPENSE';
    if (categoryType === 'INCOME') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
  }

  totalIncome = round2(totalIncome);
  totalExpense = round2(totalExpense);
  const netBalance = round2(totalIncome - totalExpense);

  const referenceBase = Number(monthlyBudget) > 0 ? Number(monthlyBudget) : totalIncome;
  const burnRatePercentage = referenceBase > 0
    ? round2((totalExpense / referenceBase) * 100)
    : (totalExpense > 0 ? 100 : 0);

  const savingsRatePercentage = totalIncome > 0
    ? round2(((totalIncome - totalExpense) / totalIncome) * 100)
    : 0;

  let burnRateStatus = 'healthy';
  let burnRateLabel = 'Saudável';
  if (burnRatePercentage >= 90) {
    burnRateStatus = 'critical';
    burnRateLabel = 'Crítico';
  } else if (burnRatePercentage >= 70) {
    burnRateStatus = 'warning';
    burnRateLabel = 'Atenção';
  }

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_balance: netBalance,
    liquidity: netBalance,
    burn_rate_percentage: burnRatePercentage,
    burn_rate_status: burnRateStatus,
    burn_rate_label: burnRateLabel,
    savings_rate_percentage: savingsRatePercentage,
    transactions_count: transactions.length
  };
}

/**
 * Componente React KpiCards (E04.T03).
 * Renderiza os cards de Saldo (Liquidez), Receitas, Despesas e Burn Rate.
 *
 * @param {object} props
 * @param {Array} [props.transactions=[]]
 * @param {object} [props.kpis]
 * @param {number} [props.monthlyBudget]
 * @param {boolean} [props.isLoading=false]
 * @param {string|null} [props.error=null]
 * @param {object} [ReactInstance]
 */
function KpiCards(props = {}, ReactInstance = global.React) {
  const {
    transactions = [],
    monthlyBudget = 0,
    isLoading = false,
    error = null
  } = props;

  const kpis = props.kpis || calculateFinancialKpis(transactions, { monthlyBudget });
  const progressWidth = Math.min(100, Math.max(0, kpis.burn_rate_percentage));

  if (ReactInstance && typeof ReactInstance.createElement === 'function') {
    const h = ReactInstance.createElement;

    if (error) {
      return h(
        'div',
        {
          role: 'alert',
          'aria-live': 'assertive',
          className: 'rounded-xl bg-red-950/60 border border-red-800 p-4 text-sm text-red-200'
        },
        error
      );
    }

    if (isLoading) {
      return h(
        'div',
        {
          role: 'status',
          'aria-live': 'polite',
          className: 'rounded-xl bg-slate-900 border border-slate-800 p-6 text-center text-sm text-slate-400'
        },
        'Calculando indicadores financeiros...'
      );
    }

    return h(
      'section',
      {
        id: 'kpi-cards-section',
        'aria-label': 'Indicadores financeiros (KPIs de Liquidez e Burn Rate)',
        className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'
      },
      // Card 1: Saldo / Liquidez
      h(
        'article',
        {
          'data-kpi-card': 'liquidity',
          className: 'bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between'
        },
        h('span', { className: 'text-xs font-semibold uppercase tracking-wider text-slate-400' }, 'Saldo / Liquidez'),
        h(
          'p',
          {
            'data-kpi-value': 'net_balance',
            className: `text-2xl font-bold mt-2 ${
              kpis.net_balance >= 0 ? 'text-white' : 'text-rose-400'
            }`
          },
          formatMoneyBRL(kpis.net_balance)
        ),
        h(
          'span',
          { className: 'text-xs text-slate-400 mt-2' },
          `Taxa de poupança: ${kpis.savings_rate_percentage.toFixed(1)}%`
        )
      ),
      // Card 2: Receitas
      h(
        'article',
        {
          'data-kpi-card': 'income',
          className: 'bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between'
        },
        h('span', { className: 'text-xs font-semibold uppercase tracking-wider text-emerald-400' }, 'Receitas'),
        h(
          'p',
          {
            'data-kpi-value': 'total_income',
            className: 'text-2xl font-bold text-emerald-400 mt-2'
          },
          formatMoneyBRL(kpis.total_income)
        ),
        h('span', { className: 'text-xs text-slate-400 mt-2' }, 'Entradas acumuladas no período')
      ),
      // Card 3: Despesas
      h(
        'article',
        {
          'data-kpi-card': 'expense',
          className: 'bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between'
        },
        h('span', { className: 'text-xs font-semibold uppercase tracking-wider text-rose-400' }, 'Despesas'),
        h(
          'p',
          {
            'data-kpi-value': 'total_expense',
            className: 'text-2xl font-bold text-rose-400 mt-2'
          },
          formatMoneyBRL(kpis.total_expense)
        ),
        h('span', { className: 'text-xs text-slate-400 mt-2' }, 'Saídas acumuladas no período')
      ),
      // Card 4: Burn Rate
      h(
        'article',
        {
          'data-kpi-card': 'burn_rate',
          className: 'bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between'
        },
        h(
          'div',
          { className: 'flex items-center justify-between' },
          h('span', { className: 'text-xs font-semibold uppercase tracking-wider text-amber-400' }, 'Burn Rate'),
          h(
            'span',
            {
              'data-burn-status': kpis.burn_rate_status,
              className: 'text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700'
            },
            kpis.burn_rate_label
          )
        ),
        h(
          'p',
          {
            'data-kpi-value': 'burn_rate_percentage',
            className: 'text-2xl font-bold text-white mt-2'
          },
          `${kpis.burn_rate_percentage.toFixed(1)}%`
        ),
        h(
          'div',
          {
            role: 'progressbar',
            'aria-label': 'Percentual de Burn Rate',
            'aria-valuenow': kpis.burn_rate_percentage,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            className: 'w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-3'
          },
          h('div', {
            style: { width: `${progressWidth}%` },
            className: 'h-full bg-indigo-500 rounded-full transition-all'
          })
        )
      )
    );
  }

  return {
    type: 'KpiCards',
    props: {
      kpis,
      isLoading,
      error
    },
    html: renderKpiCardsMarkup({ ...props, kpis })
  };
}

/**
 * Renderiza o HTML semântico e acessível dos Cards de KPIs (Liquidez, Receita, Despesa e Burn Rate).
 */
function renderKpiCardsMarkup(props = {}) {
  const {
    transactions = [],
    monthlyBudget = 0,
    isLoading = false,
    error = null
  } = props;

  if (error) {
    return `<div role="alert" aria-live="assertive" class="rounded-xl bg-red-950/60 border border-red-800 p-4 text-sm text-red-200">${escapeHtml(error)}</div>`;
  }

  if (isLoading) {
    return `<div role="status" aria-live="polite" class="rounded-xl bg-slate-900 border border-slate-800 p-6 text-center text-sm text-slate-400">Calculando indicadores financeiros...</div>`;
  }

  const kpis = props.kpis || calculateFinancialKpis(transactions, { monthlyBudget });
  const progressWidth = Math.min(100, Math.max(0, kpis.burn_rate_percentage));
  const balanceColor = kpis.net_balance >= 0 ? 'text-white' : 'text-rose-400';

  return `
<section id="kpi-cards-section" aria-label="Indicadores financeiros (KPIs de Liquidez e Burn Rate)" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <article data-kpi-card="liquidity" class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo / Liquidez</span>
    <p data-kpi-value="net_balance" class="text-2xl font-bold mt-2 ${balanceColor}">${escapeHtml(formatMoneyBRL(kpis.net_balance))}</p>
    <span class="text-xs text-slate-400 mt-2">Taxa de poupança: ${kpis.savings_rate_percentage.toFixed(1)}%</span>
  </article>
  <article data-kpi-card="income" class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-emerald-400">Receitas</span>
    <p data-kpi-value="total_income" class="text-2xl font-bold text-emerald-400 mt-2">${escapeHtml(formatMoneyBRL(kpis.total_income))}</p>
    <span class="text-xs text-slate-400 mt-2">Entradas acumuladas no período</span>
  </article>
  <article data-kpi-card="expense" class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-rose-400">Despesas</span>
    <p data-kpi-value="total_expense" class="text-2xl font-bold text-rose-400 mt-2">${escapeHtml(formatMoneyBRL(kpis.total_expense))}</p>
    <span class="text-xs text-slate-400 mt-2">Saídas acumuladas no período</span>
  </article>
  <article data-kpi-card="burn_rate" class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold uppercase tracking-wider text-amber-400">Burn Rate</span>
      <span data-burn-status="${escapeHtml(kpis.burn_rate_status)}" class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">${escapeHtml(kpis.burn_rate_label)}</span>
    </div>
    <p data-kpi-value="burn_rate_percentage" class="text-2xl font-bold text-white mt-2">${kpis.burn_rate_percentage.toFixed(1)}%</p>
    <div role="progressbar" aria-label="Percentual de Burn Rate" aria-valuenow="${kpis.burn_rate_percentage}" aria-valuemin="0" aria-valuemax="100" class="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
      <div style="width: ${progressWidth}%" class="h-full bg-indigo-500 rounded-full transition-all"></div>
    </div>
  </article>
</section>`.trim();
}

/**
 * Controlador de estado para os Cards de KPIs (E04.T03).
 * Carrega transações de GET /api/transactions e calcula Liquidez, Receita, Despesa e Burn Rate.
 */
function createKpiCardsController(options = {}) {
  const {
    token = null,
    baseUrl = '/api',
    limit = 100,
    monthlyBudget = 0,
    fetchImpl = global.fetch
  } = options;

  const state = {
    transactions: [],
    kpis: calculateFinancialKpis([], { monthlyBudget }),
    monthlyBudget,
    isLoading: false,
    error: null
  };

  async function loadKpis(filters = {}) {
    state.isLoading = true;
    state.error = null;
    try {
      const response = await fetchTransactions({
        token,
        baseUrl,
        limit,
        offset: 0,
        start_date: filters.start_date,
        end_date: filters.end_date,
        fetchImpl
      });
      state.transactions = response.data;
      state.kpis = calculateFinancialKpis(state.transactions, {
        monthlyBudget: state.monthlyBudget
      });
      return state.kpis;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.isLoading = false;
    }
  }

  function updateFromTransactions(transactions = []) {
    state.transactions = Array.isArray(transactions) ? transactions : [];
    state.kpis = calculateFinancialKpis(state.transactions, {
      monthlyBudget: state.monthlyBudget
    });
    return state.kpis;
  }

  function render(ReactInstance) {
    return KpiCards(
      {
        transactions: state.transactions,
        kpis: state.kpis,
        monthlyBudget: state.monthlyBudget,
        isLoading: state.isLoading,
        error: state.error
      },
      ReactInstance
    );
  }

  return {
    getState: () => ({
      ...state,
      transactions: [...state.transactions],
      kpis: { ...state.kpis }
    }),
    loadKpis,
    updateFromTransactions,
    render
  };
}

module.exports = {
  calculateFinancialKpis,
  KpiCards,
  renderKpiCardsMarkup,
  createKpiCardsController,
  formatMoneyBRL
};
