const {
  PRIMARY_NAV_ITEMS,
  EXPERIMENTAL_NAV_ITEMS,
  ALL_NAV_ITEMS,
  renderAppShellMarkup,
  createAppShellElement,
  createAppShellController
} = require('../src/frontend/components/AppShell');

describe('E05.T02 — App Shell Responsivo: Bottom Nav (Mobile) e Sidebar (Desktop)', () => {
  test('1. Define as 4 seções principais e a seção experimental com ícones SVG inline acessíveis (aria-hidden="true")', () => {
    expect(PRIMARY_NAV_ITEMS).toHaveLength(4);
    expect(PRIMARY_NAV_ITEMS.map(item => item.id)).toEqual([
      'overview',
      'cashflow',
      'portfolio',
      'settings'
    ]);
    expect(EXPERIMENTAL_NAV_ITEMS).toHaveLength(1);
    expect(EXPERIMENTAL_NAV_ITEMS[0].id).toBe('inbox');

    for (const item of ALL_NAV_ITEMS) {
      expect(item.iconSvg).toContain('<svg');
      expect(item.iconSvg).toContain('aria-hidden="true"');
    }
  });

  test('2. Renderiza estrutura Mobile-First (flex-col -> md:flex-row), Bottom Nav fixa com botão + Nova Transação (>= 48px) e padding inferior seguro (pb-24 pb-safe-bottom)', () => {
    const html = renderAppShellMarkup({
      activeTab: 'overview',
      theme: 'dark',
      user: { email: 'joao@personalcontroller.app' },
      contentHtml: '<section id="dashboard-view">Conteúdo Principal</section>'
    });

    // Estrutura Mobile-First (flex-col no mobile, md:flex-row no desktop)
    expect(html).toContain('data-testid="app-shell"');
    expect(html).toContain('flex flex-col md:flex-row');

    // Top Header enxuto no mobile
    expect(html).toContain('data-testid="mobile-top-header"');
    expect(html).toContain('joao@personalcontroller.app');

    // Bottom Navigation Bar fixa no mobile (h-16 md:hidden)
    expect(html).toContain('data-testid="mobile-bottom-nav"');
    expect(html).toContain('fixed bottom-0 inset-x-0 z-40 h-16 md:hidden');

    // Botão central de ação rápida (+ Nova Transação) com touch target >= 48px
    expect(html).toContain('data-testid="quick-new-transaction-btn"');
    expect(html).toContain('min-height: 48px; min-width: 48px;');

    // Container principal com pb-24 e pb-safe-bottom para não esconder cards atrás da Bottom Bar
    expect(html).toContain('data-testid="app-shell-main"');
    expect(html).toContain('pb-24 pb-safe-bottom md:pb-8');
    expect(html).toContain('<section id="dashboard-view">Conteúdo Principal</section>');
  });

  test('3. Renderiza Sidebar Lateral para Tablet/Desktop (hidden md:flex md:w-64) com divisor visual da Área Experimental', () => {
    const html = renderAppShellMarkup({ activeTab: 'portfolio' });

    expect(html).toContain('data-testid="desktop-sidebar"');
    expect(html).toContain('hidden md:flex md:w-64 md:flex-col');
    expect(html).toContain('data-testid="experimental-divider"');
    expect(html).toContain('Área Experimental');
    expect(html).toContain('Inbox / Produtividade');

    // Verifica aria-current="page" apenas na aba ativa (portfolio)
    expect(html).toMatch(/data-testid="sidebar-tab-portfolio"[\s\S]*?aria-current="page"/);
    expect(html).toMatch(/data-testid="bottom-nav-tab-portfolio"[\s\S]*?aria-current="page"/);
    expect(html).toMatch(/data-testid="sidebar-tab-overview"[\s\S]*?aria-current="false"/);
  });

  test('4. Controlador gerencia troca de abas, navegação por teclado (Enter, Space, Setas), ação rápida e alternância de tema', async () => {
    const onTabChange = jest.fn();
    const onQuickAction = jest.fn();
    const onRefresh = jest.fn().mockResolvedValue(true);
    const onThemeChange = jest.fn();

    const controller = createAppShellController({
      initialTab: 'overview',
      initialTheme: 'dark',
      user: { isDemo: true },
      onTabChange,
      onQuickAction,
      onRefresh,
      onThemeChange
    });

    expect(controller.getState().activeTab).toBe('overview');

    // Troca de aba direta
    controller.selectTab('cashflow');
    expect(controller.getState().activeTab).toBe('cashflow');
    expect(onTabChange).toHaveBeenCalledWith('cashflow', expect.objectContaining({ activeTab: 'cashflow' }));

    // Navegação por teclado com Enter e ArrowRight / ArrowLeft
    const preventDefault = jest.fn();
    controller.handleKeyDown({ key: 'Enter', preventDefault }, 'portfolio');
    expect(preventDefault).toHaveBeenCalled();
    expect(controller.getState().activeTab).toBe('portfolio');

    controller.handleKeyDown({ key: 'ArrowRight', preventDefault });
    expect(controller.getState().activeTab).toBe('settings');

    controller.handleKeyDown({ key: 'ArrowRight', preventDefault });
    expect(controller.getState().activeTab).toBe('inbox');

    controller.handleKeyDown({ key: 'ArrowLeft', preventDefault });
    expect(controller.getState().activeTab).toBe('settings');

    // Ação rápida (+ Nova Transação)
    controller.triggerQuickAction();
    expect(controller.getState().isQuickActionOpen).toBe(true);
    expect(onQuickAction).toHaveBeenCalledTimes(1);
    controller.closeQuickAction();
    expect(controller.getState().isQuickActionOpen).toBe(false);

    // Alternância de tema (dark -> light)
    const nextTheme = controller.toggleTheme();
    expect(nextTheme).toBe('light');
    expect(onThemeChange).toHaveBeenCalledWith('light', expect.objectContaining({ theme: 'light' }));

    // Refresh assíncrono
    await controller.triggerRefresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(controller.getState().isRefreshing).toBe(false);

    const markup = controller.getMarkup('<p>Teste</p>');
    expect(markup).toContain('Modo Demonstração');
    expect(markup).toContain('data-theme="light"');
  });

  test('5. Cria árvore de elementos React isomórfica via createAppShellElement', () => {
    const mockReact = {
      createElement: (type, props, ...children) => ({ type, props, children })
    };
    const onSelectTab = jest.fn();
    const onQuickAction = jest.fn();

    const tree = createAppShellElement(mockReact, {
      activeTab: 'cashflow',
      theme: 'dark',
      onSelectTab,
      onQuickAction
    });

    expect(tree.type).toBe('div');
    expect(tree.props['data-testid']).toBe('app-shell');
    expect(tree.props['data-active-tab']).toBe('cashflow');
  });
});
