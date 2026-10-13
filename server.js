require('dotenv').config();
const express = require('express');
const cors = require('cors');

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

router.get('/', (req, res) => {
  res.status(200).json({ status: "ok", service: "PersonalController API", timestamp: new Date().toISOString() });
});

router.get('/health', (req, res) => {
  res.status(200).json({ status: "ok", "pipeline": "running" });
});

// Sub-rotas da aplicação
const categoriesRoutes = require('./src/routes/categories.routes');
const transactionsRoutes = require('./src/routes/transactions.routes');
const authRoutes = require('./src/routes/auth.routes');

router.use('/categories', categoriesRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/auth', authRoutes);

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
