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

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Renderiza a visualização dedicada de Fluxo de Caixa (E06.T02).
 */
function renderCashflowViewMarkup({
  transactions = [],
  categories = []
} = {}) {
  let totalIncome = 0;
  let totalExpenses = 0;

  for (const tx of transactions) {
    const type = tx.category?.type || tx.categories?.type || 'EXPENSE';
    const amount = Number(tx.amount) || 0;
    if (type === 'INCOME') totalIncome += amount;
    else if (type === 'EXPENSE') totalExpenses += amount;
  }

  const netBalance = totalIncome - totalExpenses;

  const rowsHtml = transactions.map(tx => {
    const type = tx.category?.type || tx.categories?.type || 'EXPENSE';
    const isIncome = type === 'INCOME';
    const categoryName = tx.category?.name || tx.categories?.name || 'Geral';
    const txId = escapeHtml(tx.id);
    const desc = escapeHtml(tx.description || 'Sem descrição');

    return `<tr
      data-testid="cashflow-row-${txId}"
      data-cashflow-tx-id="${txId}"
      data-tx-type="${type}"
      class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors"
    >
      <td class="py-3.5 px-4 text-sm text-slate-300 whitespace-nowrap">${formatDateBR(tx.date)}</td>
      <td class="py-3.5 px-4 text-sm font-medium text-slate-100">${desc}</td>
      <td class="py-3.5 px-4 text-sm text-slate-300">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
          ${escapeHtml(categoryName)}
        </span>
      </td>
      <td class="py-3.5 px-4 text-sm whitespace-nowrap">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
          isIncome
            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
            : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
        }">
          ${isIncome ? 'Receita' : 'Despesa'}
        </span>
      </td>
      <td class="py-3.5 px-4 text-sm font-semibold text-right whitespace-nowrap ${
        isIncome ? 'text-emerald-400' : 'text-rose-400'
      }">
        ${isIncome ? '+' : '-'} R$ ${formatCurrencyBRL(tx.amount)}
      </td>
      <td class="py-3.5 px-4 text-sm text-right whitespace-nowrap">
        <button
          type="button"
          data-action="delete"
          data-tx-id="${txId}"
          aria-label="Excluir transação ${desc}"
          class="delete-btn touch-target inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors"
          style="min-height: 44px; min-width: 44px;"
        >
          Excluir
        </button>
      </td>
    </tr>`;
  }).join('');

  const mobileCardsHtml = transactions.map(tx => {
    const type = tx.category?.type || tx.categories?.type || 'EXPENSE';
    const isIncome = type === 'INCOME';
    const categoryName = tx.category?.name || tx.categories?.name || 'Geral';
    const txId = escapeHtml(tx.id);
    const desc = escapeHtml(tx.description || 'Sem descrição');

    return `<li
      data-testid="cashflow-mobile-card-${txId}"
      data-cashflow-tx-id="${txId}"
      data-tx-type="${type}"
      class="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3"
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <p class="text-sm font-semibold text-slate-100">${desc}</p>
          <p class="text-xs text-slate-400 mt-1">${formatDateBR(tx.date)}</p>
        </div>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
          isIncome
            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
            : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
        }">
          ${isIncome ? 'Receita' : 'Despesa'}
        </span>
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
          ${escapeHtml(categoryName)}
        </span>
        <span class="text-sm font-semibold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">
          ${isIncome ? '+' : '-'} R$ ${formatCurrencyBRL(tx.amount)}
        </span>
      </div>
      <button
        type="button"
        data-action="delete"
        data-tx-id="${txId}"
        aria-label="Excluir transação ${desc}"
        class="delete-btn touch-target w-full inline-flex items-center justify-center rounded-lg px-3 py-2.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors"
        style="min-height: 44px; min-width: 44px;"
      >
        Excluir
      </button>
    </li>`;
  }).join('');

  return `<div data-testid="cashflow-view" class="space-y-6">
    <!-- Resumo do Fluxo de Caixa -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Receitas do Mês</span>
        <span data-testid="cashflow-income-total" class="text-xl md:text-2xl font-bold text-emerald-400 block mt-1">
          + R$ ${formatCurrencyBRL(totalIncome)}
        </span>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Despesas do Mês</span>
        <span data-testid="cashflow-expense-total" class="text-xl md:text-2xl font-bold text-rose-400 block mt-1">
          - R$ ${formatCurrencyBRL(totalExpenses)}
        </span>
      </div>
      <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5">
        <span class="text-xs font-medium text-slate-400 uppercase tracking-wider block">Saldo Operacional</span>
        <span data-testid="cashflow-net-total" class="text-xl md:text-2xl font-bold ${
          netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
        } block mt-1">
          R$ ${formatCurrencyBRL(netBalance)}
        </span>
      </div>
    </div>

    <!-- Barra de Filtros e Ação Rápida -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      <!-- Filtros de Tipo -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0" role="group" aria-label="Filtrar por tipo de lançamento">
        <button
          type="button"
          data-testid="filter-all-btn"
          data-filter-type="ALL"
          class="filter-pill touch-target px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition-colors"
          style="min-height: 44px; min-width: 44px;"
        >
          Todas (${transactions.length})
        </button>
        <button
          type="button"
          data-testid="filter-income-btn"
          data-filter-type="INCOME"
          class="filter-pill touch-target px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          style="min-height: 44px; min-width: 44px;"
        >
          Receitas
        </button>
        <button
          type="button"
          data-testid="filter-expense-btn"
          data-filter-type="EXPENSE"
          class="filter-pill touch-target px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          style="min-height: 44px; min-width: 44px;"
        >
          Despesas
        </button>
      </div>

      <!-- Busca e Nova Transação -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1 md:w-64">
          <input
            type="search"
            id="cashflow-search"
            data-testid="cashflow-search-input"
            placeholder="Buscar por descrição..."
            aria-label="Buscar transações por descrição"
            class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            style="min-height: 44px;"
          />
        </div>
        <button
          type="button"
          data-testid="cashflow-add-btn"
          aria-label="Nova Transação"
          class="touch-target inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 transition-colors shadow-sm whitespace-nowrap"
          style="min-height: 44px;"
        >
          <span>+ Nova</span>
        </button>
      </div>
    </div>

    <!-- Lista de Lançamentos -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-sm">
      <div class="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-100">Extrato Consolidado</h2>
        <span class="text-xs text-slate-400">Total: <span id="cashflow-visible-count">${transactions.length}</span> itens</span>
      </div>

      <!-- Tabela Desktop (>= 768px) -->
      <div class="hidden md:block overflow-x-auto">
        <table class="w-full text-left border-collapse" data-testid="cashflow-desktop-table">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <th scope="col" class="py-3 px-4">Data</th>
              <th scope="col" class="py-3 px-4">Descrição</th>
              <th scope="col" class="py-3 px-4">Categoria</th>
              <th scope="col" class="py-3 px-4">Tipo</th>
              <th scope="col" class="py-3 px-4 text-right">Valor</th>
              <th scope="col" class="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody id="cashflow-table-body" data-testid="cashflow-table-body">
            ${rowsHtml || '<tr><td colspan="6" class="py-8 text-center text-sm text-slate-400">Nenhum lançamento encontrado.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Cards Mobile (< 768px) -->
      <div class="block md:hidden p-4">
        <ul id="cashflow-mobile-list" data-testid="cashflow-mobile-list" class="space-y-3">
          ${mobileCardsHtml || '<li class="py-8 text-center text-sm text-slate-400">Nenhum lançamento encontrado.</li>'}
        </ul>
      </div>
    </div>
  </div>`;
}

module.exports = {
  renderCashflowViewMarkup
};
