const {
  DEFAULT_STARTER_CATEGORIES,
  resolveAuthSessionMode,
  loadDashboardState,
  persistTransaction,
  removeTransaction
} = require('../src/frontend/services/dataSyncService');
const { renderAppPage } = require('../src/frontend/pages/renderAppPage');

describe('E06.T03 — Transição de Dados Mockados (Demo) para Dados Reais da API Supabase', () => {
  const VALID_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.real-supabase-jwt';
  const REAL_SESSION = {
    isDemo: false,
    token: VALID_JWT,
    user: {
      id: '99999999-9999-4999-8999-999999999901',
      email: 'investidor.real@personalcontroller.app',
      isDemo: false
    }
  };

  const DEMO_SESSION = {
    isDemo: true,
    token: 'demo-token-1730000000', // allowlist-secret
    user: {
      email: 'demo@personalcontroller.app',
      isDemo: true
    }
  };

  test('1. resolveAuthSessionMode() distingue sessões Demo de sessões Autenticadas com JWT real', () => {
    expect(resolveAuthSessionMode(null)).toMatchObject({
      mode: 'demo',
      isDemo: true,
      token: null
    });

    expect(resolveAuthSessionMode('json-invalido')).toMatchObject({
      mode: 'demo',
      isDemo: true,
      token: null
    });

    expect(resolveAuthSessionMode(DEMO_SESSION)).toMatchObject({
      mode: 'demo',
      isDemo: true,
      token: null
    });

    const resolvedReal = resolveAuthSessionMode(JSON.stringify(REAL_SESSION));
    expect(resolvedReal).toEqual({
      mode: 'authenticated',
      isDemo: false,
      token: VALID_JWT,
      user: {
        id: '99999999-9999-4999-8999-999999999901',
        email: 'investidor.real@personalcontroller.app',
        isDemo: false
      }
    });
  });

  test('2. loadDashboardState() em Modo Demo retorna dados simulados sem efetuar chamadas HTTP', async () => {
    const fetchMock = jest.fn();

    const state = await loadDashboardState({
      session: DEMO_SESSION,
      fetchImpl: fetchMock
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(state.mode).toBe('demo');
    expect(state.isDemo).toBe(true);
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.transactions.length).toBeGreaterThan(0);
    expect(state.portfolio.total_portfolio_value).toBeGreaterThan(0);
  });

  test('3. loadDashboardState() em Modo Autenticado consome /api/categories, /api/transactions e /api/portfolio/consolidated com Bearer JWT', async () => {
    const realCategories = [
      { id: '11111111-1111-4111-8111-111111111101', name: 'Salário Real', type: 'INCOME' },
      { id: '11111111-1111-4111-8111-111111111102', name: 'Moradia Real', type: 'EXPENSE' }
    ];

    const realTransactions = [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        amount: 9500,
        date: '2026-10-25',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: 'Recebimento PJ Outubro',
        is_automated: false
      }
    ];

    const realPortfolio = {
      total_portfolio_value: 42000,
      total_invested_value: 38000,
      total_profit_loss: 4000,
      total_profit_loss_percentage: 10.53,
      positions_count: 1,
      allocation_by_type: {
        STOCK: { total_value: 42000, percentage: 100 }
      },
      positions: [
        {
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          ticker: 'WEGE3',
          asset_type: 'STOCK',
          quantity: 1000,
          average_price: 38,
          current_price: 42,
          current_value: 42000
        }
      ]
    };

    const fetchMock = jest.fn(async (url, options) => {
      expect(options.headers.Authorization).toBe(`Bearer ${VALID_JWT}`);

      if (url.startsWith('/api/categories')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: realCategories })
        };
      }
      if (url.startsWith('/api/transactions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', count: 1, data: realTransactions })
        };
      }
      if (url.startsWith('/api/portfolio/consolidated')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: realPortfolio })
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await loadDashboardState({
      session: REAL_SESSION,
      refreshPortfolio: true,
      fetchImpl: fetchMock
    });

    expect(result.mode).toBe('authenticated');
    expect(result.isDemo).toBe(false);
    expect(result.categories).toEqual(realCategories);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].description).toBe('Recebimento PJ Outubro');
    expect(result.transactions[0].category).toEqual(realCategories[0]);
    expect(result.portfolio.total_portfolio_value).toBe(42000);
    expect(result.portfolio.positions[0].ticker).toBe('WEGE3');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/portfolio/consolidated?refresh=true',
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('4. loadDashboardState() semeia categorias padrão automaticamente quando a conta recém-criada retorna 0 categorias', async () => {
    const createdCats = [];
    const fetchMock = jest.fn(async (url, options) => {
      if (url === '/api/categories' && options.method === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: [] })
        };
      }
      if (url === '/api/categories' && options.method === 'POST') {
        const body = JSON.parse(options.body);
        const newCat = {
          id: `11111111-1111-4111-8111-11111111110${createdCats.length + 1}`,
          name: body.name,
          type: body.type
        };
        createdCats.push(newCat);
        return {
          ok: true,
          status: 201,
          json: async () => ({ status: 'ok', data: newCat })
        };
      }
      if (url.startsWith('/api/transactions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: [] })
        };
      }
      if (url.startsWith('/api/portfolio/consolidated')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', data: { total_portfolio_value: 0, positions: [] } })
        };
      }
      throw new Error(`Unexpected request: ${options.method} ${url}`);
    });

    const result = await loadDashboardState({
      session: REAL_SESSION,
      fetchImpl: fetchMock
    });

    expect(result.categories).toHaveLength(DEFAULT_STARTER_CATEGORIES.length);
    expect(result.categories[0].name).toBe(DEFAULT_STARTER_CATEGORIES[0].name);
  });

  test('5. persistTransaction() e removeTransaction() persistem na API Supabase quando autenticado e operam em memória no Modo Demo', async () => {
    const categories = [
      { id: '11111111-1111-4111-8111-111111111101', name: 'Salário', type: 'INCOME' }
    ];

    // 5a. Modo Demo (sem chamada HTTP)
    const demoFetch = jest.fn();
    const demoCreated = await persistTransaction({
      session: DEMO_SESSION,
      formValues: {
        amount: 500,
        date: '2026-10-28',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: 'Freela Demo'
      },
      categories,
      fetchImpl: demoFetch
    });
    expect(demoFetch).not.toHaveBeenCalled();
    expect(demoCreated.mode).toBe('demo');
    expect(demoCreated.data.amount).toBe(500);

    const demoRemoved = await removeTransaction({
      session: DEMO_SESSION,
      transactionId: demoCreated.data.id,
      fetchImpl: demoFetch
    });
    expect(demoRemoved.mode).toBe('demo');
    expect(demoFetch).not.toHaveBeenCalled();

    // 5b. Modo Autenticado (POST /api/transactions e DELETE /api/transactions/:id com Bearer JWT)
    const authFetch = jest.fn(async (url, options) => {
      expect(options.headers.Authorization).toBe(`Bearer ${VALID_JWT}`);
      if (url === '/api/transactions' && options.method === 'POST') {
        const payload = JSON.parse(options.body);
        expect(payload).toEqual({
          amount: 1250.5,
          date: '2026-10-28',
          category_id: '11111111-1111-4111-8111-111111111101',
          description: 'Dividendos Reais',
          is_automated: false
        });
        return {
          ok: true,
          status: 201,
          json: async () => ({
            status: 'ok',
            data: {
              id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              ...payload
            }
          })
        };
      }
      if (url === '/api/transactions/cccccccc-cccc-4ccc-8ccc-cccccccccccc' && options.method === 'DELETE') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }
          })
        };
      }
      throw new Error(`Unexpected call: ${options.method} ${url}`);
    });

    const authCreated = await persistTransaction({
      session: REAL_SESSION,
      formValues: {
        amount: 1250.5,
        date: '2026-10-28',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: 'Dividendos Reais'
      },
      categories,
      fetchImpl: authFetch
    });

    expect(authCreated.mode).toBe('authenticated');
    expect(authCreated.data.id).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    expect(authCreated.data.category.name).toBe('Salário');

    const authRemoved = await removeTransaction({
      session: REAL_SESSION,
      transactionId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      fetchImpl: authFetch
    });

    expect(authRemoved.mode).toBe('authenticated');
    expect(authRemoved.deletedId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  });

  test('6. renderAppPage() inclui sincronização automática com a API Supabase (syncFromSupabaseApi) e persistência real de transações', () => {
    const html = renderAppPage();

    expect(html).toContain('syncFromSupabaseApi');
    expect(html).toContain('rebuildAllListsInDom');
    expect(html).toContain('/api/categories');
    expect(html).toContain('/api/transactions');
    expect(html).toContain('/api/portfolio/consolidated');
    expect(html).toContain('Bearer ');
  });
});
