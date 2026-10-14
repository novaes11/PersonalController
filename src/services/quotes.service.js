/**
 * Serviço de Cotações de Mercado (Quotes Service)
 * Responsável por consultar APIs financeiras (AwesomeAPI e Brapi), aplicar cache em memória
 * e fornecer cotações resilientes para Ações B3, FIIs, Criptoativos e Câmbio.
 */

const memoryCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

/**
 * Mapeia tickers para formato das APIs externas.
 */
function normalizeTicker(ticker) {
  return ticker.trim().toUpperCase();
}

/**
 * Consulta cotações de moedas e criptos na AwesomeAPI.
 * @param {string[]} tickers Ex: ['USD/BRL', 'EUR/BRL', 'BTC', 'ETH']
 */
async function fetchAwesomeApiQuotes(tickers = []) {
  const mapping = {
    'USD/BRL': 'USD-BRL',
    'USDBRL': 'USD-BRL',
    'EUR/BRL': 'EUR-BRL',
    'EURBRL': 'EUR-BRL',
    'BTC': 'BTC-BRL',
    'BTC/BRL': 'BTC-BRL',
    'ETH': 'ETH-BRL',
    'ETH/BRL': 'ETH-BRL'
  };

  const queryPairs = [];
  const pairToTicker = {};

  for (const t of tickers) {
    const pair = mapping[t];
    if (pair) {
      queryPairs.push(pair);
      const cleanKey = pair.replace('-', '');
      pairToTicker[cleanKey] = t;
    }
  }

  if (queryPairs.length === 0) return {};

  try {
    const url = `https://economia.awesomeapi.com.br/last/${queryPairs.join(',')}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      console.warn(`[QuotesService] AwesomeAPI retornou status HTTP ${res.status}`);
      return {};
    }
    const data = await res.json();
    const result = {};

    for (const [key, quote] of Object.entries(data)) {
      const origTicker = pairToTicker[key];
      if (origTicker && quote.bid) {
        result[origTicker] = parseFloat(quote.bid);
      }
    }
    return result;
  } catch (err) {
    console.warn(`[QuotesService] Falha ao consultar AwesomeAPI: ${err.message}`);
    return {};
  }
}

/**
 * Consulta cotações de ações e FIIs na Brapi.
 * @param {string[]} tickers Ex: ['PETR4', 'VALE3', 'HGLG11']
 */
async function fetchBrapiQuotes(tickers = []) {
  if (tickers.length === 0) return {};

  try {
    const token = process.env.BRAPI_TOKEN; // allowlist-secret
    const tokenQuery = token ? `?token=${token}` : '';
    const url = `https://brapi.dev/api/quote/${tickers.join(',')}${tokenQuery}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) {
      console.warn(`[QuotesService] Brapi retornou status HTTP ${res.status}`);
      return {};
    }
    const data = await res.json();
    const result = {};

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        if (item.symbol && item.regularMarketPrice !== undefined) {
          result[item.symbol.toUpperCase()] = parseFloat(item.regularMarketPrice);
        }
      }
    }
    return result;
  } catch (err) {
    console.warn(`[QuotesService] Falha ao consultar Brapi: ${err.message}`);
    return {};
  }
}

/**
 * Recupera cotações para uma lista de ativos, aproveitando cache em memória e consultando provedores.
 * @param {Array<{ ticker: string, asset_type: string, current_price?: number }>} assets
 * @param {boolean} [forceRefresh=false]
 */
async function getQuotesForAssets(assets = [], forceRefresh = false) {
  const now = Date.now();
  const quotes = {};
  const toFetchAwesome = [];
  const toFetchBrapi = [];

  for (const asset of assets) {
    const ticker = normalizeTicker(asset.ticker);
    const cached = memoryCache.get(ticker);

    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      quotes[ticker] = {
        price: cached.price,
        source: 'cache',
        timestamp: new Date(cached.timestamp).toISOString()
      };
      continue;
    }

    if (['CURRENCY', 'CRYPTO'].includes(asset.asset_type) || ['USD/BRL', 'EUR/BRL', 'BTC', 'ETH'].includes(ticker)) {
      toFetchAwesome.push(ticker);
    } else {
      toFetchBrapi.push(ticker);
    }
  }

  // Executa chamadas remotas simultâneas caso haja ativos para buscar
  const [awesomeResults, brapiResults] = await Promise.all([
    fetchAwesomeApiQuotes(toFetchAwesome),
    fetchBrapiQuotes(toFetchBrapi)
  ]);

  const freshQuotes = { ...awesomeResults, ...brapiResults };

  for (const asset of assets) {
    const ticker = normalizeTicker(asset.ticker);
    if (quotes[ticker]) continue; // já preenchido pelo cache

    if (freshQuotes[ticker] !== undefined && freshQuotes[ticker] !== null) {
      const price = freshQuotes[ticker];
      memoryCache.set(ticker, { price, timestamp: now });
      quotes[ticker] = {
        price,
        source: 'remote',
        timestamp: new Date(now).toISOString()
      };
    } else if (asset.current_price !== undefined && asset.current_price !== null) {
      // Fallback resiliente: mantém a última cotação conhecida se a API falhar
      quotes[ticker] = {
        price: parseFloat(asset.current_price),
        source: 'fallback_last_price',
        timestamp: new Date(now).toISOString()
      };
    } else {
      quotes[ticker] = null;
    }
  }

  return quotes;
}

/**
 * Limpa o cache em memória (útil para testes ou reinicialização)
 */
function clearQuotesCache() {
  memoryCache.clear();
}

module.exports = {
  getQuotesForAssets,
  fetchAwesomeApiQuotes,
  fetchBrapiQuotes,
  clearQuotesCache,
  normalizeTicker
};
