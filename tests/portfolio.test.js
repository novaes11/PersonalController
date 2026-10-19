const request = require('supertest');
const { clearQuotesCache, setCachedQuote } = require('../src/services/quotes.service');

const mockUserA = {
  id: '11111111-1111-4111-a111-111111111111',
  email: 'investidor.a@exemplo.com'
};

const mockUserEmpty = {
  id: '22222222-2222-4222-a222-222222222222',
  email: 'investidor.vazio@exemplo.com'
};

const AUTH_HEADER_USER_A = 'Bearer valid_token_user_a';
const AUTH_HEADER_EMPTY = 'Bearer valid_token_empty';

const mockPositionsUserA = [
  {
    id: 'aaaa1111-1111-4111-a111-111111111111',
    user_id: mockUserA.id,
    asset_id: '00000001-0000-4000-a000-000000000001',
    quantity: 100,
    average_price: 30.00,
    notes: 'Custódia B3',
    updated_at: '2026-10-19T12:00:00Z',
    asset: {
      id: '00000001-0000-4000-a000-000000000001',
      ticker: 'PETR4',
      name: 'Petróleo Brasileiro S.A. - Petrobras',
      asset_type: 'STOCK',
      current_price: 37.50,
      currency: 'BRL',
      last_price_update: '2026-10-19T11:30:00Z'
    }
  },
  {
    id: 'aaaa2222-2222-4222-a222-222222222222',
    user_id: mockUserA.id,
    asset_id: '00000002-0000-4000-a000-000000000002',
    quantity: 0.05,
    average_price: 300000.00,
    notes: 'Hardware Wallet',
    updated_at: '2026-10-19T12:00:00Z',
    asset: {
      id: '00000002-0000-4000-a000-000000000002',
      ticker: 'BTC',
      name: 'Bitcoin',
      asset_type: 'CRYPTO',
      current_price: 360000.00,
      currency: 'BRL',
      last_price_update: '2026-10-19T11:30:00Z'
    }
  }
];

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseClient: jest.fn(() => ({
      auth: {
        getUser: jest.fn(async (jwt) => {
          if (jwt === 'valid_token_user_a') {
            return { data: { user: mockUserA }, error: null };
          }
          if (jwt === 'valid_token_empty') {
            return { data: { user: mockUserEmpty }, error: null };
          }
          return { data: { user: null }, error: { message: 'Invalid JWT' } };
        })
      },
      from: jest.fn((table) => {
        if (table === 'portfolio_positions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((field, val) => {
                if (field === 'user_id' && val === mockUserA.id) {
                  return Promise.resolve({
                    data: JSON.parse(JSON.stringify(mockPositionsUserA)),
                    error: null
                  });
                }
                return Promise.resolve({ data: [], error: null });
              })
            }))
          };
        }
        return {};
      })
    })),
    getSupabaseAdminClient: jest.fn(),
    supabase: {}
  };
});

const app = require('../server');

describe('Portfolio API - GET /portfolio/consolidated (E03.T03)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearQuotesCache();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('Segurança, Autenticação e Blindagem de Query (SEC-03 & SEC-04)', () => {
    it('deve retornar 401 se o cabeçalho Authorization estiver ausente', async () => {
      const response = await request(app).get('/portfolio/consolidated');
      expect(response.statusCode).toBe(401);
      expect(response.body.status).toBe('error');
    });

    it('deve retornar 401 se o token JWT for inválido', async () => {
      const response = await request(app)
        .get('/portfolio/consolidated')
        .set('Authorization', 'Bearer token_invalido');
      expect(response.statusCode).toBe(401);
      expect(response.body.status).toBe('error');
    });

    it('deve retornar 400 se parâmetros de query desconhecidos forem enviados (.strict())', async () => {
      const response = await request(app)
        .get('/portfolio/consolidated?user_id=99999999-9999-4999-a999-999999999999')
        .set('Authorization', AUTH_HEADER_USER_A);

      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors[0].message).toContain('Mass Assignment');
    });
  });

  describe('Consolidação de Posições e Cotações em Cache', () => {
    it('deve consolidar a carteira multiplicando a quantidade pela cotação persistida em cache no banco', async () => {
      const response = await request(app)
        .get('/portfolio/consolidated')
        .set('Authorization', AUTH_HEADER_USER_A);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');

      const data = response.body.data;
      expect(data.user_id).toBe(mockUserA.id);
      expect(data.positions_count).toBe(2);

      // PETR4: 100 * 37.50 = 3750.00 (Investido: 100 * 30.00 = 3000.00, Lucro: 750.00)
      // BTC:   0.05 * 360000 = 18000.00 (Investido: 0.05 * 300000 = 15000.00, Lucro: 3000.00)
      // Total Carteira: 21750.00 | Total Investido: 18000.00 | Lucro Total: 3750.00 (+20.83%)
      expect(data.total_portfolio_value).toBe(21750.00);
      expect(data.total_invested_value).toBe(18000.00);
      expect(data.total_profit_loss).toBe(3750.00);
      expect(data.total_profit_loss_percentage).toBe(20.83);

      // Ordenado por maior valor atual (BTC primeiro, PETR4 depois)
      const btcPos = data.positions[0];
      expect(btcPos.ticker).toBe('BTC');
      expect(btcPos.quantity).toBe(0.05);
      expect(btcPos.current_price).toBe(360000.00);
      expect(btcPos.current_value).toBe(18000.00);
      expect(btcPos.total_value).toBe(18000.00);
      expect(btcPos.profit_loss).toBe(3000.00);
      expect(btcPos.allocation_percentage).toBe(82.76);

      const petrPos = data.positions[1];
      expect(petrPos.ticker).toBe('PETR4');
      expect(petrPos.quantity).toBe(100);
      expect(petrPos.current_price).toBe(37.50);
      expect(petrPos.current_value).toBe(3750.00);
      expect(petrPos.total_value).toBe(3750.00);
      expect(petrPos.profit_loss).toBe(750.00);
      expect(petrPos.profit_loss_percentage).toBe(25.00);
      expect(petrPos.allocation_percentage).toBe(17.24);

      // Alocação por classe de ativo
      expect(data.allocation_by_type.CRYPTO.total_value).toBe(18000.00);
      expect(data.allocation_by_type.CRYPTO.percentage).toBe(82.76);
      expect(data.allocation_by_type.STOCK.total_value).toBe(3750.00);
      expect(data.allocation_by_type.STOCK.percentage).toBe(17.24);
    });

    it('deve priorizar a cotação mais recente do cache em memória (TTL 30m) sobre o preço do banco', async () => {
      // Simula que o cache em memória possui cotação mais fresca para PETR4 (R$ 40,00) e BTC (R$ 380.000,00)
      setCachedQuote('PETR4', 40.00);
      setCachedQuote('BTC', 380000.00);

      const response = await request(app)
        .get('/portfolio/consolidated')
        .set('Authorization', AUTH_HEADER_USER_A);

      expect(response.statusCode).toBe(200);
      const data = response.body.data;

      // PETR4: 100 * 40.00 = 4000.00
      // BTC:   0.05 * 380000.00 = 19000.00
      // Total: 23000.00
      expect(data.total_portfolio_value).toBe(23000.00);

      const petrPos = data.positions.find(p => p.ticker === 'PETR4');
      expect(petrPos.current_price).toBe(40.00);
      expect(petrPos.current_value).toBe(4000.00);
      expect(petrPos.quote_source).toBe('cache');
    });

    it('deve retornar estrutura vazia zerada quando o usuário não possuir posições na carteira', async () => {
      const response = await request(app)
        .get('/portfolio/consolidated')
        .set('Authorization', AUTH_HEADER_EMPTY);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.data.total_portfolio_value).toBe(0);
      expect(response.body.data.positions_count).toBe(0);
      expect(response.body.data.positions).toEqual([]);
      expect(response.body.data.allocation_by_type).toEqual({});
    });

    it('deve funcionar com o prefixo serverless /api/portfolio/consolidated e suportar ?refresh=true', async () => {
      global.fetch = jest.fn((url) => {
        if (url.includes('awesomeapi')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ 'BTCBRL': { bid: '400000.00' } })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            results: [{ symbol: 'PETR4', regularMarketPrice: 42.00 }]
          })
        });
      });

      const response = await request(app)
        .get('/api/portfolio/consolidated?refresh=true')
        .set('Authorization', AUTH_HEADER_USER_A);

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
      // PETR4: 100 * 42 = 4200 | BTC: 0.05 * 400000 = 20000 => 24200
      expect(response.body.data.total_portfolio_value).toBe(24200.00);
    });
  });
});
