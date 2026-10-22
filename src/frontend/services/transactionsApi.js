/**
 * Cliente HTTP de Frontend para o domínio de Transações e Categorias (E04.T01 & E04.T02).
 * Garante envio de payload JSON estrito (compatível com SEC-04) e autenticação Bearer JWT.
 */

/**
 * Normaliza e valida os dados do formulário antes do envio para POST /api/transactions.
 * Garante que apenas as chaves permitidas pelo createTransactionSchema (.strict()) sejam enviadas.
 * @param {object} rawInput
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}>, payload?: object }}
 */
function buildTransactionPayload(rawInput = {}) {
  const errors = [];

  const parsedAmount = Number(rawInput.amount);
  if (rawInput.amount === '' || rawInput.amount === null || rawInput.amount === undefined || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.push({
      field: 'amount',
      message: 'Informe um valor numérico positivo maior que zero.'
    });
  }

  const dateStr = rawInput.date ? String(rawInput.date).trim() : '';
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    errors.push({
      field: 'date',
      message: 'A data é obrigatória e deve estar no formato AAAA-MM-DD.'
    });
  }

  const categoryId = rawInput.category_id ? String(rawInput.category_id).trim() : null;
  if (categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
    errors.push({
      field: 'category_id',
      message: 'Selecione uma categoria válida.'
    });
  }

  const description = rawInput.description !== undefined && rawInput.description !== null
    ? String(rawInput.description).trim()
    : '';

  if (description.length > 255) {
    errors.push({
      field: 'description',
      message: 'A descrição deve ter no máximo 255 caracteres.'
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Payload estrito compatível com createTransactionSchema (SEC-04)
  const payload = {
    amount: Number(parsedAmount.toFixed(2)),
    date: dateStr,
    category_id: categoryId || null,
    description: description || null,
    is_automated: false
  };

  return { valid: true, errors: [], payload };
}

/**
 * Busca as categorias disponíveis (sistema + customizadas do usuário) para popular o dropdown.
 * @param {object} [options]
 * @param {string} [options.token] JWT do usuário autenticado
 * @param {string} [options.baseUrl='/api']
 * @param {Function} [options.fetchImpl=global.fetch]
 */
async function fetchCategories(options = {}) {
  const { token, baseUrl = '/api', fetchImpl = global.fetch } = options;

  const headers = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchImpl(`${baseUrl}/categories`, {
    method: 'GET',
    headers
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    throw new Error(body.message || `Falha ao carregar categorias (HTTP ${response.status})`);
  }

  return Array.isArray(body.data) ? body.data : [];
}

/**
 * Envia uma nova transação manual via POST /api/transactions.
 * @param {object} formValues Valores brutos ou validados do formulário
 * @param {object} [options]
 * @param {string} [options.token] JWT do usuário autenticado
 * @param {string} [options.baseUrl='/api']
 * @param {Function} [options.fetchImpl=global.fetch]
 */
async function submitTransaction(formValues, options = {}) {
  const { token, baseUrl = '/api', fetchImpl = global.fetch } = options;

  const validation = buildTransactionPayload(formValues);
  if (!validation.valid) {
    const err = new Error(validation.errors[0].message);
    err.validationErrors = validation.errors;
    err.status = 400;
    throw err;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchImpl(`${baseUrl}/transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(validation.payload)
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Erro ao registrar transação (HTTP ${response.status})`);
    err.status = response.status;
    err.errors = body.errors || [];
    throw err;
  }

  return body.data;
}

/**
 * Busca a lista paginada de transações do usuário via GET /api/transactions (E04.T02).
 * @param {object} [options]
 * @param {string} [options.token] JWT do usuário autenticado
 * @param {string} [options.baseUrl='/api']
 * @param {number} [options.limit=10]
 * @param {number} [options.offset=0]
 * @param {string} [options.start_date]
 * @param {string} [options.end_date]
 * @param {string} [options.category_id]
 * @param {Function} [options.fetchImpl=global.fetch]
 */
async function fetchTransactions(options = {}) {
  const {
    token,
    baseUrl = '/api',
    limit = 10,
    offset = 0,
    start_date,
    end_date,
    category_id,
    fetchImpl = global.fetch
  } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (start_date) params.set('start_date', String(start_date));
  if (end_date) params.set('end_date', String(end_date));
  if (category_id) params.set('category_id', String(category_id));

  const headers = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const queryString = params.toString();
  const url = `${baseUrl}/transactions${queryString ? `?${queryString}` : ''}`;

  const response = await fetchImpl(url, {
    method: 'GET',
    headers
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Falha ao carregar transações (HTTP ${response.status})`);
    err.status = response.status;
    throw err;
  }

  return {
    data: Array.isArray(body.data) ? body.data : [],
    count: typeof body.count === 'number' ? body.count : (Array.isArray(body.data) ? body.data.length : 0),
    limit: typeof body.limit === 'number' ? body.limit : limit,
    offset: typeof body.offset === 'number' ? body.offset : offset
  };
}

/**
 * Exclui uma transação específica do usuário via DELETE /api/transactions/:id (E04.T02).
 * @param {string} transactionId UUID da transação
 * @param {object} [options]
 * @param {string} [options.token] JWT do usuário autenticado
 * @param {string} [options.baseUrl='/api']
 * @param {Function} [options.fetchImpl=global.fetch]
 */
async function deleteTransactionById(transactionId, options = {}) {
  if (!transactionId || !String(transactionId).trim()) {
    throw new Error('ID da transação é obrigatório para exclusão.');
  }

  const { token, baseUrl = '/api', fetchImpl = global.fetch } = options;

  const headers = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchImpl(`${baseUrl}/transactions/${encodeURIComponent(String(transactionId).trim())}`, {
    method: 'DELETE',
    headers
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Erro ao excluir transação (HTTP ${response.status})`);
    err.status = response.status;
    throw err;
  }

  return body.data;
}

module.exports = {
  buildTransactionPayload,
  fetchCategories,
  submitTransaction,
  fetchTransactions,
  deleteTransactionById
};
