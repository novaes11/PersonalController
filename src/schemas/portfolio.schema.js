const { z } = require('zod');

// Schema estrito para parâmetros de consulta do endpoint consolidado (SEC-04)
const consolidatedQuerySchema = z.object({
  refresh: z.enum(['true', 'false']).optional()
}).strict({
  message: 'Parâmetros de consulta não permitidos (Mass Assignment bloqueado)'
});

/**
 * Sanitiza um item de posição consolidada para garantir contrato JSON limpo.
 */
function sanitizePortfolioPosition(pos) {
  if (!pos) return null;
  return {
    id: pos.id,
    asset_id: pos.asset_id,
    ticker: pos.ticker,
    name: pos.name ?? null,
    asset_type: pos.asset_type,
    currency: pos.currency || 'BRL',
    quantity: pos.quantity,
    average_price: pos.average_price,
    current_price: pos.current_price,
    invested_value: pos.invested_value,
    current_value: pos.current_value,
    total_value: pos.total_value,
    profit_loss: pos.profit_loss,
    profit_loss_percentage: pos.profit_loss_percentage,
    allocation_percentage: pos.allocation_percentage,
    quote_source: pos.quote_source,
    last_price_update: pos.last_price_update ?? null
  };
}

/**
 * Sanitiza o envelope de resposta do portfólio consolidado.
 */
function sanitizeConsolidatedPortfolio(portfolio) {
  if (!portfolio) return null;
  return {
    user_id: portfolio.user_id,
    total_portfolio_value: portfolio.total_portfolio_value,
    total_invested_value: portfolio.total_invested_value,
    total_profit_loss: portfolio.total_profit_loss,
    total_profit_loss_percentage: portfolio.total_profit_loss_percentage,
    positions_count: portfolio.positions_count,
    allocation_by_type: portfolio.allocation_by_type || {},
    positions: Array.isArray(portfolio.positions)
      ? portfolio.positions.map(sanitizePortfolioPosition)
      : [],
    consolidated_at: portfolio.consolidated_at
  };
}

module.exports = {
  consolidatedQuerySchema,
  sanitizePortfolioPosition,
  sanitizeConsolidatedPortfolio
};
