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
 * Renderiza a visualização dedicada de Configurações e Preferências (E06.T02).
 */
function renderSettingsViewMarkup({
  user = null,
  theme = 'dark',
  categories = []
} = {}) {
  const email = user?.email || (user?.isDemo ? 'demo@personalcontroller.app (Modo Demonstração)' : 'usuario@personalcontroller.app');

  const categoriesListHtml = categories.map(cat => {
    const isIncome = cat.type === 'INCOME';
    return `<li
      data-testid="settings-category-${escapeHtml(cat.id)}"
      class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-950/40 border border-slate-800/80"
    >
      <span class="text-sm font-medium text-slate-200">${escapeHtml(cat.name)}</span>
      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
        isIncome
          ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
          : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
      }">
        ${isIncome ? 'Receita' : 'Despesa'}
      </span>
    </li>`;
  }).join('');

  return `<div data-testid="settings-view" class="space-y-6 max-w-4xl mx-auto">
    <!-- Perfil da Conta -->
    <div data-testid="settings-profile-card" class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-100">Perfil & Conta</h2>
          <p class="text-xs text-slate-400 mt-0.5">Identificação da conta ativa e sessão atual</p>
        </div>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
          ${user?.isDemo ? 'Modo Demonstração' : 'Conectado'}
        </span>
      </div>
      <div class="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between text-sm">
          <span class="text-slate-400">E-mail:</span>
          <span data-testid="settings-user-email" class="font-medium text-slate-100">${escapeHtml(email)}</span>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between text-sm">
          <span class="text-slate-400">Provedor de Autenticação:</span>
          <span class="font-medium text-slate-100">Supabase Auth (JWT)</span>
        </div>
      </div>
    </div>

    <!-- Aparência & Tema -->
    <div data-testid="settings-theme-card" class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <h2 class="text-base font-bold text-slate-100">Aparência do Aplicativo</h2>
      <p class="text-xs text-slate-400 mt-0.5">Escolha o tema visual de sua preferência</p>
      <div class="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Seleção de tema">
        <button
          type="button"
          data-testid="settings-theme-dark-btn"
          data-theme-select="dark"
          class="touch-target p-4 rounded-xl border-2 ${
            theme === 'dark' ? 'border-indigo-500 bg-slate-800/80' : 'border-slate-800 bg-slate-950/50'
          } flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
          style="min-height: 48px;"
        >
          <span class="text-sm font-semibold text-slate-100">Tema Escuro (Dark)</span>
          <span class="text-xs text-slate-400">Alto contraste e redução de cansaço visual</span>
        </button>
        <button
          type="button"
          data-testid="settings-theme-light-btn"
          data-theme-select="light"
          class="touch-target p-4 rounded-xl border-2 ${
            theme === 'light' ? 'border-indigo-500 bg-slate-800/80' : 'border-slate-800 bg-slate-950/50'
          } flex flex-col items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
          style="min-height: 48px;"
        >
          <span class="text-sm font-semibold text-slate-100">Tema Claro (Light)</span>
          <span class="text-xs text-slate-400">Ideal para ambientes bem iluminados</span>
        </button>
      </div>
    </div>

    <!-- Categorias do Sistema -->
    <div data-testid="settings-categories-card" class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-slate-100">Categorias Cadastradas</h2>
          <p class="text-xs text-slate-400 mt-0.5">${categories.length} categorias disponíveis para classificação</p>
        </div>
      </div>
      <ul class="space-y-2 max-h-64 overflow-y-auto pr-1">
        ${categoriesListHtml || '<li class="text-xs text-slate-400">Nenhuma categoria encontrada.</li>'}
      </ul>
    </div>

    <!-- Segurança e Conformidade -->
    <div data-testid="settings-security-card" class="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 md:p-6 shadow-sm">
      <h2 class="text-base font-bold text-slate-100">Segurança & Governança</h2>
      <p class="text-xs text-slate-400 mt-0.5">Parâmetros de proteção de dados e isolamento</p>
      <div class="mt-4 space-y-2 text-sm">
        <div class="flex items-center justify-between py-2 border-b border-slate-800/80">
          <span class="text-slate-300">Row Level Security (RLS)</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            Ativo (PostgreSQL)
          </span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-slate-800/80">
          <span class="text-slate-300">Rate Limiting de Requisições</span>
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
            Habilitado (SEC-05)
          </span>
        </div>
        <div class="flex items-center justify-between py-2">
          <span class="text-slate-300">Infraestrutura Free-Tier</span>
          <span class="text-slate-400">$0/mês garantido</span>
        </div>
      </div>
    </div>

    <!-- Ações Destrutivas / Logout -->
    <div class="p-4 rounded-2xl border border-rose-900/50 bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h3 class="text-sm font-semibold text-rose-200">Encerrar Sessão</h3>
        <p class="text-xs text-slate-400 mt-0.5">Desconectar da conta e limpar credenciais locais deste dispositivo.</p>
      </div>
      <button
        type="button"
        id="settings-logout-btn"
        data-testid="settings-logout-btn"
        class="touch-target inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-sm"
        style="min-height: 44px;"
      >
        Sair da Conta
      </button>
    </div>
  </div>`;
}

module.exports = {
  renderSettingsViewMarkup
};
