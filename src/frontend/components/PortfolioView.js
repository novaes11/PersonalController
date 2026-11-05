const { renderAssetAllocationChartMarkup } = require('./AssetAllocationChart');
const { fetchConsolidatedPortfolio } = require('../services/portfolioApi');

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

function formatCurrencyBRL(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ASSET_TYPE_LABELS = {
  STOCK: 'Ações B3',
  CRYPTO: 'Criptoativos',
  FIXED_INCOME: 'Renda Fixa',
  FII: 'FIIs',
  CURRENCY: 'Câmbio',
  ETF: 'ETFs',
  OTHER: 'Outros'
};

const ASSET_FILTER_OPTIONS = [
  { id: 'ALL', label: 'Todos' },
  { id: 'STOCK', label: 'Ações B3' },
  { id: 'FIXED_INCOME', label: 'Renda Fixa' },
  { id: 'FII', label: 'FIIs' },
  { id: 'CRYPTO', label: 'Criptoativos' }
];

/**
 * Calcula e normaliza o resumo patrimonial e as métricas individuais de cada posição da carteira (E05.T06).
 * @param {object|null} rawPortfolio
 */
function calculatePortfolioSummary(rawPortfolio = null) {
  const data = rawPortfolio && typeof rawPortfolio === 'object' ? rawPortfolio : {};
  const rawPositions = Array.isArray(data.positions) ? data.positions : [];

  const preliminaryPositions = rawPositions.map(pos => {
    const quantity = Number(pos.quantity) > 0 ? Number(pos.quantity) : 1;
    const rawCurrentVal = Number(pos.current_value ?? pos.total_value);
    const currentPrice = Number(pos.current_price) > 0
      ? Number(pos.current_price)
      : (rawCurrentVal > 0 ? round2(rawCurrentVal / quantity) : 0);
    const currentValue = rawCurrentVal > 0 ? round2(rawCurrentVal) : round2(quantity * currentPrice);

    const rawAvgPrice = Number(pos.average_price);
    const rawInvestedVal = Number(pos.invested_value);
    const averagePrice = rawAvgPrice > 0
      ? rawAvgPrice
      : (rawInvestedVal > 0 ? round2(rawInvestedVal / quantity) : currentPrice);
    const investedValue = rawInvestedVal > 0
      ? round2(rawInvestedVal)
      : round2(quantity * averagePrice);

    const profitLoss = pos.profit_loss !== undefined && pos.profit_loss !== null
      ? round2(pos.profit_loss)
      : round2(currentValue - investedValue);

    const rawPct = pos.profit_loss_percentage ?? pos.profit_loss_pct;
    const profitLossPercentage = rawPct !== undefined && rawPct !== null
      ? round2(rawPct)
      : (investedValue > 0 ? round2(((currentValue - investedValue) / investedValue) * 100) : 0);

    const assetType = pos.asset_type || 'OTHER';

    return {
      ...pos,
      ticker: String(pos.ticker || 'ATIVO').trim(),
      asset_type: assetType,
      type_label: ASSET_TYPE_LABELS[assetType] || assetType || 'Outros',
      quantity,
      average_price: round2(averagePrice),
      current_price: round2(currentPrice),
      invested_value: investedValue,
      current_value: currentValue,
      profit_loss: profitLoss,
      profit_loss_percentage: profitLossPercentage
    };
  });

  const computedTotalValue = round2(
    preliminaryPositions.reduce((acc, p) => acc + p.current_value, 0)
  );
  const totalPortfolioValue = Number(data.total_portfolio_value) > 0
    ? round2(data.total_portfolio_value)
    : computedTotalValue;

  const computedInvestedValue = round2(
    preliminaryPositions.reduce((acc, p) => acc + p.invested_value, 0)
  );
  const rawTopInvested = Number(data.total_invested_value ?? data.total_invested);
  const totalInvestedValue = rawTopInvested > 0
    ? round2(rawTopInvested)
    : computedInvestedValue;

  const totalProfitLoss = data.total_profit_loss !== undefined && data.total_profit_loss !== null
    ? round2(data.total_profit_loss)
    : round2(totalPortfolioValue - totalInvestedValue);

  const rawTopPct = data.total_profit_loss_percentage ?? data.total_profit_loss_pct;
  const totalProfitLossPercentage = rawTopPct !== undefined && rawTopPct !== null
    ? round2(rawTopPct)
    : (totalInvestedValue > 0
      ? round2(((totalPortfolioValue - totalInvestedValue) / totalInvestedValue) * 100)
      : 0);

  const positions = preliminaryPositions.map(pos => {
    const rawAlloc = pos.allocation_percentage ?? pos.allocation_pct;
    const allocationPercentage = rawAlloc !== undefined && rawAlloc !== null && Number(rawAlloc) > 0
      ? round2(rawAlloc)
      : (totalPortfolioValue > 0 ? round2((pos.current_value / totalPortfolioValue) * 100) : 0);

    return {
      ...pos,
      allocation_percentage: allocationPercentage
    };
  });

  return {
    total_portfolio_value: totalPortfolioValue,
    total_invested_value: totalInvestedValue,
    total_profit_loss: totalProfitLoss,
    total_profit_loss_percentage: totalProfitLossPercentage,
    positions_count: positions.length,
    allocation_by_type: data.allocation_by_type || {},
    positions,
    consolidated_at: data.consolidated_at || null
  };
}

/**
 * Renderiza a visualização dedicada de Carteira de Investimentos & Sincronização de Cotações (E05.T06 / E06.T02).
 */
function renderPortfolioViewMarkup({
  portfolio = null,
  activeAssetFilter = 'ALL',
  isSyncing = false
} = {}) {
  const summary = calculatePortfolioSummary(portfolio);
  const totalValue = summary.total_portfolio_value;
  const investedValue = summary.total_invested_value;
  const totalProfitLoss = summary.total_profit_loss;
  const totalReturnPct = summary.total_profit_loss_percentage;
  const isPositiveTotal = totalProfitLoss >= 0 && totalReturnPct >= 0;
  const returnColorClass = isPositiveTotal ? 'text-emerald-400' : 'text-rose-400';
  const returnSign = isPositiveTotal ? '+' : '-';

  const normalizedFilter = activeAssetFilter || 'ALL';
  const allPositions = summary.positions;
  const visiblePositions = normalizedFilter === 'ALL'
    ? allPositions
    : allPositions.filter(pos => pos.asset_type === normalizedFilter);

  const chartHtml = renderAssetAllocationChartMarkup({
    portfolio: summary
  });

  const filterPillsHtml = ASSET_FILTER_OPTIONS.map(opt => {
    const isActive = opt.id === normalizedFilter;
    const count = opt.id === 'ALL'
      ? allPositions.length
      : allPositions.filter(p => p.asset_type === opt.id).length;

    return `<button
      type="button"
      data-testid="portfolio-filter-${opt.id}"
      data-portfolio-filter="${opt.id}"
      aria-pressed="${isActive ? 'true' : 'false'}"
      class="portfolio-filter-pill touch-target inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }"
      style="min-height: 44px;"
    >
      <span>${escapeHtml(opt.label)}</span>
      <span class="px-1.5 py-0.5 rounded-full text-[10px] ${
        isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-900 text-slate-400'
      }">${count}</span>
    </button>`;
  }).join('');

  const positionsRowsHtml = visiblePositions.map(pos => {
    const ticker = escapeHtml(pos.ticker);
    const typeLabel = pos.type_label;
    const quantity = pos.quantity;
    const avgPrice = pos.average_price;
    const currentPrice = pos.current_price;
    const posTotal = pos.current_value;
    const weightPct = pos.allocation_percentage.toFixed(1);
    const posReturnPct = pos.profit_loss_percentage;
    const posProfit = pos.profit_loss;
    const isPosUp = posProfit >= 0 && posReturnPct >= 0;
    const posReturnClass = isPosUp
      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60'
      : 'text-rose-400 bg-rose-950/60 border-rose-800/60';
    const posSign = isPosUp ? '+' : '-';

    return `<tr
      data-testid="portfolio-pos-row-${ticker}"
      data-asset-type="${escapeHtml(pos.asset_type)}"
      class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors"
    >
      <td class="py-3.5 px-4 text-sm font-semibold text-slate-100">${ticker}</td>
      <td class="py-3.5 px-4 text-sm text-slate-300">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
          ${escapeHtml(typeLabel)}
        </span>
      </td>
      <td class="py-3.5 px-4 text-sm text-slate-300 tabular-nums">${quantity}</td>
      <td class="py-3.5 px-4 text-sm text-slate-300 tabular-nums">
        <span class="block text-slate-100">R$ ${formatCurrencyBRL(currentPrice)}</span>
        <span class="block text-[11px] text-slate-400">PM: R$ ${formatCurrencyBRL(avgPrice)}</span>
      </td>
      <td class="py-3.5 px-4 text-sm text-right tabular-nums" data-testid="portfolio-pos-return-${ticker}">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${posReturnClass}">
          ${posSign} ${Math.abs(posReturnPct).toFixed(2)}%
        </span>
      </td>
      <td class="py-3.5 px-4 text-sm font-semibold text-right text-slate-100 tabular-nums">R$ ${formatCurrencyBRL(posTotal)}</td>
      <td class="py-3.5 px-4 text-sm text-right text-indigo-400 font-semibold tabular-nums">${weightPct}%</td>
    </tr>`;
  }).join('');

  const positionsCardsHtml = visiblePositions.map(pos => {
    const ticker = escapeHtml(pos.ticker);
    const typeLabel = pos.type_label;
    const quantity = pos.quantity;
    const avgPrice = pos.average_price;
    const currentPrice = pos.current_price;
    const posTotal = pos.current_value;
    const weightPct = pos.allocation_percentage.toFixed(1);
    const posReturnPct = pos.profit_loss_percentage;
    const posProfit = pos.profit_loss;
    const isPosUp = posProfit >= 0 && posReturnPct >= 0;
    const posReturnTextClass = isPosUp ? 'text-emerald-400' : 'text-rose-400';
    const posSign = isPosUp ? '+' : '-';

    return `<li
      data-testid="portfolio-pos-card-${ticker}"
      data-asset-type="${escapeHtml(pos.asset_type)}"
      class="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2.5"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-bold text-slate-100">${ticker}</span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
          ${escapeHtml(typeLabel)}
        </span>
      </div>
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span>Qtd: ${quantity} &times; R$ ${formatCurrencyBRL(currentPrice)}</span>
        <span class="text-indigo-400 font-semibold">${weightPct}% da carteira</span>
      </div>
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span>Preço Médio: R$ ${formatCurrencyBRL(avgPrice)}</span>
        <span class="font-semibold tabular-nums ${posReturnTextClass}">
          ${posSign} R$ ${formatCurrencyBRL(Math.abs(posProfit))} (${posSign}${Math.abs(posReturnPct).toFixed(2)}%)
        </span>
      </div>
      <div class="pt-1.5 flex items-center justify-between border-t border-slate-800/80">
        <span class="text-xs text-slate-400">Total em Posição:</span>
        <span class="text-sm font-semibold text-slate-100 tabular-nums">R$ ${formatCurrencyBRL(posTotal)}</span>
      </div>
    </li>`;
  }).join('');

  return `<div data-testid="portfolio-view" class="space-y-6">
    <!-- 1ª Dobra: Resumo Patrimonial e Sincronização de Cotações -->
    <section aria-label="Resumo Patrimonial da Carteira" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5" data-testid="portfolio-total-card">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Patrimônio Investido</span>
        <span data-testid="portfolio-total-value" class="text-xl md:text-2xl font-bold text-slate-100 block mt-1 tabular-nums">
          R$ ${formatCurrencyBRL(totalValue)}
        </span>
        <span class="text-xs text-slate-400 mt-1 block">
          Custo aplicado: <strong data-testid="portfolio-invested-value" class="text-slate-300 tabular-nums">R$ ${formatCurrencyBRL(investedValue)}</strong>
        </span>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5" data-testid="portfolio-return-card">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Rentabilidade Estimada</span>
        <span data-testid="portfolio-return-percentage" class="text-xl md:text-2xl font-bold ${returnColorClass} block mt-1 tabular-nums">
          ${returnSign} ${Math.abs(totalReturnPct).toFixed(2)}%
        </span>
        <span data-testid="portfolio-profit-loss-value" class="text-xs ${returnColorClass} mt-1 block tabular-nums">
          ${returnSign} R$ ${formatCurrencyBRL(Math.abs(totalProfitLoss))} acumulado
        </span>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5" data-testid="portfolio-quotes-status">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Cotações de Mercado</span>
          <span data-testid="portfolio-quotes-badge" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            ${isSyncing ? 'Sincronizando' : 'Online'}
          </span>
        </div>
        <span data-testid="portfolio-last-sync" class="text-[11px] text-slate-400 mt-1 block">
          Fonte: Brapi B3 &amp; AwesomeAPI (?refresh=true)
        </span>
        <div class="mt-2.5">
          <button
            type="button"
            id="portfolio-sync-btn"
            data-testid="portfolio-sync-quotes-btn"
            aria-busy="${isSyncing ? 'true' : 'false'}"
            aria-label="Sincronizar cotações de mercado agora"
            class="touch-target w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 transition-colors"
            style="min-height: 44px;"
          >
            <svg aria-hidden="true" class="${isSyncing ? 'animate-spin' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span data-testid="portfolio-sync-btn-label">${isSyncing ? 'Sincronizando...' : 'Sincronizar Cotações'}</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 2ª Dobra: Gráfico Donut de Alocação e Lista Mobile-First de Posições por Ativo -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Gráfico Donut de Alocação (5 colunas desktop) -->
      <div data-testid="portfolio-chart-col" class="lg:col-span-5 w-full">
        ${chartHtml}
      </div>

      <!-- Tabela / Cards de Ativos e Posições (7 colunas desktop) -->
      <div data-testid="portfolio-positions-col" class="lg:col-span-7 w-full rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div class="p-4 md:p-5 border-b border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-base font-bold text-slate-100">Posições &amp; Ativos</h2>
            <span data-testid="portfolio-positions-count" class="text-xs text-slate-400">${visiblePositions.length} ativos em carteira</span>
          </div>

          <!-- Filtros Mobile-First por Classe de Ativo -->
          <div data-testid="portfolio-asset-filters" class="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar posições por classe de ativo">
            ${filterPillsHtml}
          </div>
        </div>

        <!-- Tabela Desktop -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse" data-testid="portfolio-positions-table">
            <thead>
              <tr class="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th scope="col" class="py-3 px-4">Ativo</th>
                <th scope="col" class="py-3 px-4">Classe</th>
                <th scope="col" class="py-3 px-4">Qtd</th>
                <th scope="col" class="py-3 px-4">Cotação / PM</th>
                <th scope="col" class="py-3 px-4 text-right">Rentab.</th>
                <th scope="col" class="py-3 px-4 text-right">Saldo</th>
                <th scope="col" class="py-3 px-4 text-right">Peso</th>
              </tr>
            </thead>
            <tbody>
              ${positionsRowsHtml || '<tr><td colspan="7" class="py-8 text-center text-sm text-slate-400">Nenhum ativo cadastrado.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Cards Mobile -->
        <div class="block md:hidden p-4">
          <ul data-testid="portfolio-positions-mobile-list" class="space-y-3">
            ${positionsCardsHtml || '<li class="py-8 text-center text-sm text-slate-400">Nenhum ativo cadastrado.</li>'}
          </ul>
        </div>
      </div>
    </div>
  </div>`;
}

/**
 * Controlador reativo para a View Dedicada de Carteira de Investimentos (E05.T06).
 * Gerencia estado de sincronização (?refresh=true), filtro por classe de ativo e recálculo patrimonial.
 */
function createPortfolioViewController({
  initialPortfolio = null,
  token = null,
  baseUrl = '/api',
  fetchImpl = global.fetch,
  onStateChange
} = {}) {
  let state = {
    portfolio: initialPortfolio ? { ...initialPortfolio } : { total_portfolio_value: 0, positions: [] },
    activeAssetFilter: 'ALL',
    isSyncing: false,
    error: null,
    lastSyncAt: null
  };

  function getState() {
    const summary = calculatePortfolioSummary(state.portfolio);
    const filteredPositions = state.activeAssetFilter === 'ALL'
      ? summary.positions
      : summary.positions.filter(p => p.asset_type === state.activeAssetFilter);

    return {
      ...state,
      summary,
      filteredPositions
    };
  }

  function notify() {
    if (typeof onStateChange === 'function') {
      onStateChange(getState());
    }
  }

  function setAssetFilter(assetType = 'ALL') {
    const validIds = ASSET_FILTER_OPTIONS.map(o => o.id);
    state = {
      ...state,
      activeAssetFilter: validIds.includes(assetType) ? assetType : 'ALL'
    };
    notify();
    return getState();
  }

  function updatePortfolio(nextPortfolio) {
    state = {
      ...state,
      portfolio: nextPortfolio ? { ...nextPortfolio } : { total_portfolio_value: 0, positions: [] },
      error: null
    };
    notify();
    return getState();
  }

  async function syncQuotes({ refresh = true } = {}) {
    state = {
      ...state,
      isSyncing: true,
      error: null
    };
    notify();

    try {
      const updatedPortfolio = await fetchConsolidatedPortfolio({
        token,
        baseUrl,
        refresh,
        fetchImpl
      });
      state = {
        ...state,
        portfolio: updatedPortfolio,
        isSyncing: false,
        error: null,
        lastSyncAt: (updatedPortfolio && updatedPortfolio.consolidated_at) || new Date().toISOString()
      };
      notify();
      return getState();
    } catch (err) {
      state = {
        ...state,
        isSyncing: false,
        error: err.message || 'Falha ao sincronizar cotações de mercado'
      };
      notify();
      throw err;
    }
  }

  function getMarkup() {
    return renderPortfolioViewMarkup({
      portfolio: state.portfolio,
      activeAssetFilter: state.activeAssetFilter,
      isSyncing: state.isSyncing
    });
  }

  return {
    getState,
    setAssetFilter,
    updatePortfolio,
    syncQuotes,
    getMarkup
  };
}

module.exports = {
  ASSET_TYPE_LABELS,
  ASSET_FILTER_OPTIONS,
  calculatePortfolioSummary,
  renderPortfolioViewMarkup,
  createPortfolioViewController
};
