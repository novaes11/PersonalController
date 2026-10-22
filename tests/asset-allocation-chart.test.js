const {
  computeDonutChartSegments,
  AssetAllocationChart,
  renderAssetAllocationChartMarkup,
  createAssetAllocationChartController
} = require('../src/frontend/components/AssetAllocationChart');

const mockConsolidatedPayload = {
  user_id: '11111111-1111-4111-a111-111111111111',
  total_portfolio_value: 25000.00,
  total_invested_value: 20000.00,
  total_profit_loss: 5000.00,
  total_profit_loss_percentage: 25.00,
  positions_count: 3,
  allocation_by_type: {
    CRYPTO: {
      total_value: 15000.00,
      percentage: 60.00
    },
    STOCK: {
      total_value: 6250.00,
      percentage: 25.00
    },
    FII: {
      total_value: 3750.00,
      percentage: 15.00
    }
  },
  positions: [
    {
      id: 'pos-1',
      ticker: 'BTC',
      name: 'Bitcoin',
      asset_type: 'CRYPTO',
      quantity: 0.04,
      current_price: 375000.00,
      current_value: 15000.00,
      total_value: 15000.00,
      allocation_percentage: 60.00
    },
    {
      id: 'pos-2',
      ticker: 'PETR4',
      name: 'Petrobras',
      asset_type: 'STOCK',
      quantity: 160,
      current_price: 39.0625,
      current_value: 6250.00,
      total_value: 6250.00,
      allocation_percentage: 25.00
    },
    {
      id: 'pos-3',
      ticker: 'HGLG11',
      name: 'CSHG Logística',
      asset_type: 'FII',
      quantity: 23,
      current_price: 163.0435,
      current_value: 3750.00,
      total_value: 3750.00,
      allocation_percentage: 15.00
    }
  ]
};

describe('Gráfico de Distribuição de Ativos - Donut Chart (E04.T04)', () => {
  describe('Cálculo de Segmentos do Gráfico de Rosca (computeDonutChartSegments)', () => {
    it('deve calcular os segmentos do gráfico de rosca ordenados por participação com stroke-dasharray e stroke-dashoffset', () => {
      const chart = computeDonutChartSegments(mockConsolidatedPayload);

      expect(chart.total_portfolio_value).toBe(25000.00);
      expect(chart.segments).toHaveLength(3);

      expect(chart.segments[0].asset_type).toBe('CRYPTO');
      expect(chart.segments[0].label).toBe('Criptoativos');
      expect(chart.segments[0].percentage).toBe(60.00);
      expect(chart.segments[0].total_value).toBe(15000.00);
      expect(chart.segments[0].stroke_dasharray).toBeDefined();

      expect(chart.segments[1].asset_type).toBe('STOCK');
      expect(chart.segments[1].label).toBe('Ações (B3)');
      expect(chart.segments[1].percentage).toBe(25.00);

      expect(chart.segments[2].asset_type).toBe('FII');
      expect(chart.segments[2].label).toBe('Fundos Imobiliários (FII)');
      expect(chart.segments[2].percentage).toBe(15.00);
    });

    it('deve agregar automaticamente a partir de positions caso allocation_by_type não seja fornecido', () => {
      const chart = computeDonutChartSegments({
        positions: [
          { ticker: 'PETR4', asset_type: 'STOCK', current_value: 4000 },
          { ticker: 'BTC', asset_type: 'CRYPTO', current_value: 6000 }
        ]
      });

      expect(chart.total_portfolio_value).toBe(10000);
      expect(chart.segments).toHaveLength(2);
      expect(chart.segments[0].asset_type).toBe('CRYPTO');
      expect(chart.segments[0].percentage).toBe(60);
      expect(chart.segments[1].asset_type).toBe('STOCK');
      expect(chart.segments[1].percentage).toBe(40);
    });
  });

  describe('Renderização do Componente React e SVG Donut Chart', () => {
    it('deve renderizar o SVG de rosca (<svg> e <circle>) e a legenda com valores e percentuais', () => {
      const html = renderAssetAllocationChartMarkup({
        portfolio: mockConsolidatedPayload
      });

      expect(html).toContain('id="asset-allocation-chart-section"');
      expect(html).toContain('id="asset-allocation-donut-svg"');
      expect(html).toContain('data-segment-type="CRYPTO"');
      expect(html).toContain('data-segment-type="STOCK"');
      expect(html).toContain('data-segment-type="FII"');
      expect(html).toContain('id="asset-allocation-legend"');
      expect(html).toContain('Criptoativos');
      expect(html).toContain('(60.00%)');
      expect(html).toContain('Ações (B3)');
      expect(html).toContain('(25.00%)');
      expect(html).toContain('Fundos Imobiliários (FII)');
      expect(html).toContain('(15.00%)');
      expect(html).toContain('25.000,00');
    });

    it('deve renderizar estado vazio quando a carteira não possuir ativos', () => {
      const html = renderAssetAllocationChartMarkup({
        portfolio: { total_portfolio_value: 0, positions: [], allocation_by_type: {} }
      });

      expect(html).toContain('Nenhum ativo em custódia para exibir no gráfico.');
      expect(html).not.toContain('id="asset-allocation-donut-svg"');
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

      const tree = AssetAllocationChart({ portfolio: mockConsolidatedPayload }, mockReact);
      expect(tree.type).toBe('section');
      expect(tree.props.id).toBe('asset-allocation-chart-section');

      const svgEl = createdElements.find(el => el.type === 'svg');
      expect(svgEl).toBeDefined();
      expect(svgEl.props.id).toBe('asset-allocation-donut-svg');

      const circles = createdElements.filter(el => el.type === 'circle' && el.props['data-segment-type']);
      expect(circles).toHaveLength(3);
    });
  });

  describe('Integração com GET /api/portfolio/consolidated via Controlador', () => {
    it('deve consumir GET /api/portfolio/consolidated e atualizar os dados do gráfico de rosca', async () => {
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          status: 'ok',
          data: mockConsolidatedPayload
        })
      });

      const controller = createAssetAllocationChartController({
        token: 'jwt_token_valido', // allowlist-secret
        baseUrl: '/api',
        fetchImpl: mockFetch
      });

      const chartData = await controller.loadPortfolio();

      expect(mockFetch).toHaveBeenCalledWith('/api/portfolio/consolidated', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer jwt_token_valido' // allowlist-secret
        }
      });

      expect(chartData.total_portfolio_value).toBe(25000.00);
      expect(chartData.segments).toHaveLength(3);
      expect(controller.getState().chartData.segments[0].asset_type).toBe('CRYPTO');
    });
  });
});
