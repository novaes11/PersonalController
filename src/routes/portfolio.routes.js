const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolio.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Todas as rotas de portfólio exigem autenticação JWT (SEC-03)
router.use(requireAuth);

// GET /portfolio/consolidated - Retorna posição consolidada do usuário com cotações em cache (E03.T03)
router.get('/consolidated', portfolioController.getConsolidatedPortfolio);

module.exports = router;
