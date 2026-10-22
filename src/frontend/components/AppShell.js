const { COMPONENT_TOKENS, MOBILE_FIRST_BREAKPOINTS } = require('../styles/designSystem');

/**
 * Definição oficial das seções de navegação conforme `docs/architecture-spec.md`
 * Zero emojis estruturais — apenas ícones vetoriais SVG inline com `aria-hidden="true"`.
 */
const PRIMARY_NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Visão Geral',
    shortLabel: 'Início',
    description: 'Dashboard principal de liquidez, burn rate e alocação',
    section: 'primary',
    iconSvg:
      '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>'
  },
  {
    id: 'cashflow',
    label: 'Fluxo de Caixa',
    shortLabel: 'Transações',
    description: 'Lançamentos, orçamentos e despesas recorrentes',
    section: 'primary',
    iconSvg:
      '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
  },
  {
    id: 'portfolio',
    label: 'Carteira',
    shortLabel: 'Carteira',
    description: 'Posição consolidada, rentabilidade e distribuição de ativos',
    section: 'primary',
    iconSvg:
      '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>'
  },
  {
    id: 'settings',
    label: 'Configurações',
    shortLabel: 'Ajustes',
    description: 'Categorias, preferências de conta e aparência',
    section: 'primary',
    iconSvg:
      '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
  }
];

const EXPERIMENTAL_NAV_ITEMS = [
  {
    id: 'inbox',
    label: 'Inbox / Produtividade',
    shortLabel: 'Inbox IA',
    description: 'E-mails lidos, alertas gerados por IA e triagem pendente',
    section: 'experimental',
    badge: 'Experimental',
    iconSvg:
      '<svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>'
  }
];

const ALL_NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...EXPERIMENTAL_NAV_ITEMS];

const PLUS_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

const REFRESH_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';

const THEME_ICON_SVG =
  '<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

const BRAND_LOGO_SVG =
  '<svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';

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
 * Renderiza o HTML SSR/isomórfico do App Shell Responsivo Mobile-First (E05.T02).
 *
 * - Mobile (< 768px):
 *   - Top Header compacto com logo, indicador de conta e botões de atualização/tema (>= 44x44px).
 *   - Bottom Navigation Bar fixa (`h-16`) na zona do polegar com 4 abas principais +
 *     botão central de ação rápida (`+ Nova Transação`, >= 48x48px).
 *   - Container principal com `pb-24 pb-safe-bottom` para evitar conteúdo oculto atrás da barra.
 * - Tablet & Desktop (>= 768px):
 *   - Oculta a Bottom Bar (`md:hidden`) e exibe a Sidebar Lateral fixa (`hidden md:flex md:w-64`)
 *     com as 4 seções principais + divisor visual da Área Experimental (`Inbox / Produtividade`).
 */
function renderAppShellMarkup({
  activeTab = 'overview',
  theme = 'dark',
  user = null,
  isRefreshing = false,
  contentHtml = ''
} = {}) {
  const validTab = ALL_NAV_ITEMS.some(item => item.id === activeTab) ? activeTab : 'overview';
  const currentNav = ALL_NAV_ITEMS.find(item => item.id === validTab) || PRIMARY_NAV_ITEMS[0];
  const accountLabel = user?.email
    ? escapeHtml(user.email)
    : user?.isDemo
      ? 'Modo Demonstração'
      : 'Conta Conectada';

  const sidebarPrimaryHtml = PRIMARY_NAV_ITEMS.map(item => {
    const isActive = item.id === validTab;
    return `<button
      type="button"
      data-testid="sidebar-tab-${item.id}"
      data-nav-tab="${item.id}"
      aria-current="${isActive ? 'page' : 'false'}"
      class="touch-target w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }"
      style="min-height: 44px; min-width: 44px;"
    >
      ${item.iconSvg}
      <span>${escapeHtml(item.label)}</span>
    </button>`;
  }).join('');

  const sidebarExperimentalHtml = EXPERIMENTAL_NAV_ITEMS.map(item => {
    const isActive = item.id === validTab;
    return `<button
      type="button"
      data-testid="sidebar-tab-${item.id}"
      data-nav-tab="${item.id}"
      aria-current="${isActive ? 'page' : 'false'}"
      class="touch-target w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }"
      style="min-height: 44px; min-width: 44px;"
    >
      <span class="flex items-center gap-3">
        ${item.iconSvg}
        <span>${escapeHtml(item.label)}</span>
      </span>
      <span class="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">${escapeHtml(item.badge)}</span>
    </button>`;
  }).join('');

  const leftBottomTabs = PRIMARY_NAV_ITEMS.slice(0, 2);
  const rightBottomTabs = PRIMARY_NAV_ITEMS.slice(2, 4);

  const renderBottomTab = item => {
    const isActive = item.id === validTab;
    return `<button
      type="button"
      data-testid="bottom-nav-tab-${item.id}"
      data-nav-tab="${item.id}"
      aria-current="${isActive ? 'page' : 'false'}"
      aria-label="${escapeHtml(item.label)}"
      class="touch-target flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-xs font-medium transition-colors ${
        isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-100'
      }"
      style="min-height: 44px; min-width: 44px;"
    >
      ${item.iconSvg}
      <span>${escapeHtml(item.shortLabel)}</span>
    </button>`;
  };

  return `<div
    data-testid="app-shell"
    data-theme="${escapeHtml(theme)}"
    data-active-tab="${escapeHtml(validTab)}"
    class="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-50"
    style="background-color: var(--bg-canvas); color: var(--text-primary); font-family: var(--font-sans);"
  >
    <!-- Top Header Enxuto (Mobile-First < 768px) -->
    <header
      data-testid="mobile-top-header"
      class="flex md:hidden items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-30"
      style="background-color: var(--bg-surface); border-color: var(--border-subtle);"
    >
      <div class="flex items-center gap-2.5">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white">
          ${BRAND_LOGO_SVG}
        </span>
        <div>
          <span class="text-sm font-bold tracking-tight block">PersonalController</span>
          <span data-testid="account-indicator" class="text-xs text-slate-300 block">${accountLabel}</span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="quick-refresh-btn"
          aria-label="Atualizar dados"
          aria-busy="${isRefreshing ? 'true' : 'false'}"
          class="touch-target inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          style="min-height: 44px; min-width: 44px;"
        >
          ${REFRESH_ICON_SVG}
        </button>
        <button
          type="button"
          data-testid="theme-toggle-btn"
          aria-label="Alternar tema claro ou escuro"
          class="touch-target inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          style="min-height: 44px; min-width: 44px;"
        >
          ${THEME_ICON_SVG}
        </button>
      </div>
    </header>

    <!-- Sidebar Lateral Fixa (Tablet & Desktop >= 768px) -->
    <aside
      data-testid="desktop-sidebar"
      aria-label="Navegação lateral principal"
      class="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-800 bg-slate-900 z-30"
      style="width: var(--sidebar-width, ${COMPONENT_TOKENS.navigation.sidebarWidthPx}px); background-color: var(--bg-surface); border-color: var(--border-subtle);"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white">
            ${BRAND_LOGO_SVG}
          </span>
          <div>
            <span class="text-base font-bold tracking-tight block">PersonalController</span>
            <span data-testid="sidebar-account-indicator" class="text-xs text-slate-300 block">${accountLabel}</span>
          </div>
        </div>
      </div>

      <div class="px-4 pt-4 pb-2">
        <button
          type="button"
          data-testid="sidebar-new-transaction-btn"
          aria-label="Nova Transação"
          class="touch-target w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm transition-colors"
          style="min-height: 48px; min-width: 48px;"
        >
          ${PLUS_ICON_SVG}
          <span>+ Nova Transação</span>
        </button>
      </div>

      <nav aria-label="Menu principal desktop" class="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        ${sidebarPrimaryHtml}

        <div
          data-testid="experimental-divider"
          role="separator"
          aria-label="Área Experimental"
          class="pt-4 pb-2 px-3"
        >
          <div class="border-t border-slate-800 pt-3 flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Área Experimental</span>
          </div>
        </div>

        ${sidebarExperimentalHtml}
      </nav>

      <div class="p-4 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="sidebar-refresh-btn"
          aria-label="Atualizar dados"
          class="touch-target flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700"
          style="min-height: 44px; min-width: 44px;"
        >
          ${REFRESH_ICON_SVG}
          <span>Atualizar</span>
        </button>
        <button
          type="button"
          data-testid="sidebar-theme-toggle-btn"
          aria-label="Alternar tema"
          class="touch-target inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
          style="min-height: 44px; min-width: 44px;"
        >
          ${THEME_ICON_SVG}
        </button>
      </div>
    </aside>

    <!-- Área Principal de Conteúdo com Padding Inferior Seguro no Mobile (pb-24 / pb-safe-bottom) -->
    <main
      id="main-content"
      data-testid="app-shell-main"
      tabindex="-1"
      class="flex-1 w-full md:pl-64 pb-24 pb-safe-bottom md:pb-8"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        <div class="mb-4 md:mb-6 flex items-center justify-between">
          <div>
            <h1 data-testid="active-view-title" class="text-xl md:text-2xl font-bold tracking-tight">${escapeHtml(currentNav.label)}</h1>
            <p data-testid="active-view-description" class="text-xs md:text-sm text-slate-300">${escapeHtml(currentNav.description)}</p>
          </div>
        </div>
        <div data-testid="app-shell-slot">${contentHtml}</div>
      </div>
    </main>

    <!-- Bottom Navigation Bar Fixa (Mobile < 768px — Ergonomia Thumb Zone) -->
    <nav
      data-testid="mobile-bottom-nav"
      aria-label="Navegação principal mobile"
      class="fixed bottom-0 inset-x-0 z-40 h-16 md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur flex items-center justify-around px-2"
      style="height: var(--bottom-nav-height, ${COMPONENT_TOKENS.navigation.bottomNavHeightPx}px); padding-bottom: var(--safe-area-bottom, 0px); background-color: var(--bg-surface); border-color: var(--border-subtle);"
    >
      ${leftBottomTabs.map(renderBottomTab).join('')}

      <div class="flex items-center justify-center px-1">
        <button
          type="button"
          data-testid="quick-new-transaction-btn"
          aria-label="Nova Transação"
          class="inline-flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          style="min-height: 48px; min-width: 48px; width: 48px; height: 48px;"
        >
          ${PLUS_ICON_SVG}
        </button>
      </div>

      ${rightBottomTabs.map(renderBottomTab).join('')}
    </nav>
  </div>`;
}

/**
 * Renderiza elemento React isomórfico sem necessidade de build step JSX.
 */
function createAppShellElement(React, props = {}) {
  if (!React || typeof React.createElement !== 'function') {
    throw new Error('Instância do React com createElement é obrigatória.');
  }

  const {
    activeTab = 'overview',
    theme = 'dark',
    user = null,
    isRefreshing = false,
    onSelectTab,
    onQuickAction,
    onRefresh,
    onToggleTheme,
    children
  } = props;

  const validTab = ALL_NAV_ITEMS.some(item => item.id === activeTab) ? activeTab : 'overview';
  const currentNav = ALL_NAV_ITEMS.find(item => item.id === validTab) || PRIMARY_NAV_ITEMS[0];

  return React.createElement(
    'div',
    {
      'data-testid': 'app-shell',
      'data-theme': theme,
      'data-active-tab': validTab,
      className: 'min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-50'
    },
    React.createElement(
      'header',
      {
        'data-testid': 'mobile-top-header',
        className: 'flex md:hidden items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900'
      },
      React.createElement('span', { className: 'font-bold text-sm' }, 'PersonalController'),
      React.createElement(
        'span',
        { 'data-testid': 'account-indicator', className: 'text-xs text-slate-300' },
        user?.email || (user?.isDemo ? 'Modo Demonstração' : 'Conta Conectada')
      ),
      React.createElement(
        'div',
        { className: 'flex items-center gap-2' },
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'quick-refresh-btn',
            'aria-label': 'Atualizar dados',
            'aria-busy': isRefreshing ? 'true' : 'false',
            style: { minHeight: '44px', minWidth: '44px' },
            onClick: () => typeof onRefresh === 'function' && onRefresh()
          },
          'Atualizar'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            'data-testid': 'theme-toggle-btn',
            'aria-label': 'Alternar tema claro ou escuro',
            style: { minHeight: '44px', minWidth: '44px' },
            onClick: () => typeof onToggleTheme === 'function' && onToggleTheme()
          },
          'Tema'
        )
      )
    ),
    React.createElement(
      'aside',
      {
        'data-testid': 'desktop-sidebar',
        'aria-label': 'Navegação lateral principal',
        className: 'hidden md:flex md:w-64 md:flex-col'
      },
      ...PRIMARY_NAV_ITEMS.map(item =>
        React.createElement(
          'button',
          {
            key: item.id,
            type: 'button',
            'data-testid': `sidebar-tab-${item.id}`,
            'aria-current': item.id === validTab ? 'page' : 'false',
            style: { minHeight: '44px', minWidth: '44px' },
            onClick: () => typeof onSelectTab === 'function' && onSelectTab(item.id)
          },
          item.label
        )
      ),
      React.createElement(
        'div',
        { 'data-testid': 'experimental-divider', role: 'separator' },
        'Área Experimental'
      ),
      ...EXPERIMENTAL_NAV_ITEMS.map(item =>
        React.createElement(
          'button',
          {
            key: item.id,
            type: 'button',
            'data-testid': `sidebar-tab-${item.id}`,
            'aria-current': item.id === validTab ? 'page' : 'false',
            style: { minHeight: '44px', minWidth: '44px' },
            onClick: () => typeof onSelectTab === 'function' && onSelectTab(item.id)
          },
          item.label
        )
      )
    ),
    React.createElement(
      'main',
      {
        id: 'main-content',
        'data-testid': 'app-shell-main',
        className: 'flex-1 w-full md:pl-64 pb-24 pb-safe-bottom md:pb-8'
      },
      React.createElement('h1', { 'data-testid': 'active-view-title' }, currentNav.label),
      React.createElement('div', { 'data-testid': 'app-shell-slot' }, children || null)
    ),
    React.createElement(
      'nav',
      {
        'data-testid': 'mobile-bottom-nav',
        'aria-label': 'Navegação principal mobile',
        className: 'fixed bottom-0 inset-x-0 z-40 h-16 md:hidden flex items-center justify-around'
      },
      ...PRIMARY_NAV_ITEMS.slice(0, 2).map(item =>
        React.createElement(
          'button',
          {
            key: item.id,
            type: 'button',
            'data-testid': `bottom-nav-tab-${item.id}`,
            'aria-current': item.id === validTab ? 'page' : 'false',
            style: { minHeight: '44px', minWidth: '44px' },
            onClick: () => typeof onSelectTab === 'function' && onSelectTab(item.id)
          },
          item.shortLabel
        )
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          'data-testid': 'quick-new-transaction-btn',
          'aria-label': 'Nova Transação',
          style: { minHeight: '48px', minWidth: '48px' },
          onClick: () => typeof onQuickAction === 'function' && onQuickAction()
        },
        '+ Nova Transação'
      ),
      ...PRIMARY_NAV_ITEMS.slice(2, 4).map(item =>
        React.createElement(
          'button',
          {
            key: item.id,
            type: 'button',
            'data-testid': `bottom-nav-tab-${item.id}`,
            'aria-current': item.id === validTab ? 'page' : 'false',
            style: { minHeight: '44px', minWidth: '44px' },
            onClick: () => typeof onSelectTab === 'function' && onSelectTab(item.id)
          },
          item.shortLabel
        )
      )
    )
  );
}

/**
 * Controlador de estado e navegação por teclado do App Shell (E05.T02).
 */
function createAppShellController({
  initialTab = 'overview',
  initialTheme = 'dark',
  user = null,
  onTabChange,
  onQuickAction,
  onRefresh,
  onThemeChange
} = {}) {
  let state = {
    activeTab: ALL_NAV_ITEMS.some(item => item.id === initialTab) ? initialTab : 'overview',
    theme: initialTheme === 'light' ? 'light' : 'dark',
    user,
    isQuickActionOpen: false,
    isRefreshing: false
  };

  function getState() {
    return { ...state };
  }

  function selectTab(tabId) {
    const exists = ALL_NAV_ITEMS.some(item => item.id === tabId);
    if (!exists) {
      return state.activeTab;
    }
    state = {
      ...state,
      activeTab: tabId
    };
    if (typeof onTabChange === 'function') {
      onTabChange(tabId, getState());
    }
    return state.activeTab;
  }

  /**
   * Suporte a navegação por teclado (`Enter`, ` `, `ArrowRight`, `ArrowDown`, `ArrowLeft`, `ArrowUp`)
   * entre todas as abas de navegação.
   */
  function handleKeyDown(event = {}, targetTabId) {
    const key = event.key;
    const ids = ALL_NAV_ITEMS.map(item => item.id);
    const currentIndex = ids.indexOf(targetTabId || state.activeTab);

    if (key === 'Enter' || key === ' ') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (targetTabId) {
        return selectTab(targetTabId);
      }
      return state.activeTab;
    }

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      const nextIndex = (currentIndex + 1) % ids.length;
      return selectTab(ids[nextIndex]);
    }

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      const prevIndex = (currentIndex - 1 + ids.length) % ids.length;
      return selectTab(ids[prevIndex]);
    }

    return state.activeTab;
  }

  function triggerQuickAction() {
    state = {
      ...state,
      isQuickActionOpen: true
    };
    if (typeof onQuickAction === 'function') {
      onQuickAction(getState());
    }
    return getState();
  }

  function closeQuickAction() {
    state = {
      ...state,
      isQuickActionOpen: false
    };
    return getState();
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    state = {
      ...state,
      theme: nextTheme
    };
    if (typeof onThemeChange === 'function') {
      onThemeChange(nextTheme, getState());
    }
    return nextTheme;
  }

  async function triggerRefresh() {
    state = {
      ...state,
      isRefreshing: true
    };
    try {
      if (typeof onRefresh === 'function') {
        await onRefresh(getState());
      }
    } finally {
      state = {
        ...state,
        isRefreshing: false
      };
    }
    return getState();
  }

  function getMarkup(contentHtml = '') {
    return renderAppShellMarkup({
      activeTab: state.activeTab,
      theme: state.theme,
      user: state.user,
      isRefreshing: state.isRefreshing,
      contentHtml
    });
  }

  return {
    getState,
    selectTab,
    handleKeyDown,
    triggerQuickAction,
    closeQuickAction,
    toggleTheme,
    triggerRefresh,
    getMarkup,
    breakpoints: MOBILE_FIRST_BREAKPOINTS
  };
}

module.exports = {
  PRIMARY_NAV_ITEMS,
  EXPERIMENTAL_NAV_ITEMS,
  ALL_NAV_ITEMS,
  renderAppShellMarkup,
  createAppShellElement,
  createAppShellController
};
