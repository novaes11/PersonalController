const {
  buildTransactionPayload,
  fetchCategories,
  submitTransaction
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

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formata o rótulo de exibição da categoria no dropdown.
 * @param {{ id: string, name: string, type: string }} category
 */
function formatCategoryOptionLabel(category) {
  const typeBadge = category.type === 'INCOME' ? 'Receita' : 'Despesa';
  return `${category.name} (${typeBadge})`;
}

/**
 * Componente React TransactionForm (E04.T01).
 * Compatível com React.createElement (sem exigir transpilador Babel em runtime Node/Jest)
 * e com renderização SSR/HTML semântica com Tailwind CSS.
 *
 * @param {object} props
 * @param {Array<{id: string, name: string, type: string, color?: string, icon?: string}>} [props.categories=[]]
 * @param {object} [props.values]
 * @param {Array<{field: string, message: string}>} [props.errors=[]]
 * @param {boolean} [props.isSubmitting=false]
 * @param {string} [props.successMessage=null]
 * @param {Function} [props.onChange]
 * @param {Function} [props.onSubmit]
 * @param {object} [ReactInstance] Instância opcional do React (ex: window.React)
 */
function TransactionForm(props = {}, ReactInstance = global.React) {
  const {
    categories = [],
    values = {},
    errors = [],
    isSubmitting = false,
    successMessage = null,
    onChange,
    onSubmit
  } = props;

  const currentValues = {
    category_id: values.category_id ?? '',
    amount: values.amount ?? '',
    date: values.date || getTodayIsoDate(),
    description: values.description ?? ''
  };

  // Caso uma instância React com createElement esteja disponível, retorna a árvore de React Elements
  if (ReactInstance && typeof ReactInstance.createElement === 'function') {
    const h = ReactInstance.createElement;

    const categoryOptions = [
      h('option', { key: 'empty', value: '' }, 'Selecione uma categoria'),
      ...categories.map(cat =>
        h(
          'option',
          { key: cat.id, value: cat.id, 'data-type': cat.type },
          formatCategoryOptionLabel(cat)
        )
      )
    ];

    return h(
      'form',
      {
        id: 'manual-transaction-form',
        'aria-label': 'Formulário de lançamento manual de transação',
        className: 'bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-5 text-slate-100',
        onSubmit: (e) => {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof onSubmit === 'function') onSubmit(currentValues, e);
        },
        noValidate: true
      },
      h(
        'div',
        { className: 'border-b border-slate-800 pb-4' },
        h('h2', { className: 'text-lg font-semibold text-white tracking-tight' }, 'Nova Transação'),
        h('p', { className: 'text-sm text-slate-400 mt-1' }, 'Registre receitas ou despesas manualmente no seu fluxo de caixa.')
      ),
      errors.length > 0
        ? h(
            'div',
            {
              role: 'alert',
              'aria-live': 'assertive',
              className: 'rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-200'
            },
            h(
              'ul',
              { className: 'list-disc list-inside space-y-1' },
              errors.map((err, idx) => h('li', { key: idx }, err.message))
            )
          )
        : null,
      successMessage
        ? h(
            'div',
            {
              role: 'status',
              'aria-live': 'polite',
              className: 'rounded-lg bg-emerald-950/60 border border-emerald-800 p-3 text-sm text-emerald-200'
            },
            successMessage
          )
        : null,
      h(
        'div',
        { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        // Dropdown de Categoria
        h(
          'div',
          { className: 'space-y-1.5' },
          h(
            'label',
            { htmlFor: 'transaction-category', className: 'block text-sm font-medium text-slate-200' },
            'Categoria'
          ),
          h(
            'select',
            {
              id: 'transaction-category',
              name: 'category_id',
              value: currentValues.category_id,
              disabled: isSubmitting,
              onChange: (e) => onChange && onChange('category_id', e.target.value),
              className: 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
            },
            categoryOptions
          )
        ),
        // Campo de Valor (Amount)
        h(
          'div',
          { className: 'space-y-1.5' },
          h(
            'label',
            { htmlFor: 'transaction-amount', className: 'block text-sm font-medium text-slate-200' },
            'Valor (R$)'
          ),
          h('input', {
            id: 'transaction-amount',
            name: 'amount',
            type: 'number',
            step: '0.01',
            min: '0.01',
            required: true,
            placeholder: '0,00',
            value: currentValues.amount,
            disabled: isSubmitting,
            onChange: (e) => onChange && onChange('amount', e.target.value),
            className: 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          })
        ),
        // Campo de Data
        h(
          'div',
          { className: 'space-y-1.5' },
          h(
            'label',
            { htmlFor: 'transaction-date', className: 'block text-sm font-medium text-slate-200' },
            'Data'
          ),
          h('input', {
            id: 'transaction-date',
            name: 'date',
            type: 'date',
            required: true,
            value: currentValues.date,
            disabled: isSubmitting,
            onChange: (e) => onChange && onChange('date', e.target.value),
            className: 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          })
        ),
        // Campo de Descrição
        h(
          'div',
          { className: 'space-y-1.5' },
          h(
            'label',
            { htmlFor: 'transaction-description', className: 'block text-sm font-medium text-slate-200' },
            'Descrição'
          ),
          h('input', {
            id: 'transaction-description',
            name: 'description',
            type: 'text',
            maxLength: 255,
            placeholder: 'Ex: Supermercado, Salário, Uber...',
            value: currentValues.description,
            disabled: isSubmitting,
            onChange: (e) => onChange && onChange('description', e.target.value),
            className: 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500'
          })
        )
      ),
      h(
        'div',
        { className: 'pt-2 flex justify-end' },
        h(
          'button',
          {
            type: 'submit',
            disabled: isSubmitting,
            className: 'inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400'
          },
          isSubmitting ? 'Salvando...' : 'Adicionar Transação'
        )
      )
    );
  }

  // Fallback estruturado caso chamado sem instância React global (retorna representação de árvore + HTML)
  return {
    type: 'TransactionForm',
    props: {
      categories,
      values: currentValues,
      errors,
      isSubmitting,
      successMessage
    },
    html: renderTransactionFormMarkup(props)
  };
}

/**
 * Renderiza o HTML semântico e acessível do componente TransactionForm.
 * Segue as diretrizes ui-styling e ui-ux-pro-max (labels explícitos, SVG aria-hidden, estados de erro).
 */
function renderTransactionFormMarkup(props = {}) {
  const {
    categories = [],
    values = {},
    errors = [],
    isSubmitting = false,
    successMessage = null
  } = props;

  const categoryId = values.category_id ?? '';
  const amount = values.amount ?? '';
  const date = values.date || getTodayIsoDate();
  const description = values.description ?? '';

  const optionsHtml = [
    `<option value="">Selecione uma categoria</option>`,
    ...categories.map(cat => {
      const selectedAttr = String(cat.id) === String(categoryId) ? ' selected' : '';
      return `<option value="${escapeHtml(cat.id)}" data-type="${escapeHtml(cat.type)}"${selectedAttr}>${escapeHtml(formatCategoryOptionLabel(cat))}</option>`;
    })
  ].join('');

  const errorsHtml = errors.length > 0
    ? `<div role="alert" aria-live="assertive" class="rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-200"><ul class="list-disc list-inside space-y-1">${errors.map(e => `<li>${escapeHtml(e.message)}</li>`).join('')}</ul></div>`
    : '';

  const successHtml = successMessage
    ? `<div role="status" aria-live="polite" class="rounded-lg bg-emerald-950/60 border border-emerald-800 p-3 text-sm text-emerald-200">${escapeHtml(successMessage)}</div>`
    : '';

  return `
<form id="manual-transaction-form" aria-label="Formulário de lançamento manual de transação" class="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-5 text-slate-100" novalidate>
  <div class="border-b border-slate-800 pb-4">
    <h2 class="text-lg font-semibold text-white tracking-tight">Nova Transação</h2>
    <p class="text-sm text-slate-400 mt-1">Registre receitas ou despesas manualmente no seu fluxo de caixa.</p>
  </div>
  ${errorsHtml}
  ${successHtml}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="space-y-1.5">
      <label for="transaction-category" class="block text-sm font-medium text-slate-200">Categoria</label>
      <select id="transaction-category" name="category_id" class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"${isSubmitting ? ' disabled' : ''}>
        ${optionsHtml}
      </select>
    </div>
    <div class="space-y-1.5">
      <label for="transaction-amount" class="block text-sm font-medium text-slate-200">Valor (R$)</label>
      <input id="transaction-amount" name="amount" type="number" step="0.01" min="0.01" required placeholder="0,00" value="${escapeHtml(amount)}" class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"${isSubmitting ? ' disabled' : ''} />
    </div>
    <div class="space-y-1.5">
      <label for="transaction-date" class="block text-sm font-medium text-slate-200">Data</label>
      <input id="transaction-date" name="date" type="date" required value="${escapeHtml(date)}" class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"${isSubmitting ? ' disabled' : ''} />
    </div>
    <div class="space-y-1.5">
      <label for="transaction-description" class="block text-sm font-medium text-slate-200">Descrição</label>
      <input id="transaction-description" name="description" type="text" maxlength="255" placeholder="Ex: Supermercado, Salário, Uber..." value="${escapeHtml(description)}" class="w-full rounded-lg bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"${isSubmitting ? ' disabled' : ''} />
    </div>
  </div>
  <div class="pt-2 flex justify-end">
    <button type="submit" class="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"${isSubmitting ? ' disabled' : ''}>
      ${isSubmitting ? 'Salvando...' : 'Adicionar Transação'}
    </button>
  </div>
</form>`.trim();
}

/**
 * Cria um controlador de estado para o formulário de transação manual.
 * Facilita integração em hooks React e testes de integração de ponta a ponta.
 */
function createTransactionFormController(options = {}) {
  const {
    token = null,
    baseUrl = '/api',
    fetchImpl = global.fetch,
    initialValues = {},
    onTransactionCreated = null
  } = options;

  const state = {
    categories: [],
    values: {
      category_id: initialValues.category_id ?? '',
      amount: initialValues.amount ?? '',
      date: initialValues.date || getTodayIsoDate(),
      description: initialValues.description ?? ''
    },
    errors: [],
    isLoadingCategories: false,
    isSubmitting: false,
    successMessage: null,
    lastCreatedTransaction: null
  };

  async function loadCategories() {
    state.isLoadingCategories = true;
    state.errors = [];
    try {
      const list = await fetchCategories({ token, baseUrl, fetchImpl });
      state.categories = list;
      return list;
    } catch (err) {
      state.errors = [{ field: 'categories', message: err.message }];
      throw err;
    } finally {
      state.isLoadingCategories = false;
    }
  }

  function setFieldValue(field, value) {
    if (!['category_id', 'amount', 'date', 'description'].includes(field)) {
      return;
    }
    state.values[field] = value;
    state.successMessage = null;
  }

  async function submit() {
    state.errors = [];
    state.successMessage = null;

    const validation = buildTransactionPayload(state.values);
    if (!validation.valid) {
      state.errors = validation.errors;
      return { ok: false, errors: validation.errors };
    }

    state.isSubmitting = true;
    try {
      const created = await submitTransaction(state.values, { token, baseUrl, fetchImpl });
      state.lastCreatedTransaction = created;
      state.successMessage = 'Transação registrada com sucesso!';
      // Reseta valor e descrição preservando data e categoria selecionada para lançamentos seguidos
      state.values.amount = '';
      state.values.description = '';

      if (typeof onTransactionCreated === 'function') {
        onTransactionCreated(created);
      }
      return { ok: true, data: created };
    } catch (err) {
      state.errors = err.validationErrors || [{ field: 'form', message: err.message }];
      return { ok: false, errors: state.errors };
    } finally {
      state.isSubmitting = false;
    }
  }

  function render(ReactInstance) {
    return TransactionForm(
      {
        categories: state.categories,
        values: state.values,
        errors: state.errors,
        isSubmitting: state.isSubmitting,
        successMessage: state.successMessage,
        onChange: setFieldValue,
        onSubmit: submit
      },
      ReactInstance
    );
  }

  return {
    getState: () => ({ ...state, values: { ...state.values }, categories: [...state.categories], errors: [...state.errors] }),
    loadCategories,
    setFieldValue,
    submit,
    render
  };
}

module.exports = {
  TransactionForm,
  renderTransactionFormMarkup,
  createTransactionFormController,
  formatCategoryOptionLabel
};
