const { renderAssetAllocationChartMarkup } = require('./AssetAllocationChart');

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrencyBRL(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ASSET_TYPE_LABELS = {
  STOCK: 'Ações B3',
  CRYPTO: 'Criptoativos',
  FIXED_INCOME: 'Renda Fixa',
  FII: 'FIIs'
};

/**
 * Renderiza a visualização dedicada de Carteira de Investimentos (E06.T02 / E05.T06).
 */
function renderPortfolioViewMarkup({
  portfolio = null
} = {}) {
  const data = portfolio || { total_portfolio_value: 0, positions: [], allocation_by_type: {} };
  const totalValue = Number(data.total_portfolio_value) || 0;
  const positions = Array.isArray(data.positions) ? data.positions : [];

  const chartHtml = renderAssetAllocationChartMarkup({
    portfolio: data
  });

  const positionsRowsHtml = positions.map(pos => {
    const ticker = escapeHtml(pos.ticker);
    const typeLabel = ASSET_TYPE_LABELS[pos.asset_type] || pos.asset_type || 'Outros';
    const quantity = Number(pos.quantity) || 1;
    const avgPrice = Number(pos.average_price) || Number(pos.current_value) / quantity || 0;
    const currentPrice = Number(pos.current_price) || avgPrice;
    const posTotal = Number(pos.current_value) || (quantity * currentPrice);
    const weightPct = totalValue > 0 ? ((posTotal / totalValue) * 100).toFixed(1) : '0.0';

    return `<tr
      data-testid="portfolio-pos-row-${ticker}"
      class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors"
    >
      <td class="py-3.5 px-4 text-sm font-semibold text-slate-100">${ticker}</td>
      <td class="py-3.5 px-4 text-sm text-slate-300">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
          ${escapeHtml(typeLabel)}
        </span>
      </td>
      <td class="py-3.5 px-4 text-sm text-slate-300 tabular-nums">${quantity}</td>
      <td class="py-3.5 px-4 text-sm text-slate-300 tabular-nums">R$ ${formatCurrencyBRL(currentPrice)}</td>
      <td class="py-3.5 px-4 text-sm font-semibold text-right text-slate-100 tabular-nums">R$ ${formatCurrencyBRL(posTotal)}</td>
      <td class="py-3.5 px-4 text-sm text-right text-indigo-400 font-semibold tabular-nums">${weightPct}%</td>
    </tr>`;
  }).join('');

  const positionsCardsHtml = positions.map(pos => {
    const ticker = escapeHtml(pos.ticker);
    const typeLabel = ASSET_TYPE_LABELS[pos.asset_type] || pos.asset_type || 'Outros';
    const quantity = Number(pos.quantity) || 1;
    const currentPrice = Number(pos.current_price) || Number(pos.current_value) / quantity || 0;
    const posTotal = Number(pos.current_value) || (quantity * currentPrice);
    const weightPct = totalValue > 0 ? ((posTotal / totalValue) * 100).toFixed(1) : '0.0';

    return `<li
      data-testid="portfolio-pos-card-${ticker}"
      class="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2"
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
      <div class="pt-1 flex items-center justify-between border-t border-slate-800/80">
        <span class="text-xs text-slate-400">Total em Posição:</span>
        <span class="text-sm font-semibold text-slate-100 tabular-nums">R$ ${formatCurrencyBRL(posTotal)}</span>
      </div>
    </li>`;
  }).join('');

  return `<div data-testid="portfolio-view" class="space-y-6">
    <!-- Header e KPIs da Carteira -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5" data-testid="portfolio-total-card">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Patrimônio Investido</span>
        <span data-testid="portfolio-total-value" class="text-xl md:text-2xl font-bold text-slate-100 block mt-1 tabular-nums">
          R$ ${formatCurrencyBRL(totalValue)}
        </span>
        <span class="text-xs text-slate-400 mt-1 block">Consolidado em tempo real</span>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5" data-testid="portfolio-return-card">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Rentabilidade Estimada</span>
        <span class="text-xl md:text-2xl font-bold text-emerald-400 block mt-1 tabular-nums">+ 14.8%</span>
        <span class="text-xs text-emerald-400/80 mt-1 block">Acima do CDI (+122%)</span>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5" data-testid="portfolio-quotes-status">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Cotações de Mercado</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            Online
          </span>
        </div>
        <div class="mt-3">
          <button
            type="button"
            id="portfolio-sync-btn"
            data-testid="portfolio-sync-quotes-btn"
            aria-label="Sincronizar cotações de mercado agora"
            class="touch-target w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 transition-colors"
            style="min-height: 44px;"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            <span>Sincronizar Cotações</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Grid de Alocação e Posições -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Gráfico Donut de Alocação (5 colunas desktop) -->
      <div class="lg:col-span-5 w-full">
        ${chartHtml}
      </div>

      <!-- Tabela / Cards de Ativos e Posições (7 colunas desktop) -->
      <div class="lg:col-span-7 w-full rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
        <div class="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 class="text-base font-bold text-slate-100">Posições & Ativos</h2>
          <span class="text-xs text-slate-400">${positions.length} ativos em carteira</span>
        </div>

        <!-- Tabela Desktop -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse" data-testid="portfolio-positions-table">
            <thead>
              <tr class="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th scope="col" class="py-3 px-4">Ativo</th>
                <th scope="col" class="py-3 px-4">Classe</th>
                <th scope="col" class="py-3 px-4">Qtd</th>
                <th scope="col" class="py-3 px-4">Cotação</th>
                <th scope="col" class="py-3 px-4 text-right">Saldo</th>
                <th scope="col" class="py-3 px-4 text-right">Peso</th>
              </tr>
            </thead>
            <tbody>
              ${positionsRowsHtml || '<tr><td colspan="6" class="py-8 text-center text-sm text-slate-400">Nenhum ativo cadastrado.</td></tr>'}
            </tbody>
          </table>
        </div>

        <!-- Cards Mobile -->
        <div class="block md:hidden p-4">
          <ul class="space-y-3">
            ${positionsCardsHtml || '<li class="py-8 text-center text-sm text-slate-400">Nenhum ativo cadastrado.</li>'}
          </ul>
        </div>
      </div>
    </div>
  </div>`;
}

module.exports = {
  renderPortfolioViewMarkup
};
