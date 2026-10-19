const { getSupabaseClient } = require('../lib/supabase');
const {
  getQuotesForAssets,
  getCachedQuote,
  setCachedQuote,
  normalizeTicker
} = require('../services/quotes.service');
const {
  consolidatedQuerySchema,
  sanitizeConsolidatedPortfolio
} = require('../schemas/portfolio.schema');

function formatZodIssues(issues) {
  return issues.map(i => {
    if (i.code === 'unrecognized_keys') {
      return {
        field: i.keys.join(', '),
        message: `Parâmetros não permitidos (Mass Assignment detectado): ${i.keys.join(', ')}`
      };
    }
    return { field: i.path.join('.'), message: i.message };
  });
}

function round2(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/**
 * GET /portfolio/consolidated
 * Retorna a posição consolidada do portfólio do usuário autenticado,
 * multiplicando a quantidade custodiada pela cotação mais recente em cache.
 */
async function getConsolidatedPortfolio(req, res) {
  try {
    const queryValidation = consolidatedQuerySchema.safeParse(req.query || {});
    if (!queryValidation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Parâmetros de consulta inválidos',
        errors: formatZodIssues(queryValidation.error.issues)
      });
    }

    const forceRefresh = queryValidation.data.refresh === 'true';
    const supabase = getSupabaseClient(req);

    // AuthZ: Filtra estritamente pelas posições do usuário autenticado (req.user.id)
    const { data: rawPositions, error } = await supabase
      .from('portfolio_positions')
      .select('id, user_id, asset_id, quantity, average_price, notes, updated_at, asset:assets(id, ticker, name, asset_type, current_price, currency, last_price_update)')
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    const positionsList = rawPositions || [];

    if (positionsList.length === 0) {
      return res.status(200).json({
        status: 'ok',
        data: sanitizeConsolidatedPortfolio({
          user_id: req.user.id,
          total_portfolio_value: 0,
          total_invested_value: 0,
          total_profit_loss: 0,
          total_profit_loss_percentage: 0,
          positions_count: 0,
          allocation_by_type: {},
          positions: [],
          consolidated_at: new Date().toISOString()
        })
      });
    }

    // Resolve cotações para cada ativo da carteira priorizando o cache em memória e banco
    const resolvedQuotes = {};
    const assetsToFetchRemotely = [];

    for (const pos of positionsList) {
      const asset = pos.asset;
      if (!asset || !asset.ticker) continue;

      const ticker = normalizeTicker(asset.ticker);

      if (forceRefresh) {
        assetsToFetchRemotely.push(asset);
        continue;
      }

      // 1. Verifica cache em memória (TTL 30 min)
      const memQuote = getCachedQuote(ticker);
      if (memQuote) {
        resolvedQuotes[ticker] = {
          price: memQuote.price,
          source: 'cache',
          timestamp: memQuote.timestamp
        };
        continue;
      }

      // 2. Verifica cotação persistida no banco pelo Worker (assets.current_price)
      if (asset.current_price !== null && asset.current_price !== undefined) {
        const dbPrice = parseFloat(asset.current_price);
        setCachedQuote(ticker, dbPrice);
        resolvedQuotes[ticker] = {
          price: dbPrice,
          source: 'database_cache',
          timestamp: asset.last_price_update || new Date().toISOString()
        };
        continue;
      }

      // 3. Caso não haja cotação nem em memória nem no banco, busca nos provedores externos
      assetsToFetchRemotely.push(asset);
    }

    if (assetsToFetchRemotely.length > 0) {
      const remoteQuotes = await getQuotesForAssets(assetsToFetchRemotely, forceRefresh);
      for (const [ticker, quoteData] of Object.entries(remoteQuotes)) {
        if (quoteData) {
          resolvedQuotes[ticker] = quoteData;
        }
      }
    }

    // Calcula os valores individuais de cada posição
    const enrichedPositions = positionsList
      .filter(pos => pos.asset && pos.asset.ticker)
      .map(pos => {
        const asset = pos.asset;
        const ticker = normalizeTicker(asset.ticker);
        const quoteInfo = resolvedQuotes[ticker];

        const quantity = parseFloat(pos.quantity) || 0;
        const averagePrice = parseFloat(pos.average_price) || 0;
        const currentPrice = quoteInfo?.price !== undefined && quoteInfo?.price !== null
          ? parseFloat(quoteInfo.price)
          : (parseFloat(asset.current_price) || 0);

        const investedValue = round2(quantity * averagePrice);
        const currentValue = round2(quantity * currentPrice);
        const profitLoss = round2(currentValue - investedValue);
        const profitLossPercentage = investedValue > 0
          ? round2(((currentValue - investedValue) / investedValue) * 100)
          : 0;

        return {
          id: pos.id,
          asset_id: pos.asset_id,
          ticker,
          name: asset.name ?? null,
          asset_type: asset.asset_type,
          currency: asset.currency || 'BRL',
          quantity,
          average_price: averagePrice,
          current_price: currentPrice,
          invested_value: investedValue,
          current_value: currentValue,
          total_value: currentValue,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage,
          allocation_percentage: 0, // Preenchido após soma total
          quote_source: quoteInfo?.source || 'database_cache',
          last_price_update: asset.last_price_update || quoteInfo?.timestamp || null
        };
      });

    // Calcula totais consolidados da carteira
    const totalPortfolioValue = round2(
      enrichedPositions.reduce((sum, item) => sum + item.current_value, 0)
    );
    const totalInvestedValue = round2(
      enrichedPositions.reduce((sum, item) => sum + item.invested_value, 0)
    );
    const totalProfitLoss = round2(totalPortfolioValue - totalInvestedValue);
    const totalProfitLossPercentage = totalInvestedValue > 0
      ? round2(((totalPortfolioValue - totalInvestedValue) / totalInvestedValue) * 100)
      : 0;

    // Calcula percentual de alocação por posição e agrupamento por classe de ativo
    const allocationByType = {};

    for (const item of enrichedPositions) {
      item.allocation_percentage = totalPortfolioValue > 0
        ? round2((item.current_value / totalPortfolioValue) * 100)
        : 0;

      const type = item.asset_type || 'OTHER';
      if (!allocationByType[type]) {
        allocationByType[type] = { total_value: 0, percentage: 0 };
      }
      allocationByType[type].total_value = round2(
        allocationByType[type].total_value + item.current_value
      );
    }

    for (const type of Object.keys(allocationByType)) {
      allocationByType[type].percentage = totalPortfolioValue > 0
        ? round2((allocationByType[type].total_value / totalPortfolioValue) * 100)
        : 0;
    }

    // Ordena posições da maior participação financeira para a menor
    enrichedPositions.sort((a, b) => b.current_value - a.current_value);

    return res.status(200).json({
      status: 'ok',
      data: sanitizeConsolidatedPortfolio({
        user_id: req.user.id,
        total_portfolio_value: totalPortfolioValue,
        total_invested_value: totalInvestedValue,
        total_profit_loss: totalProfitLoss,
        total_profit_loss_percentage: totalProfitLossPercentage,
        positions_count: enrichedPositions.length,
        allocation_by_type: allocationByType,
        positions: enrichedPositions,
        consolidated_at: new Date().toISOString()
      })
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

module.exports = {
  getConsolidatedPortfolio
};
