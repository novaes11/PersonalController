/**
 * Cliente HTTP de Frontend para Autenticação e Modo Demonstração Interativo (E05.T03).
 * Compatível com os schemas Zod estritos de `/api/auth/login`, `/api/auth/signup` e `/api/auth/logout`.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida e normaliza credenciais de login/cadastro garantindo payload estrito (SEC-04).
 * @param {object} rawInput
 * @returns {{ valid: boolean, errors: Array<{field: string, message: string}>, payload?: { email: string, password: string } }}
 */
function buildAuthPayload(rawInput = {}) {
  const errors = [];
  const email = rawInput.email ? String(rawInput.email).trim().toLowerCase() : '';
  const password = rawInput.password !== undefined && rawInput.password !== null // allowlist-secret
    ? String(rawInput.password)
    : '';

  if (!email || !EMAIL_REGEX.test(email)) {
    errors.push({
      field: 'email',
      message: 'Informe um endereço de e-mail válido.'
    });
  }

  if (!password || password.length < 8) {
    errors.push({
      field: 'password',
      message: 'A senha deve conter no mínimo 8 caracteres.'
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    payload: {
      email,
      password
    }
  };
}

/**
 * Realiza autenticação via POST /api/auth/login.
 */
async function loginUser(credentials, options = {}) {
  const { baseUrl = '/api', fetchImpl = global.fetch } = options;

  const validation = buildAuthPayload(credentials);
  if (!validation.valid) {
    const err = new Error(validation.errors[0].message);
    err.validationErrors = validation.errors;
    err.status = 400;
    throw err;
  }

  const response = await fetchImpl(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(validation.payload)
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Falha na autenticação (HTTP ${response.status})`);
    err.status = response.status;
    err.errors = body.errors || [];
    throw err;
  }

  return {
    user: body.user || null,
    session: body.session || null,
    message: body.message || 'Autenticado com sucesso'
  };
}

/**
 * Realiza cadastro de novo usuário via POST /api/auth/signup.
 */
async function signupUser(credentials, options = {}) {
  const { baseUrl = '/api', fetchImpl = global.fetch } = options;

  const validation = buildAuthPayload(credentials);
  if (!validation.valid) {
    const err = new Error(validation.errors[0].message);
    err.validationErrors = validation.errors;
    err.status = 400;
    throw err;
  }

  const response = await fetchImpl(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(validation.payload)
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Falha ao criar conta (HTTP ${response.status})`);
    err.status = response.status;
    err.errors = body.errors || [];
    throw err;
  }

  return {
    user: body.user || null,
    session: body.session || null,
    message: body.message || 'Usuário cadastrado com sucesso'
  };
}

/**
 * Encerra a sessão atual via POST /api/auth/logout.
 */
async function logoutUser(options = {}) {
  const { token, baseUrl = '/api', fetchImpl = global.fetch } = options;

  const headers = {
    'Accept': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchImpl(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers
  });

  const body = await response.json();

  if (!response.ok || body.status === 'error') {
    const err = new Error(body.message || `Erro ao encerrar sessão (HTTP ${response.status})`);
    err.status = response.status;
    throw err;
  }

  return {
    message: body.message || 'Sessão encerrada com sucesso'
  };
}

/**
 * Gera dados realistas para o Modo Demonstração (1 Clique), permitindo explorar
 * imediatamente o Dashboard, Fluxo de Caixa e Carteira sem digitar credenciais.
 */
function createDemoDataset() {
  const categories = [
    { id: '11111111-1111-4111-8111-111111111101', name: 'Salário / Pró-Labore', type: 'INCOME' },
    { id: '11111111-1111-4111-8111-111111111102', name: 'Moradia & Condomínio', type: 'EXPENSE' },
    { id: '11111111-1111-4111-8111-111111111103', name: 'Alimentação & Mercado', type: 'EXPENSE' },
    { id: '11111111-1111-4111-8111-111111111104', name: 'Transporte & Mobilidade', type: 'EXPENSE' },
    { id: '11111111-1111-4111-8111-111111111105', name: 'Aportes & Investimentos', type: 'INVESTMENT' }
  ];

  const transactions = [
    {
      id: '22222222-2222-4222-8222-222222222201',
      amount: 14500.0,
      date: '2026-10-05',
      category_id: '11111111-1111-4111-8111-111111111101',
      description: 'Remuneração Mensal Tech Lead',
      is_automated: false,
      categories: { name: 'Salário / Pró-Labore', type: 'INCOME' }
    },
    {
      id: '22222222-2222-4222-8222-222222222202',
      amount: 3200.0,
      date: '2026-10-10',
      category_id: '11111111-1111-4111-8111-111111111102',
      description: 'Aluguel + Condomínio Residencial',
      is_automated: false,
      categories: { name: 'Moradia & Condomínio', type: 'EXPENSE' }
    },
    {
      id: '22222222-2222-4222-8222-222222222203',
      amount: 1420.5,
      date: '2026-10-14',
      category_id: '11111111-1111-4111-8111-111111111103',
      description: 'Supermercado Mensal & Feira',
      is_automated: false,
      categories: { name: 'Alimentação & Mercado', type: 'EXPENSE' }
    },
    {
      id: '22222222-2222-4222-8222-222222222204',
      amount: 380.0,
      date: '2026-10-18',
      category_id: '11111111-1111-4111-8111-111111111104',
      description: 'Combustível e Uber Executivo',
      is_automated: true,
      categories: { name: 'Transporte & Mobilidade', type: 'EXPENSE' }
    },
    {
      id: '22222222-2222-4222-8222-222222222205',
      amount: 3500.0,
      date: '2026-10-20',
      category_id: '11111111-1111-4111-8111-111111111105',
      description: 'Aporte Mensal Carteira B3 & Tesouro',
      is_automated: false,
      categories: { name: 'Aportes & Investimentos', type: 'INVESTMENT' }
    }
  ];

  const portfolio = {
    total_invested: 78500.0,
    total_portfolio_value: 86420.0,
    total_profit_loss: 7920.0,
    total_profit_loss_pct: 10.09,
    positions_count: 4,
    quotes_refreshed: true,
    allocation_by_type: {
      FIXED_INCOME: { total_value: 36000.0, percentage: 41.66 },
      STOCK: { total_value: 24420.0, percentage: 28.26 },
      FII: { total_value: 16200.0, percentage: 18.75 },
      CRYPTO: { total_value: 9800.0, percentage: 11.34 }
    },
    positions: [
      {
        id: '33333333-3333-4333-8333-333333333301',
        ticker: 'TESOURO-SELIC',
        asset_type: 'FIXED_INCOME',
        quantity: 24,
        average_price: 1420.0,
        current_price: 1500.0,
        invested_value: 34080.0,
        current_value: 36000.0,
        profit_loss: 1920.0,
        profit_loss_pct: 5.63,
        allocation_pct: 41.66
      },
      {
        id: '33333333-3333-4333-8333-333333333302',
        ticker: 'PETR4',
        asset_type: 'STOCK',
        quantity: 600,
        average_price: 36.5,
        current_price: 40.7,
        invested_value: 21900.0,
        current_value: 24420.0,
        profit_loss: 2520.0,
        profit_loss_pct: 11.51,
        allocation_pct: 28.26
      },
      {
        id: '33333333-3333-4333-8333-333333333303',
        ticker: 'HGLG11',
        asset_type: 'FII',
        quantity: 100,
        average_price: 155.2,
        current_price: 162.0,
        invested_value: 15520.0,
        current_value: 16200.0,
        profit_loss: 680.0,
        profit_loss_pct: 4.38,
        allocation_pct: 18.75
      },
      {
        id: '33333333-3333-4333-8333-333333333304',
        ticker: 'BTC',
        asset_type: 'CRYPTO',
        quantity: 0.02,
        average_price: 350000.0,
        current_price: 490000.0,
        invested_value: 7000.0,
        current_value: 9800.0,
        profit_loss: 2800.0,
        profit_loss_pct: 40.0,
        allocation_pct: 11.34
      }
    ]
  };

  return {
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'demo@personalcontroller.app',
      isDemo: true
    },
    categories,
    transactions,
    portfolio
  };
}

module.exports = {
  buildAuthPayload,
  loginUser,
  signupUser,
  logoutUser,
  createDemoDataset
};
