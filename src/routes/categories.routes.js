const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');

// GET /categories - Listar categorias (com suporte a filtro ?type=INCOME|EXPENSE)
router.get('/', categoriesController.listCategories);

// GET /categories/:id - Obter categoria por ID
router.get('/:id', categoriesController.getCategoryById);

// POST /categories - Criar categoria
router.post('/', categoriesController.createCategory);

// PUT /categories/:id - Atualizar categoria existente
router.put('/:id', categoriesController.updateCategory);

// DELETE /categories/:id - Excluir categoria
router.delete('/:id', categoriesController.deleteCategory);

module.exports = router;
