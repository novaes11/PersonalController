const request = require('supertest');
const app = require('../server');
const {
  calculatePortfolioSummary,
  renderPortfolioViewMarkup,
  createPortfolioViewController
} = require('../src/frontend/components/PortfolioView');
const { syncPortfolioQuotes } = require('../src/frontend/services/portfolioApi');
const { syncPortfolioQuotesState } = require('../src/frontend/services/dataSyncService');

describe('E05.T06 — View Dedicada de Carteira de Investimentos & Sincronização de Cotações', () => {
  const samplePortfolio = {
    total_portfolio_value: 86420.0,
    total_invested_value: 78500.0,
    total_profit_loss: 7920.0,
    total_profit_loss_percentage: 10.09,
    positions_count: 4,
    allocation_by_type: {
      FIXED_INCOME: { total_value: 36000.0, percentage: 41.66 },
      STOCK: { total_value: 24420.0, percentage: 28.26 },
      FII: { total_value: 16200.0, percentage: 18.75 },
      CRYPTO: { total_value: 9800.0, percentage: 11.34 }
    },
    positions: [
      {
        id: 'pos-1',
        ticker: 'TESOURO-SELIC',
        asset_type: 'FIXED_INCOME',
        quantity: 24,
        average_price: 1420.0,
        current_price: 1500.0,
        invested_value: 34080.0,
        current_value: 36000.0,
        profit_loss: 1920.0,
        profit_loss_percentage: 5.63
      },
      {
        id: 'pos-2',
        ticker: 'PETR4',
        asset_type: 'STOCK',
        quantity: 600,
        average_price: 36.5,
        current_price: 40.7,
        invested_value: 21900.0,
        current_value: 24420.0,
        profit_loss: 2520.0,
        profit_loss_percentage: 11.51
      },
      {
        id: 'pos-3',
        ticker: 'HGLG11',
        asset_type: 'FII',
        quantity: 100,
        average_price: 155.2,
        current_price: 162.0,
        invested_value: 15520.0,
        current_value: 16200.0,
        profit_loss: 680.0,
        profit_loss_percentage: 4.38
      },
      {
        id: 'pos-4',
        ticker: 'BTC',
        asset_type: 'CRYPTO',
        quantity: 0.02,
        average_price: 350000.0,
        current_price: 490000.0,
        invested_value: 7000.0,
        current_value: 9800.0,
        profit_loss: 2800.0,
        profit_loss_percentage: 40.0
      }
    ]
  };

  test('1. calculatePortfolioSummary() calcula patrimônio, custo investido, lucro/prejuízo e rentabilidade por ativo', () => {
    const summary = calculatePortfolioSummary({
      positions: [
        { ticker: 'WEGE3', asset_type: 'STOCK', quantity: 100, average_price: 35.0, current_price: 42.0 },
        { ticker: 'VALE3', asset_type: 'STOCK', quantity: 100, average_price: 65.0, current_price: 58.0 }
      ]
    });

    // WEGE3: investido 3500, atual 4200 (+700 / +20%)
    // VALE3: investido 6500, atual 5800 (-700 / -10.77%)
    // Total: investido 10000, atual 10000 (lucro 0 / 0%)
    expect(summary.total_invested_value).toBe(10000);
    expect(summary.total_portfolio_value).toBe(10000);
    expect(summary.total_profit_loss).toBe(0);
    expect(summary.total_profit_loss_percentage).toBe(0);
    expect(summary.positions).toHaveLength(2);

    const wege = summary.positions.find(p => p.ticker === 'WEGE3');
    expect(wege.profit_loss).toBe(700);
    expect(wege.profit_loss_percentage).toBe(20);
    expect(wege.allocation_percentage).toBe(42);

    const vale = summary.positions.find(p => p.ticker === 'VALE3');
    expect(vale.profit_loss).toBe(-700);
    expect(vale.profit_loss_percentage).toBe(-10.77);
    expect(vale.allocation_percentage).toBe(58);

    // Carteira vazia
    const empty = calculatePortfolioSummary(null);
    expect(empty.total_portfolio_value).toBe(0);
    expect(empty.total_invested_value).toBe(0);
    expect(empty.total_profit_loss).toBe(0);
    expect(empty.positions).toEqual([]);
  });

  test('2. renderPortfolioViewMarkup() renderiza resumo patrimonial real, Donut Chart, lista mobile-first, filtros e botão de cotações', () => {
    const html = renderPortfolioViewMarkup({
      portfolio: samplePortfolio
    });

    // Resumo Patrimonial (Patrimônio, Custo Aplicado e Rentabilidade Real)
    expect(html).toContain('data-testid="portfolio-view"');
    expect(html).toContain('data-testid="portfolio-total-card"');
    expect(html).toContain('R$ 86.420,00');
    expect(html).toContain('data-testid="portfolio-invested-value"');
    expect(html).toContain('R$ 78.500,00');
    expect(html).toContain('data-testid="portfolio-return-card"');
    expect(html).toContain('data-testid="portfolio-return-percentage"');
    expect(html).toContain('+ 10.09%');
    expect(html).toContain('data-testid="portfolio-profit-loss-value"');
    expect(html).toContain('+ R$ 7.920,00 acumulado');

    // Donut Chart (5 colunas desktop) + Posições (7 colunas desktop)
    expect(html).toContain('data-testid="portfolio-chart-col"');
    expect(html).toContain('data-testid="portfolio-positions-col"');
    expect(html).toContain('id="asset-allocation-donut-svg"');

    // Filtros Mobile-First por Classe de Ativo com touch target >= 44px
    expect(html).toContain('data-testid="portfolio-asset-filters"');
    expect(html).toContain('data-testid="portfolio-filter-ALL"');
    expect(html).toContain('data-testid="portfolio-filter-STOCK"');
    expect(html).toContain('data-testid="portfolio-filter-FIXED_INCOME"');
    expect(html).toContain('data-testid="portfolio-filter-FII"');
    expect(html).toContain('data-testid="portfolio-filter-CRYPTO"');

    // Tabela Desktop e Cards Mobile de Posições
    expect(html).toContain('data-testid="portfolio-positions-table"');
    expect(html).toContain('data-testid="portfolio-positions-mobile-list"');
    expect(html).toContain('data-testid="portfolio-pos-row-PETR4"');
    expect(html).toContain('data-testid="portfolio-pos-card-PETR4"');
    expect(html).toContain('data-testid="portfolio-pos-return-PETR4"');
    expect(html).toContain('+ 11.51%');
    expect(html).toContain('data-testid="portfolio-pos-card-BTC"');

    // Botão de atualização de cotações (?refresh=true)
    expect(html).toContain('data-testid="portfolio-sync-quotes-btn"');
    expect(html).toContain('min-height: 44px;');

    // Estado isSyncing = true
    const syncingHtml = renderPortfolioViewMarkup({
      portfolio: samplePortfolio,
      isSyncing: true
    });
    expect(syncingHtml).toContain('aria-busy="true"');
    expect(syncingHtml).toContain('animate-spin');
    expect(syncingHtml).toContain('Sincronizando...');
  });

  test('3. createPortfolioViewController() filtra posições por classe de ativo e sincroniza cotações com ?refresh=true', async () => {
    const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.portfolio-token';
    const refreshedPortfolio = {
      ...samplePortfolio,
      total_portfolio_value: 90000.0,
      total_invested_value: 78500.0,
      total_profit_loss: 11500.0,
      total_profit_loss_percentage: 14.65,
      consolidated_at: '2026-11-04T12:00:00.000Z'
    };

    const fetchMock = jest.fn(async (url, options) => {
      expect(url).toBe('/api/portfolio/consolidated?refresh=true');
      expect(options.headers.Authorization).toBe(`Bearer ${VALID_TOKEN}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', data: refreshedPortfolio })
      };
    });

    const stateChanges = [];
    const controller = createPortfolioViewController({
      initialPortfolio: samplePortfolio,
      token: VALID_TOKEN,
      fetchImpl: fetchMock,
      onStateChange: s => stateChanges.push(s)
    });

    // Filtro por classe de ativo (STOCK)
    const filteredState = controller.setAssetFilter('STOCK');
    expect(filteredState.activeAssetFilter).toBe('STOCK');
    expect(filteredState.filteredPositions).toHaveLength(1);
    expect(filteredState.filteredPositions[0].ticker).toBe('PETR4');

    // Retorno para ALL
    controller.setAssetFilter('ALL');
    expect(controller.getState().filteredPositions).toHaveLength(4);

    // Sincronização de cotações (?refresh=true)
    const syncedState = await controller.syncQuotes({ refresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(syncedState.isSyncing).toBe(false);
    expect(syncedState.summary.total_portfolio_value).toBe(90000.0);
    expect(syncedState.summary.total_profit_loss).toBe(11500.0);
    expect(syncedState.summary.total_profit_loss_percentage).toBe(14.65);
    expect(stateChanges.some(s => s.isSyncing === true)).toBe(true);
  });

  test('4. syncPortfolioQuotes() e syncPortfolioQuotesState() operam tanto em Modo Demo quanto Autenticado (?refresh=true)', async () => {
    const demoFetch = jest.fn();
    const demoResult = await syncPortfolioQuotesState({
      session: { isDemo: true, token: 'demo-token-123' }, // allowlist-secret
      fetchImpl: demoFetch
    });

    expect(demoFetch).not.toHaveBeenCalled();
    expect(demoResult.mode).toBe('demo');
    expect(demoResult.portfolio.quotes_refreshed).toBe(true);
    expect(demoResult.portfolio.total_portfolio_value).toBeGreaterThan(0);

    const authFetch = jest.fn(async (url, options) => {
      expect(url).toBe('/api/portfolio/consolidated?refresh=true');
      expect(options.headers.Authorization).toBe('Bearer real-jwt-token');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          data: samplePortfolio
        })
      };
    });

    const directResult = await syncPortfolioQuotes({
      token: 'real-jwt-token', // allowlist-secret
      fetchImpl: authFetch
    });
    expect(directResult.total_portfolio_value).toBe(86420.0);

    const stateResult = await syncPortfolioQuotesState({
      session: {
        isDemo: false,
        token: 'real-jwt-token', // allowlist-secret
        user: { id: '11111111-1111-4111-8111-111111111111', email: 'user@app.com' }
      },
      fetchImpl: authFetch
    });
    expect(stateResult.mode).toBe('authenticated');
    expect(stateResult.portfolio.total_portfolio_value).toBe(86420.0);
  });

  test('5. Rota Express GET /portfolio renderiza a SPA com a aba Carteira ativa sem afetar GET /portfolio/consolidated', async () => {
    const viewRes = await request(app).get('/portfolio');
    expect(viewRes.status).toBe(200);
    expect(viewRes.headers['content-type']).toMatch(/text\/html/);
    expect(viewRes.text).toContain('id="tab-pane-portfolio" data-testid="tab-pane-portfolio" class="tab-pane block"');
    expect(viewRes.text).toContain('data-testid="portfolio-view"');
    expect(viewRes.text).toContain('data-testid="portfolio-sync-quotes-btn"');

    // Garante que o endpoint protegido GET /portfolio/consolidated continua exigindo JWT (401)
    const apiRes = await request(app).get('/portfolio/consolidated');
    expect(apiRes.status).toBe(401);
  });
});
