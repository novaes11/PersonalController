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

  it('should return 200 for /api/health route', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok', pipeline: 'running' });
  });

  it('should return 200 for /api/index.js/health rewritten route', async () => {
    const response = await request(app).get('/api/index.js/health');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: 'ok', pipeline: 'running' });
  });
});

describe('GET /', () => {
  it('should return 200 and API info', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('PersonalController API');
  });
});

describe('CORS and JSON parser middleware', () => {
  it('should include CORS headers for allowed origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('should allow Vercel Preview deployment origins on POST /api/auth/signup', async () => {
    const previewOrigin = 'https://personal-controller-git-feat-auth-02-novaes11s-projects.vercel.app';
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Origin', previewOrigin)
      .send({ email: 'email_invalido', password: '123' }); // allowlist-secret

    expect(response.statusCode).toBe(400);
    expect(response.headers['access-control-allow-origin']).toBe(previewOrigin);
    expect(response.body.message).not.toContain('CORS');
  });

  it('should allow same-origin requests when Origin matches Host / x-forwarded-host', async () => {
    const customPreviewOrigin = 'https://custom-preview-url.vercel.app';
    const response = await request(app)
      .post('/api/auth/signup')
      .set('Origin', customPreviewOrigin)
      .set('x-forwarded-host', 'custom-preview-url.vercel.app')
      .send({ email: 'email_invalido', password: '123' }); // allowlist-secret

    expect(response.statusCode).toBe(400);
    expect(response.headers['access-control-allow-origin']).toBe(customPreviewOrigin);
  });

  it('should block untrusted cross-origin requests with 403', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://malicious-phishing-site.example.com');

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toContain('Origem não permitida por CORS');
  });

  it('should parse JSON body properly in POST requests', async () => {
    const response = await request(app)
      .post('/auth/signup')
      .send({ email: 'email_invalido', password: '123' }); // allowlist-secret
    expect(response.statusCode).toBe(400);
    expect(response.body.status).toBe('error');
  });
});
