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
 * Renderiza a visualização dedicada da Área Experimental (Inbox / Produtividade IA - E06.T02).
 */
function renderInboxViewMarkup() {
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
    if (alert.severity === 'warning') badgeColor = 'bg-amber-950/70 text-amber-300 border-amber-800/60';
    else if (alert.severity === 'success') badgeColor = 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
    else if (alert.severity === 'info') badgeColor = 'bg-sky-950/70 text-sky-300 border-sky-800/60';

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

  const extractedPreview = [
    {
      id: 'tx-preview-1',
      date: '07/11/2026',
      description: 'SUPERMERCADO CENTRAL',
      amount: '- R$ 248,90',
      status: 'Alta confiança',
      statusClass: 'text-emerald-300 border-emerald-800/70 bg-emerald-950/40',
      categoryName: 'Alimentação'
    },
    {
      id: 'tx-preview-2',
      date: '08/11/2026',
      description: 'UBER *TRIP 3321',
      amount: '- R$ 32,50',
      status: 'Revisar',
      statusClass: 'text-amber-300 border-amber-800/70 bg-amber-950/40',
      categoryName: 'Transporte'
    },
    {
      id: 'tx-preview-3',
      date: '10/11/2026',
      description: 'CREDITO SALARIO EMPRESA',
      amount: '+ R$ 8.500,00',
      status: 'Alta confiança',
      statusClass: 'text-emerald-300 border-emerald-800/70 bg-emerald-950/40',
      categoryName: 'Salário'
    }
  ];

  const extractedPreviewHtml = extractedPreview.map(tx => `
    <li data-testid="pdf-reconcile-row-${tx.id}" class="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="text-xs text-slate-400">${escapeHtml(tx.date)}</p>
          <p class="text-sm font-semibold text-slate-100">${escapeHtml(tx.description)}</p>
          <p class="text-sm font-semibold ${tx.amount.startsWith('+') ? 'text-emerald-300' : 'text-rose-300'}">${escapeHtml(tx.amount)}</p>
        </div>
        <span class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${tx.statusClass}">
          ${escapeHtml(tx.status)}
        </span>
      </div>
      <div class="mt-3 space-y-2">
        <label class="text-xs text-slate-400" for="pdf-category-${tx.id}">Categoria sugerida</label>
        <select
          id="pdf-category-${tx.id}"
          data-testid="pdf-category-select-${tx.id}"
          class="touch-target w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
          style="min-height: 44px; min-width: 44px;"
        >
          <option>${escapeHtml(tx.categoryName)}</option>
          <option>Transferência</option>
          <option>Assinaturas</option>
          <option>Outros</option>
        </select>
      </div>
    </li>
  `).join('');

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

    <!-- Upload Mobile-First de PDF e Conciliação -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <h3 class="text-sm font-bold text-slate-100">Upload, Conciliação e Confirmação em Lote de PDF</h3>
      <p class="mt-1 text-xs text-slate-400">Fluxo mobile-first para enviar extratos/faturas, revisar categorias e confirmar importação em lote.</p>

      <form id="pdf-upload-form" data-testid="pdf-upload-form" class="mt-4 space-y-3">
        <label for="pdf-file-input" class="text-xs font-semibold text-slate-300 block">Arquivo PDF do extrato ou fatura</label>
        <input
          id="pdf-file-input"
          data-testid="pdf-file-input"
          type="file"
          accept="application/pdf"
          class="touch-target w-full rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
          style="min-height: 44px; min-width: 44px;"
        />
        <button
          type="submit"
          data-testid="pdf-parse-btn"
          class="touch-target w-full inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          style="min-height: 44px; min-width: 44px;"
        >
          Extrair transações do PDF
        </button>
      </form>

      <div data-testid="pdf-reconcile-summary" class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div class="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
          <span class="text-slate-400 block">Extraídas</span>
          <span class="font-semibold text-slate-100 block mt-1">3 transações</span>
        </div>
        <div class="rounded-lg border border-amber-800/60 bg-amber-950/20 px-3 py-2">
          <span class="text-amber-300 block">Revisar</span>
          <span class="font-semibold text-amber-200 block mt-1">1 transação</span>
        </div>
        <div class="rounded-lg border border-emerald-800/60 bg-emerald-950/20 px-3 py-2">
          <span class="text-emerald-300 block">Alta confiança</span>
          <span class="font-semibold text-emerald-200 block mt-1">2 transações</span>
        </div>
      </div>

      <ul data-testid="pdf-reconcile-list" class="mt-4 space-y-3">
        ${extractedPreviewHtml}
      </ul>

      <div
        class="mt-4 border-t border-slate-800 pt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between"
        style="padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px);"
      >
        <p class="text-xs text-slate-400">As transações serão importadas com is_automated=true e vinculadas ao usuário autenticado.</p>
        <button
          type="button"
          data-testid="pdf-batch-confirm-btn"
          class="touch-target inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          style="min-height: 48px; min-width: 48px;"
        >
          Confirmar importação em lote
        </button>
      </div>
    </div>
  </div>`;
}

module.exports = {
  renderInboxViewMarkup
};
