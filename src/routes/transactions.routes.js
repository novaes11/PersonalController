const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Todas as rotas de transações exigem autenticação JWT (SEC-03)
router.use(requireAuth);

// GET /transactions - Listar transações do usuário autenticado (com filtros de data, categoria e paginação)
router.get('/', transactionsController.listTransactions);

// GET /transactions/:id - Obter transação por ID do usuário autenticado
router.get('/:id', transactionsController.getTransactionById);

// POST /transactions - Criar transação para o usuário autenticado
router.post('/', transactionsController.createTransaction);

// PUT /transactions/:id - Atualizar transação existente do usuário autenticado
router.put('/:id', transactionsController.updateTransaction);

// DELETE /transactions/:id - Excluir transação do usuário autenticado
router.delete('/:id', transactionsController.deleteTransaction);

module.exports = router;
