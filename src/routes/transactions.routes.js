const express = require('express');
const router = express.Router();
const transactionsController = require('../controllers/transactions.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Todas as rotas de transações exigem autenticação JWT (SEC-03)
router.use(requireAuth);

// GET /transactions - Listar transações do usuário autenticado (com filtros de data, categoria e paginação)
router.get('/', transactionsController.listTransactions);

// POST /transactions/parse-pdf - Extrair e pré-classificar transações de extrato/fatura PDF (E07.T01)
router.post('/parse-pdf', transactionsController.parsePdfTransactions);

// POST /transactions/batch - Confirmar e importar lote de transações extraídas (E07.T01)
router.post('/batch', transactionsController.createBatchTransactions);

// GET /transactions/:id - Obter transação por ID do usuário autenticado
router.get('/:id', transactionsController.getTransactionById);

// POST /transactions - Criar transação para o usuário autenticado
router.post('/', transactionsController.createTransaction);

// PUT /transactions/:id - Atualizar transação existente do usuário autenticado
router.put('/:id', transactionsController.updateTransaction);

// DELETE /transactions/:id - Excluir transação do usuário autenticado
router.delete('/:id', transactionsController.deleteTransaction);

module.exports = router;
