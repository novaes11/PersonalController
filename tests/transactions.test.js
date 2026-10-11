const request = require('supertest');

const mockTransactions = [
  {
    id: '99999999-9999-9999-9999-999999999999',
    user_id: '11111111-1111-1111-1111-111111111111',
    category_id: '55555555-5555-5555-5555-555555555555',
    amount: 85.50,
    date: '2026-10-11',
    description: 'Supermercado Mensal',
    is_automated: false,
    category: {
      id: '55555555-5555-5555-5555-555555555555',
      name: 'Alimentação',
      type: 'EXPENSE',
      color: '#EF4444',
      icon: 'utensils'
    }
  }
];

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseClient: jest.fn(() => ({
      from: jest.fn(() => {
        let filterId = null;

        const chain = {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn(function (field, val) {
            if (field === 'id') filterId = val;
            return chain;
          }),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockImplementation(() => {
            return Promise.resolve({ data: mockTransactions, error: null });
          }),
          maybeSingle: jest.fn().mockImplementation(() => {
            if (filterId === '99999999-9999-9999-9999-999999999999') {
              return Promise.resolve({ data: mockTransactions[0], error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          insert: jest.fn((rows) => ({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: '88888888-8888-8888-8888-888888888888', ...rows[0] },
                error: null
              })
            })
          })),
          update: jest.fn((patch) => ({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockImplementation(() => {
                  if (filterId === '99999999-9999-9999-9999-999999999999') {
                    return Promise.resolve({ data: { ...mockTransactions[0], ...patch }, error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                })
              })
            })
          })),
          delete: jest.fn(() => ({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockImplementation(() => {
                  if (filterId === '99999999-9999-9999-9999-999999999999') {
                    return Promise.resolve({ data: mockTransactions[0], error: null });
                  }
                  return Promise.resolve({ data: null, error: null });
                })
              })
            })
          }))
        };

        return chain;
      })
    })),
    supabase: {}
  };
});

const app = require('../server');

describe('Transactions API - /transactions', () => {
  it('GET /transactions deve retornar lista com status 200 e campos de paginacao', async () => {
    const response = await request(app).get('/transactions');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('count');
    expect(response.body).toHaveProperty('limit', 50);
    expect(response.body).toHaveProperty('offset', 0);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /transactions com parametros de paginacao customizados', async () => {
    const response = await request(app).get('/transactions?limit=10&offset=5');
    expect(response.statusCode).toBe(200);
    expect(response.body.limit).toBe(10);
    expect(response.body.offset).toBe(5);
  });

  it('GET /transactions/:id com ID existente deve retornar 200 e a transacao', async () => {
    const response = await request(app).get('/transactions/99999999-9999-9999-9999-999999999999');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.data.id).toBe('99999999-9999-9999-9999-999999999999');
  });

  it('GET /transactions/:id com ID inexistente deve retornar 404', async () => {
    const response = await request(app).get('/transactions/00000000-0000-0000-0000-000000000000');
    expect(response.statusCode).toBe(404);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('não encontrada');
  });

  it('POST /transactions sem body deve retornar 400 com erros de validacao Zod', async () => {
    const response = await request(app).post('/transactions').send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(Array.isArray(response.body.errors)).toBe(true);
    const amountError = response.body.errors.find(e => e.field === 'amount');
    expect(amountError).toBeDefined();
  });

  it('POST /transactions com valor (amount) negativo deve retornar 400', async () => {
    const response = await request(app).post('/transactions').send({
      amount: -50.00,
      description: 'Teste negativo'
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    const amountError = response.body.errors.find(e => e.field === 'amount');
    expect(amountError.message).toContain('positivo');
  });

  it('POST /transactions com data em formato invalido deve retornar 400', async () => {
    const response = await request(app).post('/transactions').send({
      amount: 100.50,
      date: '11/10/2026'
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    const dateError = response.body.errors.find(e => e.field === 'date');
    expect(dateError).toBeDefined();
  });

  it('POST /transactions com payload válido deve criar e retornar 201', async () => {
    const response = await request(app).post('/transactions').send({
      amount: 120.00,
      date: '2026-10-11',
      description: 'Jantar'
    });
    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe('ok');
  });

  it('PUT /transactions/:id com body vazio deve retornar 400', async () => {
    const response = await request(app)
      .put('/transactions/00000000-0000-0000-0000-000000000000')
      .send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(response.body.message).toContain('Nenhum campo fornecido');
  });

  it('GET /api/transactions deve funcionar com prefixo serverless /api', async () => {
    const response = await request(app).get('/api/transactions');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
