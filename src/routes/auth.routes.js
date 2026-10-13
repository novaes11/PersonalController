const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// POST /auth/signup - Cadastro de novo usuário
router.post('/signup', authController.signup);

// POST /auth/login - Autenticação com e-mail e senha
router.post('/login', authController.login);

// POST /auth/logout - Encerramento de sessão
router.post('/logout', authController.logout);

// GET /auth/me - Obter dados do usuário autenticado atual (requer Bearer token)
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
