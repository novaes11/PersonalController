/**
 * Serviço de Transição e Sincronização de Dados Reais da API Supabase vs Modo Demonstração (E06.T03).
 *
 * Responsabilidades:
 * 1. Detectar de forma determinística se a sessão ativa está em Modo Demonstração (`isDemo: true`)
 *    ou Autenticada com JWT real do Supabase (`isDemo: false` + `token`).
 * 2. No Modo Demonstração: fornecer e operar sobre o dataset simulado (`createDemoDataset()`) em memória.
 * 3. No Modo Autenticado: consumir os endpoints reais protegidos por RLS (`/api/categories`,
 *    `/api/transactions`, `/api/portfolio/consolidated`) enviando `Authorization: Bearer <token>`,
 *    incluindo semeadura automática de categorias padrão caso a conta recém-criada não possua categorias.
 */

const { createDemoDataset } = require('./authApi');
const {
  buildTransactionPayload,
  fetchCategories,
  submitTransaction,
  fetchTransactions,
  deleteTransactionById
} = require('./transactionsApi');
const { fetchConsolidatedPortfolio } = require('./portfolioApi');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_STARTER_CATEGORIES = [
  { name: 'Salário / Pró-Labore', type: 'INCOME' },
  { name: 'Renda Extra & Dividendos', type: 'INCOME' },
  { name: 'Moradia & Condomínio', type: 'EXPENSE' },
  { name: 'Alimentação & Mercado', type: 'EXPENSE' },
  { name: 'Transporte & Mobilidade', type: 'EXPENSE' },
  { name: 'Saúde & Bem-Estar', type: 'EXPENSE' },
  { name: 'Lazer & Assinaturas', type: 'EXPENSE' }
];

/**
 * Interpreta o objeto ou JSON de sessão (`pc_auth_session`) e define o modo de operação.
 * @param {object|string|null} rawSession
 * @returns {{ mode: 'demo'|'authenticated', isDemo: boolean, token: string|null, user: object }}
 */
function resolveAuthSessionMode(rawSession) {
  let parsed = rawSession;
  if (typeof rawSession === 'string') {
    try {
      parsed = JSON.parse(rawSession);
    } catch (err) {
      parsed = null;
    }
  }

  const token = parsed && typeof parsed.token === 'string' ? parsed.token.trim() : '';
  const isSimulatedToken = !token || token.startsWith('demo-token-') || token.startsWith('session-');
  const isDemoFlag = !parsed || parsed.isDemo === true || Boolean(parsed.user && parsed.user.isDemo === true);

  if (isDemoFlag || isSimulatedToken) {
    return {
      mode: 'demo',
      isDemo: true,
      token: null,
      user: {
        id: (parsed && parsed.user && parsed.user.id) || '00000000-0000-4000-8000-000000000001',
        email: (parsed && parsed.user && parsed.user.email) || 'demo@personalcontroller.app',
        isDemo: true
      }
    };
  }

  return {
    mode: 'authenticated',
    isDemo: false,
    token,
    user: {
      id: (parsed.user && parsed.user.id) || null,
      email: (parsed.user && parsed.user.email) || 'usuario@personalcontroller.app',
      isDemo: false
    }
  };
}

/**
 * Normaliza uma transação para garantir que `category` e `categories` estejam sempre preenchidos.
 */
function normalizeTransactionRecord(tx = {}, categoriesList = []) {
  const matchedCat =
    tx.category ||
    tx.categories ||
    categoriesList.find(c => c.id === tx.category_id) ||
    { id: tx.category_id || null, name: 'Geral', type: 'EXPENSE' };

  return {
    ...tx,
    amount: Number(tx.amount) || 0,
    category_id: tx.category_id ?? matchedCat.id ?? null,
    category: matchedCat,
    categories: matchedCat
  };
}

/**
 * Normaliza a estrutura de portfólio consolidado.
 */
function normalizePortfolioRecord(rawPortfolio = null) {
  if (!rawPortfolio || typeof rawPortfolio !== 'object') {
    return {
      total_portfolio_value: 0,
      total_invested_value: 0,
      total_profit_loss: 0,
      total_profit_loss_percentage: 0,
      positions_count: 0,
      allocation_by_type: {},
      positions: []
    };
  }

  const positions = Array.isArray(rawPortfolio.positions) ? rawPortfolio.positions : [];
  return {
    ...rawPortfolio,
    total_portfolio_value: Number(rawPortfolio.total_portfolio_value) || 0,
    total_invested_value: Number(rawPortfolio.total_invested_value ?? rawPortfolio.total_invested) || 0,
    total_profit_loss: Number(rawPortfolio.total_profit_loss) || 0,
    total_profit_loss_percentage: Number(rawPortfolio.total_profit_loss_percentage ?? rawPortfolio.total_profit_loss_pct) || 0,
    positions_count: typeof rawPortfolio.positions_count === 'number' ? rawPortfolio.positions_count : positions.length,
    allocation_by_type: rawPortfolio.allocation_by_type || {},
    positions
  };
}

/**
 * Cria uma categoria customizada via POST /api/categories respeitando createCategorySchema (.strict()).
 */
async function createUserCategory(categoryInput, options = {}) {
  const { token, baseUrl = '/api', fetchImpl = global.fetch } = options;

  const payload = {
    name: String(categoryInput.name || '').trim(),
    type: categoryInput.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
  };

  const response = await fetchImpl(`${baseUrl}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Falha ao criar categoria (HTTP ${response.status})`);
    err.status = response.status;
    throw err;
  }

  return body.data;
}

/**
 * Garante que um usuário recém-cadastrado possua categorias básicas caso o banco retorne lista vazia.
 */
async function ensureUserCategories(options = {}) {
  const {
    token,
    baseUrl = '/api',
    seedCategoriesIfEmpty = true,
    fetchImpl = global.fetch
  } = options;

  const existing = await fetchCategories({ token, baseUrl, fetchImpl });
  if (existing.length > 0 || !seedCategoriesIfEmpty) {
    return existing;
  }

  const created = [];
  for (const starter of DEFAULT_STARTER_CATEGORIES) {
    try {
      const cat = await createUserCategory(starter, { token, baseUrl, fetchImpl });
      if (cat) created.push(cat);
    } catch (err) {
      // Ignora falha individual de semeadura para não interromper o carregamento
    }
  }

  return created.length > 0 ? created : existing;
}

/**
 * Carrega o estado completo do Dashboard (categorias, transações e portfólio):
 * - Se `mode === 'demo'`: retorna imediatamente os dados de `createDemoDataset()`.
 * - Se `mode === 'authenticated'`: consulta `/api/categories`, `/api/transactions` e `/api/portfolio/consolidated`.
 */
async function loadDashboardState(options = {}) {
  const {
    session = null,
    baseUrl = '/api',
    refreshPortfolio = false,
    seedCategoriesIfEmpty = true,
    limit = 50,
    offset = 0,
    fetchImpl = global.fetch
  } = options;

  const resolved = resolveAuthSessionMode(session);

  if (resolved.mode === 'demo') {
    const demoData = createDemoDataset();
    return {
      mode: 'demo',
      isDemo: true,
      user: resolved.user,
      categories: demoData.categories,
      transactions: demoData.transactions.map(tx => normalizeTransactionRecord(tx, demoData.categories)),
      portfolio: normalizePortfolioRecord(demoData.portfolio)
    };
  }

  const [categories, txResponse, rawPortfolio] = await Promise.all([
    ensureUserCategories({
      token: resolved.token,
      baseUrl,
      seedCategoriesIfEmpty,
      fetchImpl
    }),
    fetchTransactions({
      token: resolved.token,
      baseUrl,
      limit,
      offset,
      fetchImpl
    }),
    fetchConsolidatedPortfolio({
      token: resolved.token,
      baseUrl,
      refresh: refreshPortfolio,
      fetchImpl
    }).catch(() => normalizePortfolioRecord(null))
  ]);

  const normalizedTransactions = (txResponse.data || []).map(tx =>
    normalizeTransactionRecord(tx, categories)
  );

  return {
    mode: 'authenticated',
    isDemo: false,
    user: resolved.user,
    categories,
    transactions: normalizedTransactions,
    portfolio: normalizePortfolioRecord(rawPortfolio)
  };
}

/**
 * Persiste uma nova transação:
 * - Em Modo Demo: adiciona apenas em memória.
 * - Em Modo Autenticado: envia POST /api/transactions com Bearer token e payload Zod estrito.
 */
async function persistTransaction(options = {}) {
  const {
    session = null,
    formValues = {},
    categories = [],
    baseUrl = '/api',
    fetchImpl = global.fetch
  } = options;

  const resolved = resolveAuthSessionMode(session);
  const rawCategoryId = formValues.category_id ? String(formValues.category_id).trim() : null;
  const validUuidCategoryId = rawCategoryId && UUID_REGEX.test(rawCategoryId) ? rawCategoryId : null;

  if (resolved.mode === 'demo') {
    const validation = buildTransactionPayload({
      ...formValues,
      category_id: validUuidCategoryId
    });
    if (!validation.valid) {
      const err = new Error(validation.errors[0].message);
      err.validationErrors = validation.errors;
      err.status = 400;
      throw err;
    }

    const matchedCat =
      categories.find(c => c.id === rawCategoryId) ||
      { id: rawCategoryId || null, name: 'Geral', type: 'EXPENSE' };

    const demoTx = normalizeTransactionRecord(
      {
        id: `tx-${Date.now()}`,
        ...validation.payload,
        category_id: rawCategoryId,
        category: matchedCat,
        categories: matchedCat
      },
      categories
    );

    return {
      mode: 'demo',
      data: demoTx
    };
  }

  const created = await submitTransaction(
    {
      ...formValues,
      category_id: validUuidCategoryId
    },
    {
      token: resolved.token,
      baseUrl,
      fetchImpl
    }
  );

  return {
    mode: 'authenticated',
    data: normalizeTransactionRecord(created, categories)
  };
}

/**
 * Remove uma transação:
 * - Em Modo Demo: remove localmente pelo ID.
 * - Em Modo Autenticado: envia DELETE /api/transactions/:id com Bearer token.
 */
async function removeTransaction(options = {}) {
  const {
    session = null,
    transactionId,
    baseUrl = '/api',
    fetchImpl = global.fetch
  } = options;

  const resolved = resolveAuthSessionMode(session);

  if (resolved.mode === 'demo') {
    if (!transactionId || !String(transactionId).trim()) {
      throw new Error('ID da transação é obrigatório para exclusão.');
    }
    return {
      mode: 'demo',
      deletedId: String(transactionId).trim()
    };
  }

  const deleted = await deleteTransactionById(transactionId, {
    token: resolved.token,
    baseUrl,
    fetchImpl
  });

  return {
    mode: 'authenticated',
    deletedId: String(transactionId).trim(),
    data: deleted
  };
}

module.exports = {
   DEFAULT_STARTER_CATEGORIES,
  resolveAuthSessionMode,
  normalizeTransactionRecord,
  normalizePortfolioRecord,
  createUserCategory,
  ensureUserCategories,
  loadDashboardState,
  persistTransaction,
  removeTransaction
};
