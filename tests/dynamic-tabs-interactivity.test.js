const { renderAppPage } = require('../src/frontend/pages/renderAppPage');
const { renderCashflowViewMarkup } = require('../src/frontend/components/CashflowView');
const { renderPortfolioViewMarkup } = require('../src/frontend/components/PortfolioView');
const { renderSettingsViewMarkup } = require('../src/frontend/components/SettingsView');
const { renderInboxViewMarkup } = require('../src/frontend/components/InboxView');

describe('E06.T02 — Ativação Funcional de Todos os Botões, Header, Sidebar e Abas Dinâmicas', () => {
  const mockCategories = [
    { id: 'cat-sal', name: 'Salário', type: 'INCOME' },
    { id: 'cat-mor', name: 'Moradia', type: 'EXPENSE' },
    { id: 'cat-ali', name: 'Alimentação', type: 'EXPENSE' }
  ];

  const mockTransactions = [
    {
      id: 'tx-101',
      amount: 12000,
      date: '2026-10-01',
      description: 'Salário Tech Lead',
      category: { name: 'Salário', type: 'INCOME' }
    },
    {
      id: 'tx-102',
      amount: 3200,
      date: '2026-10-05',
      description: 'Aluguel do Apartamento',
      category: { name: 'Moradia', type: 'EXPENSE' }
    }
  ];

  const mockPortfolio = {
    total_portfolio_value: 75000,
    positions: [
      { ticker: 'PETR4', asset_type: 'STOCK', quantity: 200, current_price: 38.5, current_value: 7700 },
      { ticker: 'BTC', asset_type: 'CRYPTO', quantity: 0.05, current_price: 360000, current_value: 18000 },
      { ticker: 'Tesouro Selic', asset_type: 'FIXED_INCOME', quantity: 1, current_price: 49300, current_value: 49300 }
    ],
    allocation_by_type: {
      STOCK: { total_value: 7700, percentage: 10.3 },
      CRYPTO: { total_value: 18000, percentage: 24.0 },
      FIXED_INCOME: { total_value: 49300, percentage: 65.7 }
    }
  };

  test('1. renderAppPage() renderiza os 5 containers de abas (tab-pane) com visibilidade dinâmica e container de toasts', () => {
    const defaultHtml = renderAppPage();

    // Presença de todos os containers de abas dinâmicas
    expect(defaultHtml).toContain('data-testid="tab-pane-overview"');
    expect(defaultHtml).toContain('data-testid="tab-pane-cashflow"');
    expect(defaultHtml).toContain('data-testid="tab-pane-portfolio"');
    expect(defaultHtml).toContain('data-testid="tab-pane-settings"');
    expect(defaultHtml).toContain('data-testid="tab-pane-inbox"');

    // Aba padrão: overview visível (block), demais ocultas (hidden)
    expect(defaultHtml).toContain('id="tab-pane-overview" data-testid="tab-pane-overview" class="tab-pane block"');
    expect(defaultHtml).toContain('id="tab-pane-cashflow" data-testid="tab-pane-cashflow" class="tab-pane hidden"');
    expect(defaultHtml).toContain('id="tab-pane-portfolio" data-testid="tab-pane-portfolio" class="tab-pane hidden"');

    // Container de notificações / toasts com acessibilidade
    expect(defaultHtml).toContain('id="pc-toast-container" aria-live="polite"');

    // Inicialização direta em outra aba
    const portfolioHtml = renderAppPage({ activeTab: 'portfolio' });
    expect(portfolioHtml).toContain('id="tab-pane-portfolio" data-testid="tab-pane-portfolio" class="tab-pane block"');
    expect(portfolioHtml).toContain('id="tab-pane-overview" data-testid="tab-pane-overview" class="tab-pane hidden"');
  });

  test('2. CashflowView: renderiza resumo financeiro, filtros por tipo, busca e lista responsiva com exclusão', () => {
    const markup = renderCashflowViewMarkup({
      transactions: mockTransactions,
      categories: mockCategories
    });

    expect(markup).toContain('data-testid="cashflow-view"');
    // Resumo dos Totais (12000 - 3200 = 8800)
    expect(markup).toContain('data-testid="cashflow-income-total"');
    expect(markup).toContain('+ R$ 12.000,00');
    expect(markup).toContain('data-testid="cashflow-expense-total"');
    expect(markup).toContain('- R$ 3.200,00');
    expect(markup).toContain('data-testid="cashflow-net-total"');
    expect(markup).toContain('R$ 8.800,00');

    // Botões de Filtros
    expect(markup).toContain('data-testid="filter-all-btn"');
    expect(markup).toContain('data-testid="filter-income-btn"');
    expect(markup).toContain('data-testid="filter-expense-btn"');

    // Busca e Adição
    expect(markup).toContain('data-testid="cashflow-search-input"');
    expect(markup).toContain('data-testid="cashflow-add-btn"');

    // Tabela Desktop e Cards Mobile
    expect(markup).toContain('data-testid="cashflow-desktop-table"');
    expect(markup).toContain('data-testid="cashflow-mobile-list"');
    expect(markup).toContain('data-testid="cashflow-row-tx-101"');
    expect(markup).toContain('data-testid="cashflow-row-tx-102"');
    expect(markup).toContain('Salário Tech Lead');
    expect(markup).toContain('Aluguel do Apartamento');
  });

  test('3. PortfolioView: renderiza patrimônio investido, botão de sincronizar cotações e tabela de posições com tickers', () => {
    const markup = renderPortfolioViewMarkup({
      portfolio: mockPortfolio
    });

    expect(markup).toContain('data-testid="portfolio-view"');
    expect(markup).toContain('data-testid="portfolio-total-card"');
    expect(markup).toContain('R$ 75.000,00');
    expect(markup).toContain('data-testid="portfolio-return-card"');
    expect(markup).toContain('data-testid="portfolio-quotes-status"');
    expect(markup).toContain('data-testid="portfolio-sync-quotes-btn"');

    // Posições com Tickers
    expect(markup).toContain('data-testid="portfolio-positions-table"');
    expect(markup).toContain('data-testid="portfolio-pos-row-PETR4"');
    expect(markup).toContain('data-testid="portfolio-pos-row-BTC"');
    expect(markup).toContain('Ações B3');
    expect(markup).toContain('Criptoativos');
    expect(markup).toContain('Renda Fixa');
  });

  test('4. SettingsView: renderiza perfil do usuário, alternância de tema, lista de categorias e botão de logout', () => {
    const markup = renderSettingsViewMarkup({
      user: { email: 'novaes@personalcontroller.app', isDemo: false },
      theme: 'dark',
      categories: mockCategories
    });

    expect(markup).toContain('data-testid="settings-view"');
    expect(markup).toContain('data-testid="settings-profile-card"');
    expect(markup).toContain('novaes@personalcontroller.app');

    // Seletores de Tema
    expect(markup).toContain('data-testid="settings-theme-card"');
    expect(markup).toContain('data-testid="settings-theme-dark-btn"');
    expect(markup).toContain('data-testid="settings-theme-light-btn"');

    // Categorias
    expect(markup).toContain('data-testid="settings-categories-card"');
    expect(markup).toContain('data-testid="settings-category-cat-sal"');
    expect(markup).toContain('data-testid="settings-category-cat-mor"');

    // Segurança e Logout
    expect(markup).toContain('data-testid="settings-security-card"');
    expect(markup).toContain('Row Level Security (RLS)');
    expect(markup).toContain('data-testid="settings-logout-btn"');
  });

  test('5. InboxView: renderiza área experimental com alertas de burn rate, worker de cotações e status das automações', () => {
    const markup = renderInboxViewMarkup();

    expect(markup).toContain('data-testid="inbox-view"');
    expect(markup).toContain('Experimental');
    expect(markup).toContain('data-testid="inbox-alert-burn-rate"');
    expect(markup).toContain('data-testid="inbox-alert-quotes-sync"');
    expect(markup).toContain('data-testid="inbox-alert-notion-sync"');
    expect(markup).toContain('Notion Sync Worker');
    expect(markup).toContain('CodeQL SAST');
  });

  test('6. Runtime interativo do cliente possui manipuladores para botões de header, sidebar, refresh com spin e troca de abas', () => {
    const html = renderAppPage();

    // Verificação de conexões no client runtime script
    expect(html).toContain('triggerRefreshAction');
    expect(html).toContain('quick-refresh-btn');
    expect(html).toContain('sidebar-refresh-btn');
    expect(html).toContain('portfolio-sync-quotes-btn');
    expect(html).toContain('animate-spin');
    expect(html).toContain('switchTab');
    expect(html).toContain('TAB_META');
    expect(html).toContain('applyCashflowFilters');
    expect(html).toContain('showToast');
    expect(html).toContain('handleLogout');
    expect(html).toContain('localStorage.setItem(\'pc_theme\'');
  });
});
