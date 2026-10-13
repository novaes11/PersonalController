const { requireAuth, requireRole, optionalAuth } = require('../src/middlewares/auth.middleware');

describe('Middleware de Autenticação e Autorização (SEC-03)', () => {
  describe('requireAuth', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      next = jest.fn();
    });

    it('deve retornar 401 quando o cabeçalho Authorization estiver ausente', async () => {
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('ausente ou inválido')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando o cabeçalho não começar com "Bearer "', async () => {
      req.headers.authorization = 'Basic dXNlcjpwYXNz';
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando o token após Bearer estiver em branco', async () => {
      req.headers.authorization = 'Bearer   ';
      await requireAuth(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('não fornecido')
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole (RBAC AuthZ)', () => {
    let req, res, next;

    beforeEach(() => {
      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      next = jest.fn();
    });

    it('deve retornar 401 se req.user não existir', () => {
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('deve retornar 403 se o usuário não tiver a role exigida', () => {
      req.user = {
        id: '11111111-1111-1111-1111-111111111111',
        app_metadata: { role: 'user' }
      };
      const middleware = requireRole('admin');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: expect.stringContaining('Acesso negado: permissões insuficientes')
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('deve chamar next() se o usuário tiver a role permitida', () => {
      req.user = {
        id: '11111111-1111-1111-1111-111111111111',
        app_metadata: { role: 'admin' }
      };
      const middleware = requireRole(['admin', 'superadmin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    let req, res, next;

    beforeEach(() => {
      req = { headers: {} };
      res = {};
      next = jest.fn();
    });

    it('deve chamar next() e prosseguir normalmente se não houver cabeçalho Authorization', async () => {
      await optionalAuth(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });
  });
});
