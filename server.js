require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { authRateLimiter, apiRateLimiter } = require('./src/middlewares/rateLimit.middleware');
const { renderAppPage } = require('./src/frontend/pages/renderAppPage');
const { renderLandingPage } = require('./src/frontend/pages/renderLandingPage');

const app = express();

// Middleware para normalização de rota serverless da Vercel
app.use((req, res, next) => {
  if (req.url.startsWith('/api/index.js')) {
    req.url = req.url.replace('/api/index.js', '') || '/';
  }
  next();
});

// Suporte a CORS
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('Origem não permitida por CORS'));
  },
  credentials: true
}));

// Parsing de JSON no corpo das requisições
app.use(express.json());

// Roteador principal
const router = express.Router();

// Rota Visual da Aplicação SPA Mobile-First (E05.T04)
router.get(['/dashboard', '/app'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(renderAppPage());
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
