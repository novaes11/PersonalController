const { getSupabaseAdminClient } = require('../lib/supabase');
const { getQuotesForAssets } = require('../services/quotes.service');

/**
 * Worker assíncrono para atualização de cotações de mercado.
 * Atualiza o preço atual (current_price) e timestamp de última cotação (last_price_update)
 * de todos os ativos registrados na tabela public.assets.
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 */
async function runQuotesWorker(options = {}) {
  const startTime = Date.now();
  const supabase = getSupabaseAdminClient();

  // 1. Busca ativos cadastrados no catálogo global
  const { data: assets, error } = await supabase
    .from('assets')
    .select('id, ticker, name, asset_type, current_price, currency, last_price_update');

  if (error) {
    throw new Error(`Erro ao consultar ativos no banco de dados: ${error.message}`);
  }

  if (!assets || assets.length === 0) {
    return {
      status: 'ok',
      message: 'Nenhum ativo encontrado para atualização',
      total: 0,
      updated: 0,
      failed: 0,
      duration_ms: Date.now() - startTime,
      results: []
    };
  }

  // 2. Consulta cotações atualizadas nos provedores (com cache e fallback)
  const quotesMap = await getQuotesForAssets(assets, options.forceRefresh);

  let updatedCount = 0;
  let failedCount = 0;
  const results = [];

  // 3. Atualiza os ativos no Supabase
  for (const asset of assets) {
    const quote = quotesMap[asset.ticker.toUpperCase()];

    if (quote && quote.price !== null && quote.price !== undefined) {
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          current_price: quote.price,
          last_price_update: quote.timestamp
        })
        .eq('id', asset.id);

      if (updateError) {
        failedCount++;
        results.push({
          ticker: asset.ticker,
          status: 'error',
          error: updateError.message
        });
      } else {
        updatedCount++;
        results.push({
          ticker: asset.ticker,
          price: quote.price,
          source: quote.source,
          status: 'updated'
        });
      }
    } else {
      failedCount++;
      results.push({
        ticker: asset.ticker,
        status: 'skipped',
        reason: 'Cotação não disponível nos provedores'
      });
    }
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    total: assets.length,
    updated: updatedCount,
    failed: failedCount,
    duration_ms: Date.now() - startTime,
    results
  };
}

module.exports = {
  runQuotesWorker
};
