const { getSupabaseClient } = require('../lib/supabase');

/**
 * Middleware para proteger rotas autenticadas.
 * Valida o JWT enviado no cabeçalho Authorization com o Supabase Auth.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Token de autenticação ausente ou inválido. Formato esperado: Bearer <jwt>'
      });
    }

    const jwt = authHeader.slice(7).trim();
    if (!jwt) {
      return res.status(401).json({
        status: 'error',
        message: 'Token de autenticação não fornecido'
      });
    }

    const supabase = getSupabaseClient(req);
    const { data: { user }, error } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        message: 'Sessão expirada ou token inválido'
      });
    }

    req.user = user;
    req.userId = user.id;
    return next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao validar credenciais de autenticação'
    });
  }
}

/**
 * Middleware de Autorização (AuthZ) baseado em Roles (RBAC).
 * Exige que req.user esteja autenticado e contenha uma das roles permitidas.
 * @param {string|string[]} roles 
 */
function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Autenticação necessária para esta operação'
      });
    }

    const userRole = req.user.app_metadata?.role || req.user.user_metadata?.role || 'user';
    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'Acesso negado: permissões insuficientes para este recurso'
      });
    }

    return next();
  };
}

/**
 * Middleware opcional de autenticação.
 * Não bloqueia caso o token não exista, mas popula req.user se um JWT válido for enviado.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7).trim();
      if (jwt) {
        const supabase = getSupabaseClient(req);
        const { data: { user } } = await supabase.auth.getUser(jwt);
        if (user) {
          req.user = user;
          req.userId = user.id;
        }
      }
    }
    return next();
  } catch {
    return next();
  }
}

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth
};
