const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cron.controller');

// GET /cron/quotes e POST /cron/quotes - Executa atualização periódica de cotações de mercado
router.get('/quotes', cronController.triggerQuotesUpdate);
router.post('/quotes', cronController.triggerQuotesUpdate);

module.exports = router;
