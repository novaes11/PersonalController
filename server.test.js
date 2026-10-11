const request = require('supertest');
const app = require('./server');
const apiHandler = require('./api/index');

describe('GET /health', () => {
  it('should return 200 and correct json from server', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok', pipeline: 'running' });
  });

  it('should return 200 and correct json from api serverless handler', async () => {
    const response = await request(apiHandler).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok', pipeline: 'running' });
  });
});

