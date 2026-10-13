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
    return next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao validar credenciais de autenticação'
    });
  }
}

module.exports = {
  requireAuth
};
