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

    <!-- Status das Automações em Background -->
    <div class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <h3 class="text-sm font-bold text-slate-100 mb-3">Automações Cloud-Native Ativas</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div class="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
          <span class="text-slate-400 block">Extrator de Faturas PDF</span>
          <span class="font-semibold text-slate-200 block mt-1">Épico 07 (Em breve)</span>
        </div>
        <div class="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
          <span class="text-slate-400 block">Notion Sync Worker</span>
          <span class="font-semibold text-emerald-400 block mt-1">Operacional</span>
        </div>
        <div class="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
          <span class="text-slate-400 block">CodeQL SAST</span>
          <span class="font-semibold text-emerald-400 block mt-1">Ativo</span>
        </div>
      </div>
    </div>
  </div>`;
}

module.exports = {
  renderInboxViewMarkup
};
