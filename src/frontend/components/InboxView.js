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
  return String(dateStr);
}

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveMatchedCategoryId(tx, categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return '';
  }

  const directId = tx.category_id || tx.suggested_category_id;
  if (directId && categories.some(c => c.id === directId)) {
    return directId;
  }

  const targetName = normalizeLabel(tx.suggested_category_name || tx.categoryName || '');
  if (targetName) {
    const exactMatch = categories.find(c => normalizeLabel(c.name) === targetName);
    if (exactMatch) return exactMatch.id;

    const partialMatch = categories.find(c => {
      const cName = normalizeLabel(c.name);
      return cName.includes(targetName) || targetName.includes(cName);
    });
    if (partialMatch) return partialMatch.id;
  }

  const txType = tx.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
  const typeMatch = categories.find(c => c.type === txType);
  return typeMatch ? typeMatch.id : categories[0].id;
}

/**
 * Renderiza a visualização dedicada da Área Experimental (Inbox / Produtividade IA - E06.T02 & E07.T02).
 */
function renderInboxViewMarkup(options = {}) {
  const {
    categories = [],
    extractedTransactions = null,
    summary = null
  } = options;

  const alerts = [
    {
      id: 'burn-rate',
      title: 'Monitor de Burn Rate Orçamentário',
      description: 'O consumo orçamentário mensal está sendo monitorado em tempo real.',
      severity: 'warning',
      badge: 'Atenção',
      time: 'Há 15 minutos'
    },
    {
      id: 'quotes-sync',
      title: 'Worker de Cotações de Mercado',
      description: 'Cotações de ações da B3 e câmbio atualizadas via AwesomeAPI e Brapi.',
      severity: 'success',
      badge: 'Ativo',
      time: 'Há 1 hora'
    },
    {
      id: 'notion-sync',
      title: 'Sincronizador Notion ↔ GitHub',
      description: 'Pipeline autônomo pronto para receber tarefas com label "copilot-agent".',
      severity: 'info',
      badge: 'Conectado',
      time: 'Hoje'
    }
  ];

  const alertsHtml = alerts.map(alert => {
    let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
    if (alert.severity === 'warning') badgeColor = 'bg-amber-950 text-amber-300 border-amber-800/70';
    else if (alert.severity === 'success') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800/70';
    else if (alert.severity === 'info') badgeColor = 'bg-sky-950 text-sky-300 border-sky-800/70';

    return `<li
      data-testid="inbox-alert-${alert.id}"
      class="p-4 rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
    >
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-slate-100">${escapeHtml(alert.title)}</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}">
            ${escapeHtml(alert.badge)}
          </span>
        </div>
        <p class="text-xs text-slate-400">${escapeHtml(alert.description)}</p>
      </div>
      <span class="text-xs text-slate-400 shrink-0 whitespace-nowrap">${escapeHtml(alert.time)}</span>
    </li>`;
  }).join('');

  const defaultPreview = [
    {
      id: 'tx-preview-1',
      date: '2026-11-07',
      description: 'SUPERMERCADO CENTRAL',
      amount: 248.90,
      type: 'EXPENSE',
      needs_review: false,
      suggested_category_name: 'Alimentação',
      selected: true
    },
    {
      id: 'tx-preview-2',
      date: '2026-11-08',
      description: 'UBER *TRIP 3321',
      amount: 32.50,
      type: 'EXPENSE',
      needs_review: true,
      suggested_category_name: 'Transporte',
      selected: true
    },
    {
      id: 'tx-preview-3',
      date: '2026-11-10',
      description: 'CREDITO SALARIO EMPRESA',
      amount: 8500.00,
      type: 'INCOME',
      needs_review: false,
      suggested_category_name: 'Salário',
      selected: true
    }
  ];

  const rows = Array.isArray(extractedTransactions) ? extractedTransactions : defaultPreview;
  const totalExtracted = summary && typeof summary.total_extracted === 'number'
    ? summary.total_extracted
    : rows.length;
  const reviewCount = summary && typeof summary.review_required_count === 'number'
    ? summary.review_required_count
    : rows.filter(t => Boolean(t.needs_review)).length;
  const highConfidenceCount = summary && typeof summary.high_confidence_count === 'number'
    ? summary.high_confidence_count
    : Math.max(0, totalExtracted - reviewCount);
  const selectedCount = rows.filter(t => t.selected !== false).length;

  const extractedRowsHtml = rows.length === 0
    ? '<li data-testid="pdf-reconcile-empty" class="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-400">Nenhuma transação aguardando conciliação. Selecione um arquivo PDF ou carregue um extrato de exemplo acima.</li>'
    : rows.map((tx, idx) => {
        const rowId = escapeHtml(tx.fingerprint || tx.id || `row-${idx}`);
        const isIncome = tx.type === 'INCOME';
        const formattedAmount = `${isIncome ? '+' : '-'} R$ ${formatCurrencyBRL(tx.amount)}`;
        const needsReview = Boolean(tx.needs_review);
        const statusLabel = needsReview ? 'Revisar' : 'Alta confiança';
        const statusClass = needsReview
          ? 'text-amber-300 border-amber-800 bg-amber-950'
          : 'text-emerald-300 border-emerald-800 bg-emerald-950';
        const amountBadgeClass = isIncome
          ? 'text-emerald-300 bg-emerald-950 border-emerald-800'
          : 'text-rose-300 bg-rose-950 border-rose-800';
        const matchedCatId = resolveMatchedCategoryId(tx, categories);
        const isSelected = tx.selected !== false;

        const categoryOptionsHtml = Array.isArray(categories) && categories.length > 0
          ? `<option value="">Sem categoria</option>` + categories.map(cat => {
              const typeLabel = cat.type === 'INCOME' ? 'Receita' : 'Despesa';
              const selectedAttr = cat.id === matchedCatId ? ' selected' : '';
              return `<option value="${escapeHtml(cat.id)}"${selectedAttr}>${escapeHtml(cat.name)} (${typeLabel})</option>`;
            }).join('')
          : `<option value="">${escapeHtml(tx.suggested_category_name || tx.categoryName || 'Sugestão automática')}</option>
             <option value="">Sem categoria</option>`;

        return `<li data-testid="pdf-reconcile-row-${rowId}" data-row-index="${idx}" class="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <label
                for="pdf-select-${rowId}"
                class="touch-target inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 shrink-0 cursor-pointer"
                style="min-height: 44px; min-width: 44px;"
                aria-label="Incluir transação ${escapeHtml(tx.description)} na importação"
              >
                <input
                  id="pdf-select-${rowId}"
                  type="checkbox"
                  data-testid="pdf-select-tx-${rowId}"
                  data-row-index="${idx}"
                  class="pdf-row-checkbox h-4 w-4 rounded border-slate-600 text-indigo-500"
                  ${isSelected ? 'checked' : ''}
                />
              </label>
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs text-slate-400 tabular-nums">${escapeHtml(formatDateBR(tx.date))}</span>
                  <span class="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tabular-nums ${amountBadgeClass}">
                    ${escapeHtml(formattedAmount)}
                  </span>
                </div>
                <p class="text-sm font-semibold text-slate-100 truncate">${escapeHtml(tx.description)}</p>
              </div>
            </div>
            <span class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${statusClass}">
              ${escapeHtml(statusLabel)}
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs text-slate-400 block" for="pdf-desc-${rowId}">Descrição ajustável</label>
              <input
                id="pdf-desc-${rowId}"
                type="text"
                maxlength="255"
                data-row-index="${idx}"
                data-testid="pdf-desc-input-${rowId}"
                value="${escapeHtml(tx.description)}"
                class="pdf-desc-input touch-target w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                style="min-height: 44px; min-width: 44px;"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-slate-400 block" for="pdf-category-${rowId}">Categoria sugerida</label>
              <select
                id="pdf-category-${rowId}"
                data-row-index="${idx}"
                data-testid="pdf-category-select-${rowId}"
                class="pdf-category-select touch-target w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                style="min-height: 44px; min-width: 44px;"
              >
                ${categoryOptionsHtml}
              </select>
            </div>
          </div>
        </li>`;
      }).join('');

  return `<div data-testid="inbox-view" class="space-y-6 max-w-4xl mx-auto">
    <!-- Header com Badge de Área Experimental -->
    <div class="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-5 md:p-6 shadow-sm">
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <h2 class="text-base font-bold text-slate-100">Inbox & Produtividade com IA</h2>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
              Experimental
            </span>
          </div>
          <p class="text-xs text-slate-400">
            Painel de alertas preditivos, triagem de faturas por IA e automações financeiras autônomas.
          </p>
        </div>
      </div>
    </div>

    <!-- Feed de Notificações e Alertas -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-100">Feed de Alertas Recentes</h3>
        <span class="text-xs text-slate-400">${alerts.length} alertas</span>
      </div>
      <ul class="space-y-3">
        ${alertsHtml}
      </ul>
    </div>

    <!-- Upload Mobile-First de PDF e Conciliação (E07.T02) -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-100">Upload, Conciliação e Confirmação em Lote de PDF</h3>
            <p class="mt-0.5 text-xs text-slate-400">Fluxo mobile-first para enviar extratos/faturas (.pdf até 5 MB), revisar categorias e confirmar importação em lote.</p>
          </div>
        </div>
      </div>

      <form id="pdf-upload-form" data-testid="pdf-upload-form" class="mt-4 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label for="pdf-document-type" class="text-xs font-semibold text-slate-300 block mb-1">Tipo de documento</label>
            <select
              id="pdf-document-type"
              data-testid="pdf-document-type"
              class="touch-target w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-100"
              style="min-height: 44px; min-width: 44px;"
            >
              <option value="AUTO">Detecção Automática (Extrato ou Fatura)</option>
              <option value="BANK_STATEMENT">Extrato Bancário (Conta Corrente)</option>
              <option value="CREDIT_CARD_INVOICE">Fatura de Cartão de Crédito</option>
            </select>
          </div>
          <div>
            <label for="pdf-reference-year" class="text-xs font-semibold text-slate-300 block mb-1">Ano de referência</label>
            <input
              id="pdf-reference-year"
              data-testid="pdf-reference-year"
              type="number"
              min="2000"
              max="2100"
              value="2026"
              inputmode="numeric"
              class="touch-target w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 text-sm text-slate-100 tabular-nums"
              style="min-height: 44px; min-width: 44px;"
            />
          </div>
        </div>

        <div>
          <label for="pdf-file-input" class="text-xs font-semibold text-slate-300 block mb-1">Arquivo PDF do extrato ou fatura</label>
          <input
            id="pdf-file-input"
            data-testid="pdf-file-input"
            type="file"
            accept="application/pdf,.pdf"
            class="touch-target w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            style="min-height: 44px; min-width: 44px;"
          />
          <p id="pdf-file-status" data-testid="pdf-file-status" class="mt-1 text-xs text-slate-400">
            Nenhum arquivo selecionado (máximo 5 MB).
          </p>
        </div>

        <details data-testid="pdf-manual-text-toggle" class="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <summary
            class="touch-target flex items-center text-xs font-semibold text-slate-300 cursor-pointer select-none"
            style="min-height: 44px; min-width: 44px;"
          >
            Ou colar linhas do extrato manualmente (fallback opcional)
          </summary>
          <div class="pt-2 pb-1">
            <label for="pdf-raw-text-input" class="text-xs text-slate-400 block mb-1">Linhas do extrato (DD/MM Descrição Valor)</label>
            <textarea
              id="pdf-raw-text-input"
              data-testid="pdf-raw-text-input"
              rows="3"
              placeholder="Ex: 05/11/2026 IFOOD *RESTAURANTE -45,90&#10;10/11/2026 CREDITO SALARIO +8.500,00"
              class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 font-mono"
            ></textarea>
          </div>
        </details>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="submit"
            id="pdf-parse-btn"
            data-testid="pdf-parse-btn"
            class="touch-target w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            style="min-height: 44px; min-width: 44px;"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Extrair transações do PDF
          </button>
          <button
            type="button"
            id="pdf-demo-sample-btn"
            data-testid="pdf-demo-sample-btn"
            class="touch-target w-full inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            style="min-height: 44px; min-width: 44px;"
          >
            Carregar extrato exemplo
          </button>
        </div>
      </form>

      <div data-testid="pdf-reconcile-summary" class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div class="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
          <span class="text-slate-400 block">Extraídas</span>
          <span data-testid="pdf-summary-total" class="font-semibold text-slate-100 block mt-1 tabular-nums">${totalExtracted} ${totalExtracted === 1 ? 'transação' : 'transações'}</span>
        </div>
        <div class="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">Revisar</span>
          <span data-testid="pdf-summary-review" class="font-semibold text-slate-100 block mt-1 tabular-nums">${reviewCount} ${reviewCount === 1 ? 'transação' : 'transações'}</span>
        </div>
        <div class="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Alta confiança</span>
          <span data-testid="pdf-summary-high" class="font-semibold text-slate-100 block mt-1 tabular-nums">${highConfidenceCount} ${highConfidenceCount === 1 ? 'transação' : 'transações'}</span>
        </div>
      </div>

      <ul data-testid="pdf-reconcile-list" class="mt-4 space-y-3">
        ${extractedRowsHtml}
      </ul>

      <div
        class="mt-4 border-t border-slate-800 pt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);"
      >
        <div class="space-y-0.5">
          <p data-testid="pdf-selected-count" class="text-xs font-semibold text-slate-200 tabular-nums">${selectedCount} selecionada(s) para importação</p>
          <p class="text-xs text-slate-400">As transações serão importadas com is_automated=true e vinculadas ao usuário autenticado.</p>
        </div>
        <button
          type="button"
          id="pdf-batch-confirm-btn"
          data-testid="pdf-batch-confirm-btn"
          class="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shrink-0"
          style="min-height: 48px; min-width: 48px;"
          ${selectedCount === 0 ? 'disabled' : ''}
        >
          Confirmar importação em lote
        </button>
      </div>
    </div>

    <!-- Status das Automações em Background -->
    <div data-testid="inbox-automations-card" class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <h3 class="text-sm font-bold text-slate-100 mb-3">Automações Cloud-Native Ativas</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div class="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
          <span class="text-slate-400 block">Extrator de Faturas PDF</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Ativo</span>
        </div>
        <div class="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
          <span class="text-slate-400 block">Notion Sync Worker</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Operacional</span>
        </div>
        <div class="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
          <span class="text-slate-400 block">CodeQL SAST</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Ativo</span>
        </div>
      </div>
    </div>
  </div>`;
}

module.exports = {
  renderInboxViewMarkup
};
