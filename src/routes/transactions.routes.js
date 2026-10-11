const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions.controller');

// GET /transactions - Listar transações (com filtros de data, categoria e paginação)
router.get('/', transactionsController.listTransactions);

// GET /transactions/:id - Obter transação por ID
router.get('/:id', transactionsController.getTransactionById);

// POST /transactions - Criar transação
router.post('/', transactionsController.createTransaction);

// PUT /transactions/:id - Atualizar transação existente
router.put('/:id', transactionsController.updateTransaction);

// DELETE /transactions/:id - Excluir transação
router.delete('/:id', transactionsController.deleteTransaction);

module.exports = router;
