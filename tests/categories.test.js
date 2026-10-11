const request = require('supertest');

const mockCategories = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Salário', type: 'INCOME', user_id: null },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Renda Extra', type: 'INCOME', user_id: null },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Investimentos', type: 'INCOME', user_id: null },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Outras Receitas', type: 'INCOME', user_id: null },
  { id: '55555555-5555-5555-5555-555555555555', name: 'Alimentação', type: 'EXPENSE', user_id: null },
  { id: '66666666-6666-6666-6666-666666666666', name: 'Transporte', type: 'EXPENSE', user_id: null },
  { id: '77777777-7777-7777-7777-777777777777', name: 'Moradia', type: 'EXPENSE', user_id: null },
  { id: '88888888-8888-8888-8888-888888888888', name: 'Saúde', type: 'EXPENSE', user_id: null },
  { id: '99999999-9999-9999-9999-999999999999', name: 'Lazer', type: 'EXPENSE', user_id: null },
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Educação', type: 'EXPENSE', user_id: null },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Outras Despesas', type: 'EXPENSE', user_id: null }
];

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseClient: jest.fn(() => ({
      from: jest.fn(() => {
        let filterType = null;
        let filterId = null;

        const chain = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (field, val) {
            if (field === 'type') filterType = val;
            if (field === 'id') filterId = val;
            return chain;
          }),
          order: jest.fn().mockImplementation(() => {
            let res = [...mockCategories];
            if (filterType) res = res.filter(c => c.type === filterType);
            return Promise.resolve({ data: res, error: null });
          }),
          maybeSingle: jest.fn().mockImplementation(() => {
            if (filterId === '11111111-1111-1111-1111-111111111111') {
              return Promise.resolve({ data: mockCategories[0], error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          insert: jest.fn((rows) => ({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', ...rows[0] },
                error: null
              })
            })
          })),
          update: jest.fn((patch) => ({
            eq: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockImplementation(() => {
                  if (filterId === '11111111-1111-1111-1111-111111111111') {
                    return Promise.resolve({ data: { ...mockCategories[0], ...patch }, error: null });
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
                  if (filterId === '11111111-1111-1111-1111-111111111111') {
                    return Promise.resolve({ data: mockCategories[0], error: null });
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

describe('Categories API - /categories', () => {
  it('GET /categories deve retornar lista de categorias com status 200', async () => {
    const response = await request(app).get('/categories');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toBe(11);
  });

  it('GET /categories?type=INCOME deve retornar apenas categorias de receita', async () => {
    const response = await request(app).get('/categories?type=INCOME');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(Array.isArray(response.body.data)).toBe(true);
    response.body.data.forEach(cat => {
      expect(cat.type).toBe('INCOME');
    });
  });

  it('GET /categories?type=EXPENSE deve retornar apenas categorias de despesa', async () => {
    const response = await request(app).get('/categories?type=EXPENSE');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(Array.isArray(response.body.data)).toBe(true);
    response.body.data.forEach(cat => {
      expect(cat.type).toBe('EXPENSE');
    });
  });

  it('GET /categories?type=INVALID deve retornar 400 Bad Request', async () => {
    const response = await request(app).get('/categories?type=INVALID');
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
  });

  it('GET /categories/:id com ID inexistente deve retornar 404', async () => {
    const response = await request(app).get('/categories/00000000-0000-0000-0000-000000000000');
    expect(response.statusCode).toBe(404);
    expect(response.body.status).toBe('error');
  });

  it('POST /categories sem campos obrigatórios deve retornar 400 com detalhes de validação', async () => {
    const response = await request(app).post('/categories').send({});
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('POST /categories com tipo inválido deve retornar 400', async () => {
    const response = await request(app).post('/categories').send({
      name: 'Categoria Teste',
      type: 'INVALIDO'
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
  });

  it('POST /categories com payload válido deve criar e retornar 201', async () => {
    const response = await request(app).post('/categories').send({
      name: 'Freela Design',
      type: 'INCOME',
      color: '#10B981',
      icon: 'sparkles'
    });
    expect(response.statusCode).toBe(201);
    expect(response.body.status).toBe('ok');
    expect(response.body.data.name).toBe('Freela Design');
  });

  it('GET /api/categories deve funcionar com paridade de rota prefixada', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
