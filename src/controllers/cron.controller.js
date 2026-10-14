const { runQuotesWorker } = require('../workers/quotes.worker');

/**
 * Controller para disparo de rotas agendadas (Cron Jobs).
 */
async function triggerQuotesUpdate(req, res) {
  try {
    const cronSecret = process.env.CRON_SECRET; // allowlist-secret
    const authHeader = req.headers.authorization;

    // Se CRON_SECRET estiver configurado no ambiente, valida o segredo de autenticação
    if (cronSecret) {
      const expected = `Bearer ${cronSecret}`;
      if (!authHeader || authHeader !== expected) {
        return res.status(401).json({
          status: 'error',
          message: 'Acesso não autorizado ao job agendado de cotações'
        });
      }
    }

    const forceRefresh = req.query.force === 'true' || req.body?.force === true;
    const summary = await runQuotesWorker({ forceRefresh });

    return res.status(200).json(summary);
  } catch (err) {
    console.error('[CronController] Erro na execução do job de cotações:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Erro interno na execução do worker de cotações'
    });
  }
}

module.exports = {
  triggerQuotesUpdate
};
