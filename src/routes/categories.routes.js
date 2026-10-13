const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Todas as rotas de categorias exigem autenticação JWT (SEC-03)
router.use(requireAuth);

// GET /categories - Listar categorias acessíveis (sistema + customizadas do usuário)
router.get('/', categoriesController.listCategories);

// GET /categories/:id - Obter categoria por ID
router.get('/:id', categoriesController.getCategoryById);

// POST /categories - Criar categoria customizada para o usuário autenticado
router.post('/', categoriesController.createCategory);

// PUT /categories/:id - Atualizar categoria customizada do usuário autenticado
router.put('/:id', categoriesController.updateCategory);

// DELETE /categories/:id - Excluir categoria customizada do usuário autenticado
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;
