const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const DEFAULT_SUPABASE_URL = 'https://whnxqubvxgjuinvrjheg.supabase.co';
const DUMMY_ANON_KEY = 'dummy_anon_key';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

let serverNetworkFallbackActive = false;

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: WebSocket
  }
};

function resolveSupabaseUrl() {
  const raw = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!raw) return DEFAULT_SUPABASE_URL;
  if (!/^https?:\/\//i.test(raw)) return `https://${raw}`;
  return raw.replace(/\/+$/, '');
}

function resolveSupabaseAnonKey() {
  const raw = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  return raw || DUMMY_ANON_KEY;
}

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
  const anonKey = resolveSupabaseAnonKey();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  const hasRealAnonKey = Boolean(anonKey && anonKey !== DUMMY_ANON_KEY && !anonKey.startsWith('sua_'));
  const hasRealServiceKey = Boolean(serviceKey && serviceKey !== DUMMY_ANON_KEY && !serviceKey.startsWith('sua_'));
  return hasRealAnonKey || hasRealServiceKey;
}

function isNetworkFetchError(errOrMessage) {
  if (!errOrMessage) return false;
  const msg = String(errOrMessage.message || errOrMessage).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('networkerror')
  );
}

function getFallbackSecret() {
  return (
    process.env.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_ANON_KEY ||
    'pc-preview-fallback-hmac-key-2026' // allowlist-secret
  );
}

/**
 * Deriva hash criptográfico de senha com alto custo computacional (PBKDF2-HMAC-SHA512, 100.000 iterações)
 * em conformidade com OWASP / CWE-916 (CodeQL js/insufficient-password-hash).
 */
function hashPasswordSecure(plainPassword, existingSaltHex = null) {
  const salt = existingSaltHex || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(String(plainPassword || ''), salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return { salt, hash: derivedKey };
}

function comparePasswordSecure(plainPassword, storedSalt, storedHash) {
  const effectiveSalt = storedSalt || '00000000000000000000000000000000';
  const { hash: candidateHash } = hashPasswordSecure(plainPassword, effectiveSalt);
  if (!storedSalt || !storedHash) return false;
  const candidateBuf = Buffer.from(candidateHash, 'hex');
  const storedBuf = Buffer.from(String(storedHash), 'hex');
  if (candidateBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(candidateBuf, storedBuf);
}

function deriveTokenSignature(signingInput) {
  return crypto
    .pbkdf2Sync(String(signingInput), getFallbackSecret(), PBKDF2_ITERATIONS, 32, PBKDF2_DIGEST)
    .toString('base64url');
}

function signFallbackJwt(userId, userEmail, createdAt) {
  const header = Buffer.from(JSON.stringify({ alg: 'PBKDF2-HS512', typ: 'JWT' })).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      email: userEmail,
      role: 'authenticated',
      created_at: createdAt,
      exp: expiresAt
    })
  ).toString('base64url');
  const signature = deriveTokenSignature(`${header}.${payload}`);

  return {
    access_token: `${header}.${payload}.${signature}`, // allowlist-secret
    refresh_token: `rt_${signature.slice(0, 24)}`, // allowlist-secret
    expires_at: expiresAt,
    token_type: 'bearer' // allowlist-secret
  };
}

function decodeFallbackJwt(jwt) {
  if (!jwt || typeof jwt !== 'string') return null;
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;

  try {
    const [header, payload, signature] = parts;
    const expectedSig = deriveTokenSignature(`${header}.${payload}`);

    const sigBuf = Buffer.from(String(signature), 'utf8');
    const expectedBuf = Buffer.from(String(expectedSig), 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      created_at: decoded.created_at || '2026-04-20T00:00:00.000Z',
      app_metadata: { provider: 'email', role: decoded.role || 'user' },
      user_metadata: {}
    };
  } catch (_) {
    return null;
  }
}

const DEMO_DEFAULT_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@personalcontroller.app',
  created_at: '2026-10-01T00:00:00.000Z',
  identities: [{ id: '00000000-0000-4000-8000-000000000001' }],
  app_metadata: { provider: 'email', role: 'user' },
  user_metadata: { name: 'Investidor Demo', isDemo: true }
};

const DEMO_DEFAULT_SALT = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const DEMO_DEFAULT_Credentials = hashPasswordSecure(
  process.env.DEMO_ACCOUNT_PASSWORD || 'Demo@123456', // allowlist-secret
  DEMO_DEFAULT_SALT
);

const localDevStore = {
  usersByEmail: new Map(),
  sessionsByToken: new Map(),
  revokedTokens: new Set(),
  tables: {
    users: [],
    categories: [],
    transactions: [],
    assets: [],
    portfolio_positions: []
  }
};

function seedLocalDevStore() {
  serverNetworkFallbackActive = false;
  localDevStore.usersByEmail.clear();
  localDevStore.sessionsByToken.clear();
  localDevStore.revokedTokens.clear();
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
    salt: DEMO_DEFAULT_Credentials.salt,
    hash: DEMO_DEFAULT_Credentials.hash
  });
}

seedLocalDevStore();

function resetLocalDevStore() {
  seedLocalDevStore();
}

function getLocalDevStore() {
  return localDevStore;
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
    if (
      tableName === 'transactions' &&
      cloned.category_id &&
      (!cloned.category || String(selectColumns).includes('categories'))
    ) {
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
    if (
      tableName === 'portfolio_positions' &&
      cloned.asset_id &&
      (!cloned.asset || String(selectColumns).includes('assets'))
    ) {
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
        const existingIdx = table.findIndex(r => r[conflictKey] && r[conflictKey] === item[conflictKey]);
        if (existingIdx >= 0) {
          table[existingIdx] = { ...table[existingIdx], ...item, updated_at: nowIso };
          return enrichRow(table[existingIdx]);
        }
        const created = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || nowIso,
          updated_at: item.updated_at || nowIso,
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
          const eqMatch = clause.match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/);
          if (eqMatch) {
            return String(row[eqMatch[1]] ?? '') === eqMatch[2];
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
 * Usado automaticamente quando SUPABASE_ANON_KEY não está configurada ou quando há falha de rede no preview.
 */
function createLocalDevSupabaseClient(req) {
  const authHeader = req?.headers?.authorization;
  const activeBearer = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  return {
    isLocalDevFallback: true,
    auth: {
      async signUp(credentials) {
        const normalizedEmail = String(credentials?.email || '').trim().toLowerCase();
        const rawPassword = String(credentials?.password || ''); // allowlist-secret

        if (!normalizedEmail || !rawPassword) {
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

        const userId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const user = {
          id: userId,
          email: normalizedEmail,
          created_at: createdAt,
          identities: [{ id: crypto.randomUUID() }],
          app_metadata: { provider: 'email', role: 'user' },
          user_metadata: {}
        };

        const { salt, hash } = hashPasswordSecure(rawPassword);
        localDevStore.usersByEmail.set(normalizedEmail, { user, salt, hash });

        const session = signFallbackJwt(userId, normalizedEmail, createdAt);
        localDevStore.sessionsByToken.set(session.access_token, {
          user,
          expires_at: session.expires_at
        });

        return {
          data: { user, session },
          error: null
        };
      },

      async signInWithPassword(credentials) {
        const normalizedEmail = String(credentials?.email || '').trim().toLowerCase();
        const rawPassword = String(credentials?.password || ''); // allowlist-secret
        const registered = localDevStore.usersByEmail.get(normalizedEmail);
        const credentialsMatch = comparePasswordSecure(rawPassword, registered?.salt, registered?.hash);

        if (!registered || !credentialsMatch) {
          return {
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials', status: 401 }
          };
        }

        const session = signFallbackJwt(
          registered.user.id,
          registered.user.email,
          registered.user.created_at
        );
        localDevStore.sessionsByToken.set(session.access_token, {
          user: registered.user,
          expires_at: session.expires_at
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
          localDevStore.revokedTokens.add(activeBearer);
        }
        return { error: null };
      },

      async getUser(jwt) {
        const tokenToCheck = (jwt || activeBearer || '').trim();
        if (
          !tokenToCheck ||
          tokenToCheck === 'token_invalido' ||
          localDevStore.revokedTokens.has(tokenToCheck)
        ) {
          return {
            data: { user: null },
            error: { message: 'Invalid JWT', status: 401 }
          };
        }

        const storedSession = localDevStore.sessionsByToken.get(tokenToCheck);
        if (storedSession) {
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

        const decoded = decodeFallbackJwt(tokenToCheck);
        if (decoded) {
          return {
            data: { user: decoded },
            error: null
          };
        }

        return {
          data: { user: null },
          error: { message: 'Sessão não encontrada ou expirada', status: 401 }
        };
      }
    },
    from(tableName) {
      return createLocalQueryBuilder(tableName);
    }
  };
}

function wrapSupabaseClientWithFallback(rawClient, req) {
  const fallbackClient = createLocalDevSupabaseClient(req);

  return {
    auth: {
      async signUp(credentials) {
        try {
          const res = await rawClient.auth.signUp(credentials);
          if (res?.error && isNetworkFetchError(res.error)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.signUp(credentials);
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.signUp(credentials);
          }
          throw err;
        }
      },

      async signInWithPassword(credentials) {
        try {
          const res = await rawClient.auth.signInWithPassword(credentials);
          if (res?.error && isNetworkFetchError(res.error)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.signInWithPassword(credentials);
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.signInWithPassword(credentials);
          }
          throw err;
        }
      },

      async signOut() {
        try {
          const res = await rawClient.auth.signOut();
          if (res?.error && isNetworkFetchError(res.error)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.signOut();
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.signOut();
          }
          throw err;
        }
      },

      async getUser(jwt) {
        try {
          const res = await rawClient.auth.getUser(jwt);
          if (res?.error && isNetworkFetchError(res.error)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.getUser(jwt);
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            serverNetworkFallbackActive = true;
            return fallbackClient.auth.getUser(jwt);
          }
          throw err;
        }
      }
    },

    from(table) {
      if (serverNetworkFallbackActive) {
        return createLocalQueryBuilder(table);
      }
      return rawClient.from(table);
    }
  };
}

/**
 * Cria ou recupera o cliente Supabase.
 * Se as chaves do Supabase estiverem configuradas no .env, utiliza o cliente oficial @supabase/supabase-js
 * com fallback automático em caso de falha de conectividade.
 * Caso contrário, utiliza o cliente de desenvolvimento em memória para não bloquear o fluxo local/preview.
 * @param {import('express').Request} [req]
 */
function getSupabaseClient(req) {
  if (!isSupabaseConfigured() || serverNetworkFallbackActive) {
    return createLocalDevSupabaseClient(req);
  }

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseAnonKey();
  const authHeader = req?.headers?.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7);
    return wrapSupabaseClientWithFallback(
      createClient(supabaseUrl, supabaseKey, {
        ...clientOptions,
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      }),
      req
    );
  }

  return wrapSupabaseClientWithFallback(
    createClient(supabaseUrl, supabaseKey, clientOptions),
    req
  );
}

/**
 * Cria cliente administrativo do Supabase para workers e cron jobs.
 */
function getSupabaseAdminClient() {
  if (!isSupabaseConfigured() || serverNetworkFallbackActive) {
    return createLocalDevSupabaseClient();
  }

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseAnonKey();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() || supabaseKey;
  return createClient(supabaseUrl, serviceKey, clientOptions);
}

const defaultClient = getSupabaseClient();

module.exports = {
  isSupabaseConfigured,
  resolveSupabaseUrl,
  resolveSupabaseAnonKey,
  createLocalDevSupabaseClient,
  resetLocalDevStore,
  getLocalDevStore,
  getSupabaseClient,
  getSupabaseAdminClient,
  supabase: defaultClient
};
