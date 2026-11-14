const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const DEFAULT_SUPABASE_URL = 'https://whnxqubvxgjuinvrjheg.supabase.co';
const DUMMY_ANON_KEY = 'dummy_anon_key';

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: WebSocket
  }
};

/**
 * Verifica se as chaves reais do Supabase estão configuradas no ambiente.
 * Quando falso, o sistema opera automaticamente com o cliente local em memória (Dev Fallback),
 * permitindo desenvolvimento e testes ponta a ponta sem bloqueio de credenciais externas.
 * @returns {boolean}
 */
function isSupabaseConfigured() {
  if (process.env.SUPABASE_DEV_FALLBACK === 'true') {
    return false;
  }
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const hasRealAnonKey = Boolean(anonKey && anonKey !== DUMMY_ANON_KEY && !anonKey.startsWith('sua_'));
  const hasRealServiceKey = Boolean(serviceKey && serviceKey !== DUMMY_ANON_KEY && !serviceKey.startsWith('sua_'));
  return hasRealAnonKey || hasRealServiceKey;
}

const DEMO_DEFAULT_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@personalcontroller.app',
  created_at: '2026-10-01T00:00:00.000Z',
  app_metadata: { provider: 'email', role: 'user' },
  user_metadata: { name: 'Investidor Demo', isDemo: true }
};

const localDevStore = {
  usersByEmail: new Map(),
  sessionsByToken: new Map(),
  tables: {
    users: [],
    categories: [],
    transactions: [],
    assets: [],
    portfolio_positions: []
  }
};

function seedLocalDevStore() {
  localDevStore.usersByEmail.clear();
  localDevStore.sessionsByToken.clear();
  localDevStore.tables.users = [
    {
      id: DEMO_DEFAULT_USER.id,
      email: DEMO_DEFAULT_USER.email,
      created_at: DEMO_DEFAULT_USER.created_at
    }
  ];
  localDevStore.tables.categories = [];
  localDevStore.tables.transactions = [];
  localDevStore.tables.assets = [
    {
      id: '44444444-4444-4444-8444-444444444401',
      ticker: 'PETR4',
      name: 'Petrobras PN',
      asset_type: 'STOCK',
      current_price: 40.7,
      currency: 'BRL',
      last_price_update: '2026-10-20T12:00:00.000Z'
    },
    {
      id: '44444444-4444-4444-8444-444444444402',
      ticker: 'HGLG11',
      name: 'CSHG Logística FII',
      asset_type: 'FII',
      current_price: 162.0,
      currency: 'BRL',
      last_price_update: '2026-10-20T12:00:00.000Z'
    }
  ];
  localDevStore.tables.portfolio_positions = [];

  localDevStore.usersByEmail.set(DEMO_DEFAULT_USER.email, {
    user: { ...DEMO_DEFAULT_USER },
    password: process.env.DEMO_ACCOUNT_PASSWORD || 'Demo@123456' // allowlist-secret
  });
}

seedLocalDevStore();

function resetLocalDevStore() {
  seedLocalDevStore();
}

function getLocalDevStore() {
  return localDevStore;
}

function generateDevJwt(user) {
  const payloadB64 = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000)
    })
  ).toString('base64url');
  const randomSuffix = crypto.randomBytes(12).toString('hex');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payloadB64}.${randomSuffix}`;
}

function createLocalQueryBuilder(tableName) {
  const getTable = () => {
    if (!localDevStore.tables[tableName]) {
      localDevStore.tables[tableName] = [];
    }
    return localDevStore.tables[tableName];
  };

  let operation = 'select';
  let selectColumns = '*';
  let payloadData = null;
  let upsertOptions = {};
  const filters = [];
  const orders = [];
  let rangeBounds = null;
  let returnMode = 'many'; // 'many' | 'single' | 'maybeSingle'

  function enrichRow(row) {
    if (!row || typeof row !== 'object') return row;
    const cloned = { ...row };
    if (tableName === 'transactions' && String(selectColumns).includes('categories')) {
      const cat = (localDevStore.tables.categories || []).find(c => c.id === cloned.category_id) || null;
      cloned.category = cat
        ? {
            id: cat.id,
            name: cat.name,
            type: cat.type,
            color: cat.color || null,
            icon: cat.icon || null
          }
        : null;
    }
    if (tableName === 'portfolio_positions' && String(selectColumns).includes('assets')) {
      const asset = (localDevStore.tables.assets || []).find(a => a.id === cloned.asset_id) || null;
      cloned.asset = asset ? { ...asset } : null;
    }
    return cloned;
  }

  function matchesFilters(row) {
    return filters.every(fn => fn(row));
  }

  function execute() {
    const table = getTable();

    if (operation === 'insert') {
      const items = Array.isArray(payloadData) ? payloadData : [payloadData];
      const nowIso = new Date().toISOString();
      const inserted = items.map(item => {
        const record = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || nowIso,
          updated_at: item.updated_at || nowIso,
          ...item
        };
        table.push(record);
        return enrichRow(record);
      });

      if (returnMode === 'single' || returnMode === 'maybeSingle') {
        return { data: inserted[0] || null, error: null };
      }
      return { data: inserted, error: null };
    }

    if (operation === 'upsert') {
      const items = Array.isArray(payloadData) ? payloadData : [payloadData];
      const conflictKey = upsertOptions.onConflict || 'id';
      const nowIso = new Date().toISOString();
      const upserted = items.map(item => {
        const existingIdx = table.findIndex(r => r[conflictKey] === item[conflictKey]);
        if (existingIdx >= 0) {
          table[existingIdx] = { ...table[existingIdx], ...item, updated_at: nowIso };
          return enrichRow(table[existingIdx]);
        }
        const created = {
          id: item.id || crypto.randomUUID(),
          created_at: nowIso,
          updated_at: nowIso,
          ...item
        };
        table.push(created);
        return enrichRow(created);
      });

      if (returnMode === 'single' || returnMode === 'maybeSingle') {
        return { data: upserted[0] || null, error: null };
      }
      return { data: upserted, error: null };
    }

    if (operation === 'update') {
      const nowIso = new Date().toISOString();
      const updated = [];
      for (let i = 0; i < table.length; i++) {
        if (matchesFilters(table[i])) {
          table[i] = { ...table[i], ...payloadData, updated_at: nowIso };
          updated.push(enrichRow(table[i]));
        }
      }
      if (returnMode === 'single' || returnMode === 'maybeSingle') {
        return { data: updated[0] || null, error: null };
      }
      return { data: updated, error: null };
    }

    if (operation === 'delete') {
      const deleted = [];
      const remaining = [];
      for (const row of table) {
        if (matchesFilters(row)) {
          deleted.push(enrichRow(row));
        } else {
          remaining.push(row);
        }
      }
      localDevStore.tables[tableName] = remaining;
      if (returnMode === 'single' || returnMode === 'maybeSingle') {
        return { data: deleted[0] || null, error: null };
      }
      return { data: deleted, error: null };
    }

    // operation === 'select'
    let results = table.filter(matchesFilters).map(enrichRow);

    if (orders.length > 0) {
      results.sort((a, b) => {
        for (const { column, ascending } of orders) {
          const valA = a[column] ?? '';
          const valB = b[column] ?? '';
          if (valA < valB) return ascending ? -1 : 1;
          if (valA > valB) return ascending ? 1 : -1;
        }
        return 0;
      });
    }

    if (rangeBounds) {
      results = results.slice(rangeBounds.from, rangeBounds.to + 1);
    }

    if (returnMode === 'single' || returnMode === 'maybeSingle') {
      return { data: results[0] || null, error: null };
    }

    return { data: results, error: null };
  }

  const builder = {
    select(cols = '*') {
      selectColumns = cols;
      return builder;
    },
    insert(values) {
      operation = 'insert';
      payloadData = values;
      return builder;
    },
    update(values) {
      operation = 'update';
      payloadData = values;
      return builder;
    },
    delete() {
      operation = 'delete';
      return builder;
    },
    upsert(values, opts = {}) {
      operation = 'upsert';
      payloadData = values;
      upsertOptions = opts;
      return builder;
    },
    eq(column, value) {
      filters.push(row => row[column] === value);
      return builder;
    },
    or(orExpression) {
      const clauses = String(orExpression || '').split(',').map(s => s.trim());
      filters.push(row =>
        clauses.some(clause => {
          if (clause === 'user_id.is.null') {
            return row.user_id === null || row.user_id === undefined;
          }
          if (clause.startsWith('user_id.eq.')) {
            const targetId = clause.slice('user_id.eq.'.length);
            return row.user_id === targetId;
          }
          return false;
        })
      );
      return builder;
    },
    gte(column, value) {
      filters.push(row => String(row[column] ?? '') >= String(value));
      return builder;
    },
    lte(column, value) {
      filters.push(row => String(row[column] ?? '') <= String(value));
      return builder;
    },
    order(column, { ascending = true } = {}) {
      orders.push({ column, ascending });
      return builder;
    },
    range(from, to) {
      rangeBounds = { from, to };
      return builder;
    },
    single() {
      returnMode = 'single';
      return Promise.resolve(execute());
    },
    maybeSingle() {
      returnMode = 'maybeSingle';
      return Promise.resolve(execute());
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(execute()).then(onFulfilled, onRejected);
    }
  };

  return builder;
}

/**
 * Cria um cliente Supabase local em memória compatível com a API do @supabase/supabase-js.
 * Usado automaticamente quando SUPABASE_ANON_KEY não está configurada.
 */
function createLocalDevSupabaseClient(req) {
  const authHeader = req?.headers?.authorization;
  const activeBearer = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  return {
    isLocalDevFallback: true,
    auth: {
      async signUp({ email, password }) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !password) {
          return {
            data: { user: null, session: null },
            error: { message: 'E-mail e senha são obrigatórios', status: 400 }
          };
        }

        if (localDevStore.usersByEmail.has(normalizedEmail)) {
          return {
            data: { user: null, session: null },
            error: { message: 'User already registered', status: 400 }
          };
        }

        const nowIso = new Date().toISOString();
        const user = {
          id: crypto.randomUUID(),
          email: normalizedEmail,
          created_at: nowIso,
          app_metadata: { provider: 'email', role: 'user' },
          user_metadata: {}
        };

        localDevStore.usersByEmail.set(normalizedEmail, { user, password });
        const accessToken = generateDevJwt(user);
        const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
        const session = {
          access_token: accessToken, // allowlist-secret
          expires_at: expiresAt,
          token_type: 'bearer'
        };

        localDevStore.sessionsByToken.set(accessToken, { user, expires_at: expiresAt });

        return {
          data: { user, session },
          error: null
        };
      },

      async signInWithPassword({ email, password }) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const registered = localDevStore.usersByEmail.get(normalizedEmail);

        if (!registered || registered.password !== password) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials', status: 401 }
          };
        }

        const accessToken = generateDevJwt(registered.user);
        const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
        const session = {
          access_token: accessToken, // allowlist-secret
          expires_at: expiresAt,
          token_type: 'bearer'
        };

        localDevStore.sessionsByToken.set(accessToken, {
          user: registered.user,
          expires_at: expiresAt
        });

        return {
          data: {
            user: registered.user,
            session
          },
          error: null
        };
      },

      async signOut() {
        if (activeBearer) {
          localDevStore.sessionsByToken.delete(activeBearer);
        }
        return { error: null };
      },

      async getUser(jwt) {
        const tokenToCheck = (jwt || activeBearer || '').trim();
        if (!tokenToCheck || tokenToCheck === 'token_invalido') {
          return {
            data: { user: null },
            error: { message: 'Invalid JWT', status: 401 }
          };
        }

        const storedSession = localDevStore.sessionsByToken.get(tokenToCheck);
        if (!storedSession) {
          return {
            data: { user: null },
            error: { message: 'Sessão não encontrada ou expirada', status: 401 }
          };
        }

        const nowSec = Math.floor(Date.now() / 1000);
        if (storedSession.expires_at && storedSession.expires_at <= nowSec) {
          localDevStore.sessionsByToken.delete(tokenToCheck);
          return {
            data: { user: null },
            error: { message: 'Sessão expirada', status: 401 }
          };
        }

        return {
          data: { user: storedSession.user },
          error: null
        };
      }
    },
    from(tableName) {
      return createLocalQueryBuilder(tableName);
    }
  };
}

/**
 * Cria ou recupera o cliente Supabase.
 * Se as chaves do Supabase estiverem configuradas no .env, utiliza o cliente oficial @supabase/supabase-js.
 * Caso contrário, utiliza o cliente de desenvolvimento em memória para não bloquear o fluxo local.
 * @param {import('express').Request} [req]
 */
function getSupabaseClient(req) {
  if (!isSupabaseConfigured()) {
    return createLocalDevSupabaseClient(req);
  }

  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || DUMMY_ANON_KEY;
  const authHeader = req?.headers?.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7);
    return createClient(supabaseUrl, supabaseKey, {
      ...clientOptions,
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    });
  }

  return createClient(supabaseUrl, supabaseKey, clientOptions);
}

/**
 * Cria cliente administrativo do Supabase para workers e cron jobs.
 */
function getSupabaseAdminClient() {
  if (!isSupabaseConfigured()) {
    return createLocalDevSupabaseClient();
  }

  const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || DUMMY_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
  return createClient(supabaseUrl, serviceKey, clientOptions);
}

const defaultClient = isSupabaseConfigured()
  ? createClient(
      process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || DUMMY_ANON_KEY,
      clientOptions
    )
  : createLocalDevSupabaseClient();

module.exports = {
  isSupabaseConfigured,
  createLocalDevSupabaseClient,
  resetLocalDevStore,
  getLocalDevStore,
  getSupabaseClient,
  getSupabaseAdminClient,
  supabase: defaultClient
};
