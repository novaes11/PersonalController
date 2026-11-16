require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authRateLimiter, apiRateLimiter } = require('./src/middlewares/rateLimit.middleware');
const { renderAppPage } = require('./src/frontend/pages/renderAppPage');
const { renderLandingPage } = require('./src/frontend/pages/renderLandingPage');

const app = express();

// Middleware para normalização de rota serverless da Vercel
app.use((req, res, next) => {
  const headerPath =
    req.headers['x-rewritten-path'] ||
    (req.headers['x-matched-path'] &&
    !req.headers['x-matched-path'].startsWith('/api/index')
      ? req.headers['x-matched-path']
      : null);

  if (req.url.startsWith('/api/index.js') || headerPath || req.url.includes('__path=')) {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const queryPath = parsedUrl.searchParams.get('__path');
    parsedUrl.searchParams.delete('__path');

    const resolvedPath =
      queryPath ||
      headerPath ||
      parsedUrl.pathname.replace('/api/index.js', '') ||
      '/';

    const normalizedPath = '/' + resolvedPath.replace(/^\/+/, '');
    const remainingQuery = parsedUrl.searchParams.toString();
    req.url = normalizedPath + (remainingQuery ? `?${remainingQuery}` : '');
    req.originalUrl = req.url;
  }
  next();
});

// Suporte a CORS (incluindo Same-Origin, Vercel Preview Deployments e origens configuradas)
function isOriginAllowed(origin, req) {
  if (!origin) return true;

  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
    return true;
  }

  const vercelEnvHosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ]
    .filter(Boolean)
    .map(h => h.replace(/^https?:\/\//, '').trim().toLowerCase());

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch (_) {
    return false;
  }

  const originHost = parsedOrigin.host.toLowerCase();
  const originHostname = parsedOrigin.hostname.toLowerCase();

  // 1. Permite requisições Same-Origin (quando o frontend servido pelo próprio app chama /api no mesmo host)
  const forwardedHost = req?.headers?.['x-forwarded-host'];
  const rawReqHost = (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0] : '') || req?.headers?.host || '';
  const reqHost = rawReqHost.trim().toLowerCase();
  if (reqHost && originHost === reqHost) {
    return true;
  }

  // 2. Permite URLs automáticas de deploy/preview da Vercel via variáveis de ambiente
  if (vercelEnvHosts.includes(originHost) || vercelEnvHosts.includes(originHostname)) {
    return true;
  }

  // 3. Permite subdomínios de Preview e Produção do projeto na Vercel (*.vercel.app)
  if (
    parsedOrigin.protocol === 'https:' &&
    (/^personal-?controller(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(originHostname) ||
      /^[a-z0-9-]+-novaes11[a-z0-9-]*\.vercel\.app$/i.test(originHostname))
  ) {
    return true;
  }

  // 4. Suporte a padrões com curinga em CORS_ALLOWED_ORIGINS (ex: https://*.vercel.app)
  for (const pattern of configuredOrigins) {
    if (pattern.includes('*')) {
      const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
      if (new RegExp(regexStr, 'i').test(origin)) {
        return true;
      }
    }
  }

  return false;
}

app.use(
  cors((req, callback) => {
    const origin = req.header('Origin');
    if (isOriginAllowed(origin, req)) {
      return callback(null, { origin: true, credentials: true });
    }
    const corsError = new Error('Origem não permitida por CORS');
    corsError.status = 403;
    return callback(corsError);
  })
);

// Parsing de JSON no corpo das requisições (limite de 8MB para suportar upload de PDF em Base64 de até 5MB - E07.T01)
app.use(express.json({ limit: '8mb' }));

// Roteador principal
const router = express.Router();

// Rota Visual da Aplicação SPA Mobile-First (E05.T04 & E05.T06)
router.get(['/dashboard', '/app', '/portfolio'], (req, res, next) => {
  if (
    req.path === '/portfolio' &&
    ((req.baseUrl && req.baseUrl.startsWith('/api')) ||
      (req.originalUrl && req.originalUrl.startsWith('/api')))
  ) {
    return next();
  }
  const activeTab = req.path === '/portfolio' ? 'portfolio' : 'overview';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderAppPage({ activeTab }));
});

// Rotas Visuais de Acesso (/login, /signup, /auth-view)
router.get(['/login', '/signup', '/auth-view'], apiRateLimiter, (req, res) => {
  const mode = req.path.includes('signup') ? 'signup' : 'login';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderLandingPage({ mode }));
});

// Rota Raiz: Serve a interface web de acesso para navegadores e preserva JSON para API
router.get('/', apiRateLimiter, (req, res) => {
  const isHtmlBrowserRequest = Boolean(
    req.headers.accept &&
    req.headers.accept.includes('text/html') &&
    !(req.baseUrl && req.baseUrl.startsWith('/api')) &&
    !(req.originalUrl && req.originalUrl.startsWith('/api'))
  );

  if (isHtmlBrowserRequest) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderLandingPage({ mode: 'login' }));
  }

  res.status(200).json({ status: "ok", service: "PersonalController API", timestamp: new Date().toISOString() });
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", "pipeline": "running" });
});

// Sub-rotas da aplicação com proteção de Rate Limiting (SEC-05)
const categoriesRoutes = require('./src/routes/categories.routes');
const transactionsRoutes = require('./src/routes/transactions.routes');
const authRoutes = require('./src/routes/auth.routes');
const cronRoutes = require('./src/routes/cron.routes');
const portfolioRoutes = require('./src/routes/portfolio.routes');

router.use('/categories', apiRateLimiter, categoriesRoutes);
router.use('/transactions', apiRateLimiter, transactionsRoutes);
router.use('/auth', authRateLimiter, authRoutes);
router.use('/cron', cronRoutes);
router.use('/portfolio', apiRateLimiter, portfolioRoutes);

// Montagem do roteador na raiz e com prefixo /api para compatibilidade total
app.use('/', router);
app.use('/api', router);

// Middleware centralizado de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Erro interno do servidor'
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
