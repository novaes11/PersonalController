const request = require('supertest');
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
      date: '11/10/2026' // Formato inválido (esperado YYYY-MM-DD)
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
    const dateError = response.body.errors.find(e => e.field === 'date');
    expect(dateError).toBeDefined();
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
