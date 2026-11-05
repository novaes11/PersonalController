/**
 * Cliente HTTP de Frontend para o domínio de Portfólio Consolidado (E04.T04 & E05.T06).
 * Consome GET /api/portfolio/consolidated com autenticação Bearer JWT.
 */

/**
 * Busca a posição consolidada do portfólio do usuário autenticado.
 * @param {object} [options]
 * @param {string} [options.token] JWT do usuário autenticado
 * @param {string} [options.baseUrl='/api']
 * @param {boolean} [options.refresh=false] Se true, solicita atualização forçada de cotações
 * @param {Function} [options.fetchImpl=global.fetch]
 */
async function fetchConsolidatedPortfolio(options = {}) {
  const {
    token,
    baseUrl = '/api',
    refresh = false,
    fetchImpl = global.fetch
  } = options;

  const headers = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const query = refresh ? '?refresh=true' : '';
  const response = await fetchImpl(`${baseUrl}/portfolio/consolidated${query}`, {
    method: 'GET',
    headers
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Falha ao carregar portfólio consolidado (HTTP ${response.status})`);
    err.status = response.status;
    throw err;
  }

  return body.data;
}

/**
 * Dispara a sincronização forçada de cotações de mercado (?refresh=true)
 * no endpoint GET /api/portfolio/consolidated (E05.T06).
 * @param {object} [options]
 * @param {string} [options.token] JWT do usuário autenticado
 * @param {string} [options.baseUrl='/api']
 * @param {Function} [options.fetchImpl=global.fetch]
 */
async function syncPortfolioQuotes(options = {}) {
  return fetchConsolidatedPortfolio({
    ...options,
    refresh: true
  });
}

module.exports = {
  fetchConsolidatedPortfolio,
  syncPortfolioQuotes
};
