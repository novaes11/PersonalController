/**
 * Middleware de Rate Limiting (SEC-05).
 * Protege endpoints críticos (/auth e /transactions) contra ataques de força bruta,
 * abuso de API (DDoS) e exaustão de cotas do banco de dados.
 */

const stores = new Set();

/**
 * Extrai o identificador de cliente (IP) considerando proxies reversos (Vercel / Cloudflare).
 * @param {import('express').Request} req
 */
function resolveClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown-ip';
}

/**
 * Cria uma instância de middleware de Rate Limit com janela fixa/deslizante em memória.
 * @param {object} [options]
 * @param {number|Function} [options.windowMs=900000] Janela de tempo em ms (default: 15 minutos)
 * @param {number|Function} [options.max=100] Máximo de requisições por janela
 * @param {string} [options.keyPrefix='global'] Prefixo de isolamento do contador
 * @param {string} [options.message] Mensagem retornada quando o limite é excedido (HTTP 429)
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyPrefix = 'global',
    message = 'Muitas requisições originadas deste IP. Por favor, aguarde antes de tentar novamente.'
  } = options;

  const hits = new Map();
  stores.add(hits);

  return function rateLimitMiddleware(req, res, next) {
    const resolvedWindowMs = typeof windowMs === 'function' ? windowMs() : windowMs;
    const resolvedMax = typeof max === 'function' ? max() : max;

    const now = Date.now();
    const clientIp = resolveClientIp(req);
    const key = `${keyPrefix}:${clientIp}`;

    let entry = hits.get(key);
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + resolvedWindowMs
      };
      hits.set(key, entry);
    }

    entry.count += 1;

    const remaining = Math.max(0, resolvedMax - entry.count);
    const resetSeconds = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));

    res.setHeader('X-RateLimit-Limit', String(resolvedMax));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(resetSeconds));

    if (entry.count > resolvedMax) {
      res.setHeader('Retry-After', String(resetSeconds));
      return res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retry_after_seconds: resetSeconds
      });
    }

    return next();
  };
}

/**
 * Rate Limiter estrito para rotas de Autenticação (/auth).
 * Mitiga ataques de força bruta e credential stuffing.
 */
const authRateLimiter = createRateLimiter({
  keyPrefix: 'auth',
  windowMs: () => parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: () => parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 20,
  message: 'Limite de tentativas de autenticação excedido. Tente novamente em alguns minutos.'
});

/**
 * Rate Limiter padrão para rotas transacionais (/transactions, /categories, /portfolio).
 * Mitiga abuso de API (DDoS) e estouro de cota do Free Tier.
 */
const apiRateLimiter = createRateLimiter({
  keyPrefix: 'api',
  windowMs: () => parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: () => parseInt(process.env.RATE_LIMIT_API_MAX, 10) || 100,
  message: 'Limite de requisições da API excedido. Tente novamente em instantes.'
});

/**
 * Limpa todos os contadores de Rate Limit em memória (útil para suítes de testes).
 */
function resetRateLimitStores() {
  for (const store of stores) {
    store.clear();
  }
}

module.exports = {
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  resetRateLimitStores,
  resolveClientIp
};
