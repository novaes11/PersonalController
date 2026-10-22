const {
  calculateFinancialKpis,
  KpiCards,
  renderKpiCardsMarkup,
  createKpiCardsController
} = require('../src/frontend/components/KpiCards');

const mockTransactions = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    amount: 8000.00,
    date: '2026-10-05',
    description: 'Salário Mensal',
    category: { id: 'cat-1', name: 'Salário', type: 'INCOME' }
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    amount: 2000.00,
    date: '2026-10-10',
    description: 'Freelance Consultoria',
    category: { id: 'cat-2', name: 'Renda Extra', type: 'INCOME' }
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    amount: 3200.00,
    date: '2026-10-12',
    description: 'Aluguel e Condomínio',
    category: { id: 'cat-3', name: 'Moradia', type: 'EXPENSE' }
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    amount: 1300.00,
    date: '2026-10-18',
    description: 'Supermercado e Feira',
    category: { id: 'cat-4', name: 'Alimentação', type: 'EXPENSE' }
  }
];

describe('Cards de KPIs - Liquidez, Receita, Despesa e Burn Rate (E04.T03)', () => {
  describe('Cálculo de Indicadores Financeiros (calculateFinancialKpis)', () => {
    it('deve calcular corretamente Saldo (Liquidez), Receita, Despesa e Burn Rate a partir das transações', () => {
      // Receita: 8000 + 2000 = 10000
      // Despesa: 3200 + 1300 = 4500
      // Saldo / Liquidez: 10000 - 4500 = 5500
      // Burn Rate: 4500 / 10000 = 45% (healthy / Saudável)
      // Poupança: 55%
      const kpis = calculateFinancialKpis(mockTransactions);

      expect(kpis.total_income).toBe(10000.00);
      expect(kpis.total_expense).toBe(4500.00);
      expect(kpis.net_balance).toBe(5500.00);
      expect(kpis.liquidity).toBe(5500.00);
      expect(kpis.burn_rate_percentage).toBe(45.00);
      expect(kpis.burn_rate_status).toBe('healthy');
      expect(kpis.burn_rate_label).toBe('Saudável');
      expect(kpis.savings_rate_percentage).toBe(55.00);
      expect(kpis.transactions_count).toBe(4);
    });

    it('deve classificar Burn Rate como warning (>= 70%) e critical (>= 90%)', () => {
      const warningKpis = calculateFinancialKpis(mockTransactions, { monthlyBudget: 6000 });
      // 4500 / 6000 = 75%
      expect(warningKpis.burn_rate_percentage).toBe(75.00);
      expect(warningKpis.burn_rate_status).toBe('warning');
      expect(warningKpis.burn_rate_label).toBe('Atenção');

      const criticalKpis = calculateFinancialKpis(mockTransactions, { monthlyBudget: 4800 });
      // 4500 / 4800 = 93.75%
      expect(criticalKpis.burn_rate_percentage).toBe(93.75);
      expect(criticalKpis.burn_rate_status).toBe('critical');
      expect(criticalKpis.burn_rate_label).toBe('Crítico');
    });
  });

  describe('Renderização do Componente React (KpiCards)', () => {
    it('deve renderizar os 4 cards de KPIs no HTML com valores formatados e progressbar', () => {
      const html = renderKpiCardsMarkup({
        transactions: mockTransactions
      });

      expect(html).toContain('id="kpi-cards-section"');
      expect(html).toContain('data-kpi-card="liquidity"');
      expect(html).toContain('data-kpi-card="income"');
      expect(html).toContain('data-kpi-card="expense"');
      expect(html).toContain('data-kpi-card="burn_rate"');
      expect(html).toContain('5.500,00');
      expect(html).toContain('10.000,00');
      expect(html).toContain('4.500,00');
      expect(html).toContain('45.0%');
      expect(html).toContain('role="progressbar"');
      expect(html).toContain('aria-valuenow="45"');
    });

    it('deve construir árvore de elementos React via React.createElement', () => {
      const createdElements = [];
      const mockReact = {
        createElement: jest.fn((type, props, ...children) => {
          const el = { type, props: props || {}, children: children.flat() };
          createdElements.push(el);
          return el;
        })
      };

      const tree = KpiCards({ transactions: mockTransactions }, mockReact);
      expect(tree.type).toBe('section');
      expect(tree.props.id).toBe('kpi-cards-section');

      const articles = createdElements.filter(el => el.type === 'article');
      expect(articles).toHaveLength(4);
    });
  });

  describe('Integração com GET /api/transactions via Controlador', () => {
    it('deve carregar transações via GET /api/transactions e atualizar o estado dos KPIs', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          status: 'ok',
          count: 4,
          limit: 100,
          offset: 0,
          data: mockTransactions
        })
      });

      const controller = createKpiCardsController({
        token: 'jwt_token_valido', // allowlist-secret
        baseUrl: '/api',
        fetchImpl: mockFetch
      });

      const kpis = await controller.loadKpis({
        start_date: '2026-10-01',
        end_date: '2026-10-31'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transactions?limit=100&offset=0&start_date=2026-10-01&end_date=2026-10-31',
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer jwt_token_valido' // allowlist-secret
          }
        }
      );

      expect(kpis.net_balance).toBe(5500.00);
      expect(kpis.total_income).toBe(10000.00);
      expect(kpis.total_expense).toBe(4500.00);
      expect(kpis.burn_rate_percentage).toBe(45.00);
    });
  });
});
