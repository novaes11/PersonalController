const request = require('supertest');
const app = require('../server');
const {
  renderDashboardViewMarkup,
  createDashboardViewController
} = require('../src/frontend/components/DashboardView');
const { renderAppPage } = require('../src/frontend/pages/renderAppPage');

describe('E05.T04 — Integração da View Principal do Dashboard e Rota Visual (/dashboard)', () => {
  const mockCategories = [
    { id: 'cat-inc', name: 'Salário', type: 'INCOME' },
    { id: 'cat-exp', name: 'Alimentação', type: 'EXPENSE' }
  ];

  const mockTransactions = [
    {
      id: 'tx-1',
      amount: 10000,
      date: '2026-10-01',
      category_id: 'cat-inc',
      description: 'Salário Tech Lead',
      category: { name: 'Salário', type: 'INCOME' }
    },
    {
      id: 'tx-2',
      amount: 2500,
      date: '2026-10-05',
      category_id: 'cat-exp',
      description: 'Aluguel Residencial',
      category: { name: 'Alimentação', type: 'EXPENSE' }
    }
  ];

  const mockPortfolio = {
    total_portfolio_value: 50000,
    allocation_by_type: {
      STOCK: { total_value: 30000, percentage: 60 },
      FIXED_INCOME: { total_value: 20000, percentage: 40 }
    },
    positions: [
      { ticker: 'PETR4', asset_type: 'STOCK', current_value: 30000 },
      { ticker: 'SELIC', asset_type: 'FIXED_INCOME', current_value: 20000 }
    ]
  };

  test('1. Renderiza a hierarquia Mobile-First da 1ª dobra (Cards de KPIs) e 2ª dobra (Donut Chart + Tabela Recente)', () => {
    const markup = renderDashboardViewMarkup({
      transactions: mockTransactions,
      portfolio: mockPortfolio,
      categories: mockCategories,
      monthlyBudget: 5000,
      isFormOpen: false
    });

    expect(markup).toContain('data-testid="dashboard-view"');
    // 1ª Dobra: Seção de KPIs acionáveis (Liquidez & Burn Rate)
    expect(markup).toContain('data-testid="kpis-section"');
    expect(markup).toContain('data-kpi-card="liquidity"');
    expect(markup).toContain('data-kpi-card="burn_rate"');

    // 2ª Dobra: Grid responsivo Donut Chart (5 colunas desktop) + Tabela (7 colunas desktop)
    expect(markup).toContain('id="asset-allocation-chart-section"');
    expect(markup).toContain('id="recent-transactions-section"');
    expect(markup).toContain('data-testid="dashboard-chart-col"');
    expect(markup).toContain('data-testid="dashboard-transactions-col"');
    expect(markup).toContain('lg:col-span-5');
    expect(markup).toContain('lg:col-span-7');
  });

  test('2. Controlador executa sincronização reativa ao adicionar e excluir transação, recalculando saldo e burn rate', () => {
    const onStateChange = jest.fn();
    const controller = createDashboardViewController({
      initialTransactions: mockTransactions,
      initialPortfolio: mockPortfolio,
      categories: mockCategories,
      monthlyBudget: 5000,
      onStateChange
    });

    const initial = controller.getState();
    expect(initial.transactions).toHaveLength(2);
    // Saldo: 10000 - 2500 = 7500
    expect(initial.kpis.net_balance).toBe(7500);
    // Burn Rate: 2500 / 5000 = 50%
    expect(initial.kpis.burn_rate_percentage).toBe(50);

    // Adiciona nova despesa de 1500
    controller.addTransaction({
      id: 'tx-3',
      amount: 1500,
      date: '2026-10-10',
      category_id: 'cat-exp',
      description: 'Supermercado',
      category: { name: 'Alimentação', type: 'EXPENSE' }
    });

    const updated = controller.getState();
    expect(updated.transactions).toHaveLength(3);
    // Saldo: 10000 - (2500 + 1500) = 6000
    expect(updated.kpis.net_balance).toBe(6000);
    // Burn Rate: 4000 / 5000 = 80%
    expect(updated.kpis.burn_rate_percentage).toBe(80);
    expect(onStateChange).toHaveBeenCalled();

    // Exclui a transação recém adicionada
    controller.deleteTransaction('tx-3');
    const afterDelete = controller.getState();
    expect(afterDelete.transactions).toHaveLength(2);
    expect(afterDelete.kpis.net_balance).toBe(7500);
  });

  test('3. renderAppPage() retorna documento HTML5 válido com DOCTYPE, viewport-fit=cover, tokens e runtime SPA', () => {
    const html = renderAppPage();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="pt-BR"');
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('data-testid="app-shell"');
    expect(html).toContain('id="pc-design-tokens"');
    expect(html).toContain('PersonalController — Dashboard Financeiro');
    expect(html).toContain('<script src="https://cdn.tailwindcss.com"></script>');
    expect(html).toContain('data-testid="transactions-mobile-list"');
  });

  test('4. renderAppPage() aplica paridade global de tema para light mode com theme-color dinâmico e overrides CSS', () => {
    const html = renderAppPage({ theme: 'light' });
    expect(html).toContain('<html lang="pt-BR" data-theme="light">');
    expect(html).toContain('<meta name="theme-color" content="#F8FAFC" />');
    expect(html).toContain('[data-theme="light"] .bg-slate-900');
    expect(html).toContain('background-color: var(--bg-surface) !important;');
    expect(html).toContain('function applyTheme(nextTheme)');
    expect(html).toContain("themeMeta.setAttribute('content', state.theme === 'light' ? '#F8FAFC' : '#0F172A');");
    expect(html).toContain('role="dialog" aria-modal="true" aria-label="Nova Transação"');
    expect(html).toContain('data-testid="quick-transaction-backdrop"');
  });

  test('5. Rota Express GET /dashboard e GET /app retorna HTTP 200 (text/html) sem alterar o contrato de GET / e GET /health', async () => {
    // 1) GET /dashboard retorna HTML da aplicação SPA
    const dashboardRes = await request(app).get('/dashboard');
    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.headers['content-type']).toMatch(/text\/html/);
    expect(dashboardRes.text).toContain('data-testid="app-shell"');
    expect(dashboardRes.text).toContain('PersonalController');

    // 2) GET /app também responde o HTML
    const appRes = await request(app).get('/app');
    expect(appRes.status).toBe(200);
    expect(appRes.headers['content-type']).toMatch(/text\/html/);

    // 3) Contrato JSON existente de GET / preservado intacto
    const rootRes = await request(app).get('/');
    expect(rootRes.status).toBe(200);
    expect(rootRes.headers['content-type']).toMatch(/json/);
    expect(rootRes.body.status).toBe('ok');
    expect(rootRes.body.service).toBe('PersonalController API');

    // 4) Contrato JSON existente de GET /health preservado intacto
    const healthRes = await request(app).get('/health');
    expect(healthRes.status).toBe(200);
    expect(healthRes.headers['content-type']).toMatch(/json/);
    expect(healthRes.body.pipeline).toBe('running');
  });
});
