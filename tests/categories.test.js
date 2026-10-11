const request = require('supertest');
const app = require('../server');

describe('Categories API - /categories', () => {
  it('GET /categories deve retornar lista de categorias com status 200', async () => {
    const response = await request(app).get('/categories');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toBeGreaterThanOrEqual(11); // Seed de 11 categorias
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

  it('GET /api/categories deve funcionar com paridade de rota prefixada', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
