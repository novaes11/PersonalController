const request = require('supertest');

const mockUser = {
  id: '00000000-1111-2222-3333-444444444444',
  email: 'usuario.teste@exemplo.com',
  created_at: '2026-10-12T00:00:00.000Z',
  app_metadata: { provider: 'email' },
  user_metadata: {}
};

jest.mock('../src/lib/supabase', () => {
  return {
    getSupabaseClient: jest.fn(() => ({
      auth: {
        signUp: jest.fn(async ({ email, password }) => {
          if (email === 'usuario.duplicado@exemplo.com') {
            return { data: { user: null, session: null }, error: { message: 'Usuário já cadastrado' } };
          }
          return {
            data: {
              user: { ...mockUser, email },
              session: { access_token: 'mock_jwt_access_123', expires_at: 1791800000 } // allowlist-secret
            },
            error: null
          };
        }),
        signInWithPassword: jest.fn(async ({ email, password }) => {
          if (password === 'senha_errada') {
            return { data: { user: null, session: null }, error: { message: 'Credenciais inválidas' } };
          }
          return {
            data: {
              user: mockUser,
              session: { access_token: 'mock_jwt_access_valid', expires_at: 1791800000, token_type: 'bearer' } // allowlist-secret
            },
            error: null
          };
        }),
        signOut: jest.fn(async () => {
          return { error: null };
        }),
        getUser: jest.fn(async (jwt) => {
          if (jwt === 'token_invalido') {
            return { data: { user: null }, error: { message: 'Invalid JWT' } };
          }
          return { data: { user: mockUser }, error: null };
        })
      },
      from: jest.fn(() => ({
        upsert: jest.fn().mockResolvedValue({ data: null, error: null })
      }))
    })),
    supabase: {}
  };
});

const app = require('../server');

describe('Auth Provider API - /auth', () => {
  describe('POST /auth/signup', () => {
    it('deve cadastrar um novo usuário com sucesso e retornar 201', async () => {
      const response = await request(app).post('/auth/signup').send({
        email: 'novo.usuario@exemplo.com',
        password: 'senhaSegura123'
      });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('novo.usuario@exemplo.com');
      expect(response.body).toHaveProperty('session');
    });

    it('deve retornar 400 se o email for inválido', async () => {
      const response = await request(app).post('/auth/signup').send({
        email: 'email-invalido-sem-arroba',
        password: 'senhaSegura123'
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('error');
      expect(Array.isArray(response.body.errors)).toBe(true);
      const emailErr = response.body.errors.find(e => e.field === 'email');
      expect(emailErr).toBeDefined();
    });

    it('deve retornar 400 se a senha tiver menos de 6 caracteres', async () => {
      const response = await request(app).post('/auth/signup').send({
        email: 'teste@exemplo.com',
        password: '123'
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.status).toBe('error');
      const passErr = response.body.errors.find(e => e.field === 'password');
      expect(passErr.message).toContain('6 caracteres');
    });
  });

  describe('POST /auth/login', () => {
    it('deve autenticar com sucesso e retornar access_token com status 200', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'usuario.teste@exemplo.com',
        password: 'senhaCorreta123'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body.session).toHaveProperty('access_token');
      expect(response.body.user.email).toBe('usuario.teste@exemplo.com');
    });

    it('deve retornar 401 ao enviar credenciais incorretas', async () => {
      const response = await request(app).post('/auth/login').send({
        email: 'usuario.teste@exemplo.com',
        password: 'senha_errada'
      });

      expect(response.statusCode).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('inválidas');
    });
  });

  describe('GET /auth/me (Protected Route)', () => {
    it('deve retornar 200 e dados do usuário quando Bearer token for válido', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer token_valido_mock');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body.user.id).toBe(mockUser.id);
      expect(response.body.user.email).toBe(mockUser.email);
    });

    it('deve retornar 401 se o cabeçalho Authorization estiver ausente', async () => {
      const response = await request(app).get('/auth/me');

      expect(response.statusCode).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('ausente ou inválido');
    });

    it('deve retornar 401 se o token for rejeitado pelo Supabase', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer token_invalido');

      expect(response.statusCode).toBe(401);
      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /auth/logout', () => {
    it('deve encerrar sessão com status 200', async () => {
      const response = await request(app).post('/auth/logout');

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Compatibilidade Serverless /api/auth', () => {
    it('deve responder em /api/auth/me quando prefixado pela Vercel', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_valido_mock');

      expect(response.statusCode).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });
});
