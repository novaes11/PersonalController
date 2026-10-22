const {
  fetchTransactions,
  deleteTransactionById
} = require('../services/transactionsApi');

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
 * Formata data AAAA-MM-DD para DD/MM/AAAA.
 * @param {string} isoDate
 */
function formatDateBR(isoDate) {
  if (!isoDate) return '-';
  const str = String(isoDate).slice(0, 10);
  const parts = str.split('-');
  if (parts.length !== 3) return str;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formata valor numérico para moeda BRL (R$ X,XX), com sinal semântico (+ para INCOME, - para EXPENSE).
 * @param {number|string} amount
 * @param {string} [categoryType]
 */
function formatCurrencyBRL(amount, categoryType = 'EXPENSE') {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const sign = categoryType === 'INCOME' ? '+' : '-';
  return `${sign} R$ ${formatted}`;
}

/**
 * Componente React RecentTransactionsTable (E04.T02).
 * Exibe a tabela de transações recentes com paginação e botão de exclusão por linha.
 *
 * @param {object} props
 * @param {Array} [props.transactions=[]]
 * @param {number} [props.limit=10]
 * @param {number} [props.offset=0]
 * @param {boolean} [props.isLoading=false]
 * @param {string|null} [props.deletingId=null]
 * @param {string|null} [props.error=null]
 * @param {Function} [props.onDelete]
 * @param {Function} [props.onPrevPage]
 * @param {Function} [props.onNextPage]
 * @param {object} [ReactInstance]
 */
function RecentTransactionsTable(props = {}, ReactInstance = global.React) {
  const {
    transactions = [],
    limit = 10,
    offset = 0,
    isLoading = false,
    deletingId = null,
    error = null,
    onDelete,
    onPrevPage,
    onNextPage
  } = props;

  const currentPage = Math.floor(offset / Math.max(limit, 1)) + 1;
  const hasPrevPage = offset > 0;
  const hasNextPage = transactions.length >= limit;

  if (ReactInstance && typeof ReactInstance.createElement === 'function') {
    const h = ReactInstance.createElement;

    const rows = transactions.map(tx => {
      const catType = tx.category?.type || 'EXPENSE';
      const catName = tx.category?.name || 'Sem categoria';
      const isIncome = catType === 'INCOME';
      const isDeleting = deletingId === tx.id;

      return h(
        'tr',
        {
          key: tx.id,
          'data-transaction-id': tx.id,
          className: 'border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors'
        },
        h('td', { className: 'py-3.5 px-4 text-sm text-slate-300 whitespace-nowrap' }, formatDateBR(tx.date)),
        h(
          'td',
          { className: 'py-3.5 px-4 text-sm font-medium text-slate-100' },
          tx.description || 'Sem descrição'
        ),
        h(
          'td',
          { className: 'py-3.5 px-4 text-sm text-slate-300' },
          h(
            'span',
            {
              className: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700'
            },
            catName
          )
        ),
        h(
          'td',
          { className: 'py-3.5 px-4 text-sm whitespace-nowrap' },
          h(
            'span',
            {
              className: isIncome
                ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/70 text-rose-300 border border-rose-800/60'
            },
            isIncome ? 'Receita' : 'Despesa'
          )
        ),
        h(
          'td',
          {
            className: `py-3.5 px-4 text-sm font-semibold text-right whitespace-nowrap ${
              isIncome ? 'text-emerald-400' : 'text-rose-400'
            }`
          },
          formatCurrencyBRL(tx.amount, catType)
        ),
        h(
          'td',
          { className: 'py-3.5 px-4 text-sm text-right whitespace-nowrap' },
          h(
            'button',
            {
              type: 'button',
              'data-action': 'delete',
              'data-transaction-id': tx.id,
              disabled: isDeleting || isLoading,
              'aria-label': `Excluir transação ${tx.description || tx.id}`,
              onClick: () => onDelete && onDelete(tx.id),
              className: 'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500'
            },
            isDeleting ? 'Excluindo...' : 'Excluir'
          )
        )
      );
    });

    return h(
      'section',
      {
        id: 'recent-transactions-section',
        'aria-label': 'Tabela de transações recentes',
        className: 'bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden text-slate-100'
      },
      h(
        'div',
        { className: 'p-6 border-b border-slate-800 flex items-center justify-between' },
        h(
          'div',
          null,
          h('h2', { className: 'text-lg font-semibold text-white tracking-tight' }, 'Transações Recentes'),
          h('p', { className: 'text-sm text-slate-400 mt-1' }, 'Histórico de movimentações financeiras lançadas na sua conta.')
        ),
        h(
          'span',
          { className: 'text-xs font-medium text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800' },
          `Página ${currentPage}`
        )
      ),
      error
        ? h(
            'div',
            {
              role: 'alert',
              'aria-live': 'assertive',
              className: 'm-6 rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-200'
            },
            error
          )
        : null,
      isLoading
        ? h(
            'div',
            {
              role: 'status',
              'aria-live': 'polite',
              className: 'p-8 text-center text-sm text-slate-400'
            },
            'Carregando transações...'
          )
        : transactions.length === 0
          ? h(
              'div',
              { className: 'p-8 text-center text-sm text-slate-400' },
              'Nenhuma transação encontrada neste período.'
            )
          : h(
              'div',
              { className: 'overflow-x-auto' },
              h(
                'table',
                { id: 'recent-transactions-table', className: 'w-full text-left border-collapse' },
                h(
                  'thead',
                  null,
                  h(
                    'tr',
                    { className: 'border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400' },
                    h('th', { scope: 'col', className: 'py-3 px-4' }, 'Data'),
                    h('th', { scope: 'col', className: 'py-3 px-4' }, 'Descrição'),
                    h('th', { scope: 'col', className: 'py-3 px-4' }, 'Categoria'),
                    h('th', { scope: 'col', className: 'py-3 px-4' }, 'Tipo'),
                    h('th', { scope: 'col', className: 'py-3 px-4 text-right' }, 'Valor'),
                    h('th', { scope: 'col', className: 'py-3 px-4 text-right' }, 'Ações')
                  )
                ),
                h('tbody', null, rows)
              )
            ),
      h(
        'div',
        { className: 'px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between' },
        h(
          'span',
          { className: 'text-xs text-slate-400' },
          `Exibindo ${transactions.length} registro(s) (offset ${offset})`
        ),
        h(
          'div',
          { className: 'flex items-center gap-2' },
          h(
            'button',
            {
              type: 'button',
              id: 'pagination-prev-btn',
              disabled: !hasPrevPage || isLoading,
              onClick: () => hasPrevPage && onPrevPage && onPrevPage(),
              className: 'rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors'
            },
            'Anterior'
          ),
          h(
            'button',
            {
              type: 'button',
              id: 'pagination-next-btn',
              disabled: !hasNextPage || isLoading,
              onClick: () => hasNextPage && onNextPage && onNextPage(),
              className: 'rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors'
            },
            'Próxima'
          )
        )
      )
    );
  }

  return {
    type: 'RecentTransactionsTable',
    props: {
      transactions,
      limit,
      offset,
      currentPage,
      hasPrevPage,
      hasNextPage,
      isLoading,
      deletingId,
      error
    },
    html: renderRecentTransactionsTableMarkup(props)
  };
}

/**
 * Renderiza o HTML semântico e acessível da Tabela de Transações Recentes.
 */
function renderRecentTransactionsTableMarkup(props = {}) {
  const {
    transactions = [],
    limit = 10,
    offset = 0,
    isLoading = false,
    deletingId = null,
    error = null
  } = props;

  const currentPage = Math.floor(offset / Math.max(limit, 1)) + 1;
  const hasPrevPage = offset > 0;
  const hasNextPage = transactions.length >= limit;

  const errorHtml = error
    ? `<div role="alert" aria-live="assertive" class="m-6 rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-200">${escapeHtml(error)}</div>`
    : '';

  let bodyHtml = '';
  if (isLoading) {
    bodyHtml = `<div role="status" aria-live="polite" class="p-8 text-center text-sm text-slate-400">Carregando transações...</div>`;
  } else if (transactions.length === 0) {
    bodyHtml = `<div class="p-8 text-center text-sm text-slate-400">Nenhuma transação encontrada neste período.</div>`;
  } else {
    const rowsHtml = transactions
      .map(tx => {
        const catType = tx.category?.type || 'EXPENSE';
        const catName = tx.category?.name || 'Sem categoria';
        const isIncome = catType === 'INCOME';
        const isDeleting = deletingId === tx.id;
        const badgeClass = isIncome
          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
          : 'bg-rose-950/70 text-rose-300 border-rose-800/60';
        const amountClass = isIncome ? 'text-emerald-400' : 'text-rose-400';

        return `<tr data-transaction-id="${escapeHtml(tx.id)}" class="border-b border-slate-800/80 hover:bg-slate-800/40 transition-colors">
          <td class="py-3.5 px-4 text-sm text-slate-300 whitespace-nowrap">${escapeHtml(formatDateBR(tx.date))}</td>
          <td class="py-3.5 px-4 text-sm font-medium text-slate-100">${escapeHtml(tx.description || 'Sem descrição')}</td>
          <td class="py-3.5 px-4 text-sm text-slate-300"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">${escapeHtml(catName)}</span></td>
          <td class="py-3.5 px-4 text-sm whitespace-nowrap"><span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}">${isIncome ? 'Receita' : 'Despesa'}</span></td>
          <td class="py-3.5 px-4 text-sm font-semibold text-right whitespace-nowrap ${amountClass}">${escapeHtml(formatCurrencyBRL(tx.amount, catType))}</td>
          <td class="py-3.5 px-4 text-sm text-right whitespace-nowrap">
            <button type="button" data-action="delete" data-transaction-id="${escapeHtml(tx.id)}" aria-label="Excluir transação ${escapeHtml(tx.description || tx.id)}" class="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 disabled:opacity-50 transition-colors"${isDeleting ? ' disabled' : ''}>${isDeleting ? 'Excluindo...' : 'Excluir'}</button>
          </td>
        </tr>`;
      })
      .join('');

    bodyHtml = `<div class="overflow-x-auto">
      <table id="recent-transactions-table" class="w-full text-left border-collapse">
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
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  }

  return `
<section id="recent-transactions-section" aria-label="Tabela de transações recentes" class="bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden text-slate-100">
  <div class="p-6 border-b border-slate-800 flex items-center justify-between">
    <div>
      <h2 class="text-lg font-semibold text-white tracking-tight">Transações Recentes</h2>
      <p class="text-sm text-slate-400 mt-1">Histórico de movimentações financeiras lançadas na sua conta.</p>
    </div>
    <span class="text-xs font-medium text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">Página ${currentPage}</span>
  </div>
  ${errorHtml}
  ${bodyHtml}
  <div class="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
    <span class="text-xs text-slate-400">Exibindo ${transactions.length} registro(s) (offset ${offset})</span>
    <div class="flex items-center gap-2">
      <button type="button" id="pagination-prev-btn" class="rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors"${!hasPrevPage || isLoading ? ' disabled' : ''}>Anterior</button>
      <button type="button" id="pagination-next-btn" class="rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition-colors"${!hasNextPage || isLoading ? ' disabled' : ''}>Próxima</button>
    </div>
  </div>
</section>`.trim();
}

/**
 * Controlador de estado para a Tabela de Transações Recentes (E04.T02).
 * Gerencia carregamento via GET /api/transactions, paginação (limit/offset) e exclusão via DELETE /api/transactions/:id.
 */
function createRecentTransactionsController(options = {}) {
  const {
    token = null,
    baseUrl = '/api',
    limit = 10,
    initialOffset = 0,
    fetchImpl = global.fetch,
    onTransactionDeleted = null
  } = options;

  const state = {
    transactions: [],
    limit,
    offset: initialOffset,
    filters: {
      start_date: options.start_date || null,
      end_date: options.end_date || null,
      category_id: options.category_id || null
    },
    isLoading: false,
    deletingId: null,
    error: null
  };

  async function loadTransactions() {
    state.isLoading = true;
    state.error = null;
    try {
      const response = await fetchTransactions({
        token,
        baseUrl,
        limit: state.limit,
        offset: state.offset,
        start_date: state.filters.start_date,
        end_date: state.filters.end_date,
        category_id: state.filters.category_id,
        fetchImpl
      });
      state.transactions = response.data;
      return response;
    } catch (err) {
      state.error = err.message;
      throw err;
    } finally {
      state.isLoading = false;
    }
  }

  async function nextPage() {
    if (state.transactions.length < state.limit) {
      return state.transactions;
    }
    state.offset += state.limit;
    const res = await loadTransactions();
    return res.data;
  }

  async function prevPage() {
    if (state.offset === 0) {
      return state.transactions;
    }
    state.offset = Math.max(0, state.offset - state.limit);
    const res = await loadTransactions();
    return res.data;
  }

  async function goToPage(pageNumber) {
    const page = Math.max(1, parseInt(pageNumber, 10) || 1);
    state.offset = (page - 1) * state.limit;
    const res = await loadTransactions();
    return res.data;
  }

  async function deleteTransaction(transactionId) {
    state.deletingId = transactionId;
    state.error = null;
    try {
      const deleted = await deleteTransactionById(transactionId, {
        token,
        baseUrl,
        fetchImpl
      });
      state.transactions = state.transactions.filter(tx => tx.id !== transactionId);
      if (typeof onTransactionDeleted === 'function') {
        onTransactionDeleted(deleted);
      }
      return { ok: true, data: deleted };
    } catch (err) {
      state.error = err.message;
      return { ok: false, error: err.message };
    } finally {
      state.deletingId = null;
    }
  }

  function render(ReactInstance) {
    return RecentTransactionsTable(
      {
        transactions: state.transactions,
        limit: state.limit,
        offset: state.offset,
        isLoading: state.isLoading,
        deletingId: state.deletingId,
        error: state.error,
        onDelete: deleteTransaction,
        onPrevPage: prevPage,
        onNextPage: nextPage
      },
      ReactInstance
    );
  }

  return {
    getState: () => ({
      ...state,
      transactions: [...state.transactions],
      filters: { ...state.filters },
      currentPage: Math.floor(state.offset / Math.max(state.limit, 1)) + 1
    }),
    loadTransactions,
    nextPage,
    prevPage,
    goToPage,
    deleteTransaction,
    render
  };
}

module.exports = {
  RecentTransactionsTable,
  renderRecentTransactionsTableMarkup,
  createRecentTransactionsController,
  formatDateBR,
  formatCurrencyBRL
};
