const request = require('supertest');
const { getQuotesForAssets, clearQuotesCache } = require('../src/services/quotes.service');
const { runQuotesWorker } = require('../src/workers/quotes.worker');

const mockAssets = [
  { id: '11111111-1111-4111-a111-111111111111', ticker: 'PETR4', name: 'Petrobras', asset_type: 'STOCK', current_price: 37.50, currency: 'BRL' },
  { id: '22222222-2222-4222-a222-222222222222', ticker: 'HGLG11', name: 'CSHG Logistica', asset_type: 'FII', current_price: 162.80, currency: 'BRL' },
  { id: '33333333-3333-4333-a333-333333333333', ticker: 'BTC', name: 'Bitcoin', asset_type: 'CRYPTO', current_price: 360000.00, currency: 'BRL' },
  { id: '44444444-4444-4444-a444-444444444444', ticker: 'USD/BRL', name: 'Dolar', asset_type: 'CURRENCY', current_price: 5.50, currency: 'BRL' }
];

let mockDbAssets = JSON.parse(JSON.stringify(mockAssets));

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseAdminClient: jest.fn(() => ({
      from: jest.fn((table) => {
        if (table === 'assets') {
          return {
            select: jest.fn(() => Promise.resolve({ data: mockDbAssets, error: null })),
            update: jest.fn((patch) => ({
              eq: jest.fn((field, val) => {
                const target = mockDbAssets.find(a => a[field] === val);
                if (target) {
                  Object.assign(target, patch);
                }
                return Promise.resolve({ data: target, error: null });
              })
            }))
          };
        }
        return {};
      })
    })),
    getSupabaseClient: jest.fn(),
    supabase: {}
  };
});

const app = require('../server');

describe('Worker de Cotações e Cron Job (E03.T02)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearQuotesCache();
    mockDbAssets = JSON.parse(JSON.stringify(mockAssets));
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Quotes Service (src/services/quotes.service.js)', () => {
    it('deve consultar APIs remotas e retornar cotacoes atualizadas', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('awesomeapi')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              'USDBRL': { bid: '5.5840' },
              'BTCBRL': { bid: '365000.00' }
            })
          });
        }
        if (url.includes('brapi')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              results: [
                { symbol: 'PETR4', regularMarketPrice: 38.20 },
                { symbol: 'HGLG11', regularMarketPrice: 164.50 }
              ]
            })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const quotes = await getQuotesForAssets(mockAssets, true);

      expect(quotes['PETR4'].price).toBe(38.20);
      expect(quotes['PETR4'].source).toBe('remote');
      expect(quotes['HGLG11'].price).toBe(164.50);
      expect(quotes['BTC'].price).toBe(365000.00);
      expect(quotes['USD/BRL'].price).toBe(5.5840);
    });

    it('deve usar cache em memoria quando disponivel dentro do TTL', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ 'USDBRL': { bid: '5.60' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            results: [{ symbol: 'PETR4', regularMarketPrice: 39.00 }]
          })
        });

      const firstCall = await getQuotesForAssets([mockAssets[0], mockAssets[3]], false);
      expect(firstCall['PETR4'].source).toBe('remote');
      expect(firstCall['PETR4'].price).toBe(39.00);

      // Segunda chamada: deve vir do cache sem disparar fetch novamente
      global.fetch = jest.fn();
      const secondCall = await getQuotesForAssets([mockAssets[0], mockAssets[3]], false);
      expect(secondCall['PETR4'].source).toBe('cache');
      expect(secondCall['PETR4'].price).toBe(39.00);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('deve usar fallback de last_price se as APIs remotas falharem', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const quotes = await getQuotesForAssets(mockAssets, true);

      expect(quotes['PETR4'].source).toBe('fallback_last_price');
      expect(quotes['PETR4'].price).toBe(37.50);
      expect(quotes['BTC'].price).toBe(360000.00);
    });
  });

  describe('Quotes Worker (src/workers/quotes.worker.js)', () => {
    it('deve atualizar com sucesso as cotacoes dos ativos no banco de dados', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('awesomeapi')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
              'USDBRL': { bid: '5.55' },
              'BTCBRL': { bid: '370000.00' }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            results: [
              { symbol: 'PETR4', regularMarketPrice: 38.00 },
              { symbol: 'HGLG11', regularMarketPrice: 165.00 }
            ]
          })
        });
      });

      const summary = await runQuotesWorker({ forceRefresh: true });

      expect(summary.status).toBe('ok');
      expect(summary.total).toBe(4);
      expect(summary.updated).toBe(4);
      expect(summary.failed).toBe(0);

      const petr4 = mockDbAssets.find(a => a.ticker === 'PETR4');
      expect(petr4.current_price).toBe(38.00);
      expect(petr4.last_price_update).toBeDefined();
    });
  });

  describe('Cron Endpoint (GET /cron/quotes & /api/cron/quotes)', () => {
    const originalSecret = process.env.CRON_SECRET; // allowlist-secret

    afterEach(() => {
      process.env.CRON_SECRET = originalSecret;
    });

    it('deve retornar 401 se CRON_SECRET estiver configurado e token for ausente/invalido', async () => {
      process.env.CRON_SECRET = 'segredo_super_seguro_cron'; // allowlist-secret

      const response = await request(app).get('/cron/quotes');
      expect(response.statusCode).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Acesso não autorizado');
    });

    it('deve retornar 200 e resumo de execucao com CRON_SECRET valido', async () => {
      process.env.CRON_SECRET = 'segredo_super_seguro_cron'; // allowlist-secret

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          results: [{ symbol: 'PETR4', regularMarketPrice: 38.00 }]
        })
      });

      const response = await request(app)
        .get('/cron/quotes')
        .set('Authorization', 'Bearer segredo_super_seguro_cron'); // allowlist-secret

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body).toHaveProperty('updated');
      expect(response.body).toHaveProperty('results');
    });

    it('deve funcionar com o prefixo serverless /api/cron/quotes', async () => {
      delete process.env.CRON_SECRET;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          results: [{ symbol: 'PETR4', regularMarketPrice: 38.00 }]
        })
      });

      const response = await request(app).get('/api/cron/quotes');
      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
