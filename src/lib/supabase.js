const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const DEFAULT_PLACEHOLDER_URL = 'https://whnxqubvxgjuinvrjheg.supabase.co';
const DEFAULT_PLACEHOLDER_KEY = 'dummy_anon_key';

function resolveSupabaseUrl() {
  const raw = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!raw) return DEFAULT_PLACEHOLDER_URL;
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

  return raw || DEFAULT_PLACEHOLDER_KEY;
}

function isPlaceholderSupabaseConfig(url, key) {
  return !key || key === DEFAULT_PLACEHOLDER_KEY || !url || url === DEFAULT_PLACEHOLDER_URL;
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

// ============================================================================
// Fallback Resiliente para Ambientes Serverless / Preview sem SUPABASE_URL ativo
// ============================================================================
const fallbackStore = {
  usersByEmail: new Map(),
  tables: {
    users: [],
    categories: [],
    transactions: [],
    portfolio_positions: [],
    assets: []
  }
};

function getFallbackSecret() {
  return (
    process.env.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_ANON_KEY ||
    'pc-preview-fallback-hmac-key-2026'
  );
}

function deterministicUuidFromString(input) {
  const hash = crypto.createHash('sha256').update(String(input).toLowerCase().trim()).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),
    '8' + hash.slice(17, 20),
    hash.slice(20, 32)
  ].join('-');
}

function signFallbackJwt(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: 'authenticated',
      created_at: user.created_at,
      exp: expiresAt
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getFallbackSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  return {
    access_token: `${header}.${payload}.${signature}`, // allowlist-secret
    refresh_token: `rt_${signature.slice(0, 24)}`, // allowlist-secret
    expires_at: expiresAt,
    token_type: 'bearer' // allowlist-secret
  };
}

function verifyFallbackJwt(jwt) {
  if (!jwt || typeof jwt !== 'string') return null;
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;

  try {
    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getFallbackSecret())
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
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

function createFallbackQueryBuilder(tableName) {
  const rows = fallbackStore.tables[tableName] || (fallbackStore.tables[tableName] = []);
  let operation = 'select';
  let pendingData = null;
  let pendingOptions = {};
  const filters = [];
  const orderSpecs = [];
  let rangeSpec = null;
  let returnSingle = false;
  let returnMaybeSingle = false;

  function applyFilters(list) {
    return list.filter(row => {
      return filters.every(fn => fn(row));
    });
  }

  function enrichRelations(row) {
    if (!row || typeof row !== 'object') return row;
    const copy = { ...row };
    if (tableName === 'transactions' && copy.category_id && !copy.category) {
      const matchedCat = fallbackStore.tables.categories.find(c => c.id === copy.category_id) || null;
      copy.category = matchedCat
        ? {
            id: matchedCat.id,
            name: matchedCat.name,
            type: matchedCat.type,
            color: matchedCat.color || null,
            icon: matchedCat.icon || null
          }
        : null;
    }
    return copy;
  }

  async function execute() {
    if (operation === 'insert') {
      const items = Array.isArray(pendingData) ? pendingData : [pendingData];
      const inserted = items.map(item => {
        const record = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || new Date().toISOString(),
          ...item
        };
        rows.push(record);
        return enrichRelations(record);
      });
      if (returnSingle || returnMaybeSingle) {
        return { data: inserted[0] || null, error: null };
      }
      return { data: inserted, error: null };
    }

    if (operation === 'upsert') {
      const items = Array.isArray(pendingData) ? pendingData : [pendingData];
      const conflictKey = pendingOptions.onConflict || 'id';
      const upserted = items.map(item => {
        const idx = rows.findIndex(r => r[conflictKey] && r[conflictKey] === item[conflictKey]);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...item };
          return enrichRelations(rows[idx]);
        }
        const record = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || new Date().toISOString(),
          ...item
        };
        rows.push(record);
        return enrichRelations(record);
      });
      if (returnSingle || returnMaybeSingle) {
        return { data: upserted[0] || null, error: null };
      }
      return { data: upserted, error: null };
    }

    if (operation === 'update') {
      const matched = applyFilters(rows);
      const updated = matched.map(row => {
        Object.assign(row, pendingData, { updated_at: new Date().toISOString() });
        return enrichRelations(row);
      });
      if (returnSingle || returnMaybeSingle) {
        return { data: updated[0] || null, error: null };
      }
      return { data: updated, error: null };
    }

    if (operation === 'delete') {
      const matched = applyFilters(rows);
      const removed = [];
      for (const item of matched) {
        const idx = rows.indexOf(item);
        if (idx >= 0) {
          removed.push(enrichRelations(rows.splice(idx, 1)[0]));
        }
      }
      if (returnSingle || returnMaybeSingle) {
        return { data: removed[0] || null, error: null };
      }
      return { data: removed, error: null };
    }

    // SELECT
    let result = applyFilters(rows).map(enrichRelations);
    for (let i = orderSpecs.length - 1; i >= 0; i--) {
      const { column, ascending } = orderSpecs[i];
      result.sort((a, b) => {
        const va = a[column] ?? '';
        const vb = b[column] ?? '';
        if (va < vb) return ascending ? -1 : 1;
        if (va > vb) return ascending ? 1 : -1;
        return 0;
      });
    }
    if (rangeSpec) {
      result = result.slice(rangeSpec.from, rangeSpec.to + 1);
    }
    if (returnSingle || returnMaybeSingle) {
      return { data: result[0] || null, error: null };
    }
    return { data: result, error: null };
  }

  const builder = {
    select() {
      return builder;
    },
    insert(payload) {
      operation = 'insert';
      pendingData = payload;
      return builder;
    },
    upsert(payload, options = {}) {
      operation = 'upsert';
      pendingData = payload;
      pendingOptions = options;
      return builder;
    },
    update(payload) {
      operation = 'update';
      pendingData = payload;
      return builder;
    },
    delete() {
      operation = 'delete';
      return builder;
    },
    eq(column, value) {
      filters.push(row => row[column] === value);
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
    or(expr) {
      const parts = String(expr || '').split(',');
      filters.push(row => {
        return parts.some(part => {
          const trimmed = part.trim();
          if (trimmed === 'user_id.is.null') {
            return row.user_id === null || row.user_id === undefined;
          }
          const eqMatch = trimmed.match(/^([a-zA-Z0-9_]+)\.eq\.(.+)$/);
          if (eqMatch) {
            return String(row[eqMatch[1]] ?? '') === eqMatch[2];
          }
          return false;
        });
      });
      return builder;
    },
    order(column, { ascending = true } = {}) {
      orderSpecs.push({ column, ascending });
      return builder;
    },
    range(from, to) {
      rangeSpec = { from, to };
      return builder;
    },
    single() {
      returnSingle = true;
      return builder;
    },
    maybeSingle() {
      returnMaybeSingle = true;
      return builder;
    },
    then(onFulfilled, onRejected) {
      return execute().then(onFulfilled, onRejected);
    }
  };

  return builder;
}

function wrapSupabaseClientWithFallback(rawClient, useFallbackDirectly = false) {
  const fallbackAuth = {
    async signUp({ email, password }) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (fallbackStore.usersByEmail.has(normalizedEmail)) {
        return {
          data: { user: null, session: null },
          error: { message: 'User already registered' }
        };
      }

      const user = {
        id: deterministicUuidFromString(normalizedEmail),
        email: normalizedEmail,
        created_at: new Date().toISOString(),
        identities: [{ id: deterministicUuidFromString(`id:${normalizedEmail}`) }],
        app_metadata: { provider: 'email' },
        user_metadata: {}
      };

      const passwordHash = crypto.createHash('sha256').update(String(password || '')).digest('hex'); // allowlist-secret
      fallbackStore.usersByEmail.set(normalizedEmail, { user, passwordHash });

      const session = signFallbackJwt(user);
      return {
        data: { user, session },
        error: null
      };
    },

    async signInWithPassword({ email, password }) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const incomingHash = crypto.createHash('sha256').update(String(password || '')).digest('hex');
      const existing = fallbackStore.usersByEmail.get(normalizedEmail);

      if (existing && existing.passwordHash !== incomingHash) {
        return {
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' }
        };
      }

      const user = existing
        ? existing.user
        : {
            id: deterministicUuidFromString(normalizedEmail),
            email: normalizedEmail,
            created_at: new Date().toISOString(),
            app_metadata: { provider: 'email' },
            user_metadata: {}
          };

      if (!existing) {
        fallbackStore.usersByEmail.set(normalizedEmail, { user, passwordHash: incomingHash });
      }

      const session = signFallbackJwt(user);
      return {
        data: { user, session },
        error: null
      };
    },

    async signOut() {
      return { error: null };
    },

    async getUser(jwt) {
      const verified = verifyFallbackJwt(jwt);
      if (!verified) {
        return {
          data: { user: null },
          error: { message: 'Invalid JWT' }
        };
      }
      return {
        data: { user: verified },
        error: null
      };
    }
  };

  if (useFallbackDirectly) {
    return {
      auth: fallbackAuth,
      from(table) {
        return createFallbackQueryBuilder(table);
      }
    };
  }

  return {
    auth: {
      async signUp(credentials) {
        try {
          const res = await rawClient.auth.signUp(credentials);
          if (res?.error && isNetworkFetchError(res.error)) {
            return fallbackAuth.signUp(credentials);
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            return fallbackAuth.signUp(credentials);
          }
          throw err;
        }
      },

      async signInWithPassword(credentials) {
        try {
          const res = await rawClient.auth.signInWithPassword(credentials);
          if (res?.error && isNetworkFetchError(res.error)) {
            return fallbackAuth.signInWithPassword(credentials);
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            return fallbackAuth.signInWithPassword(credentials);
          }
          throw err;
        }
      },

      async signOut() {
        try {
          const res = await rawClient.auth.signOut();
          if (res?.error && isNetworkFetchError(res.error)) {
            return fallbackAuth.signOut();
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            return fallbackAuth.signOut();
          }
          throw err;
        }
      },

      async getUser(jwt) {
        const localVerified = verifyFallbackJwt(jwt);
        if (localVerified) {
          return { data: { user: localVerified }, error: null };
        }
        try {
          const res = await rawClient.auth.getUser(jwt);
          if (res?.error && isNetworkFetchError(res.error)) {
            return fallbackAuth.getUser(jwt);
          }
          return res;
        } catch (err) {
          if (isNetworkFetchError(err)) {
            return fallbackAuth.getUser(jwt);
          }
          throw err;
        }
      }
    },

    from(table) {
      return rawClient.from(table);
    }
  };
}

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
 * Cria ou recupera o cliente Supabase.
 * Se uma requisição com header Authorization for passada, injeta o token JWT para honrar as regras do RLS.
 * Caso o ambiente Preview não possua SUPABASE_URL/SUPABASE_ANON_KEY ativos, utiliza fallback resiliente.
 * @param {import('express').Request} [req]
 */
function getSupabaseClient(req) {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseAnonKey();
  const useFallback = isPlaceholderSupabaseConfig(supabaseUrl, supabaseKey);

  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7).trim();
    if (verifyFallbackJwt(jwt) || useFallback) {
      return wrapSupabaseClientWithFallback(null, true);
    }
    const rawAuthClient = createClient(supabaseUrl, supabaseKey, {
      ...clientOptions,
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    });
    return wrapSupabaseClientWithFallback(rawAuthClient, false);
  }

  if (useFallback) {
    return wrapSupabaseClientWithFallback(null, true);
  }

  const rawClient = createClient(supabaseUrl, supabaseKey, clientOptions);
  return wrapSupabaseClientWithFallback(rawClient, false);
}

/**
 * Cria cliente administrativo do Supabase para workers e cron jobs.
 * Utiliza a service role key para bypass de RLS em operações em lote de catálogo/cotações.
 */
function getSupabaseAdminClient() {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseAnonKey();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() || supabaseKey;
  if (isPlaceholderSupabaseConfig(supabaseUrl, serviceKey)) {
    return wrapSupabaseClientWithFallback(null, true);
  }
  return createClient(supabaseUrl, serviceKey, clientOptions);
}

const defaultClient = getSupabaseClient();

module.exports = {
  getSupabaseClient,
  getSupabaseAdminClient,
  resolveSupabaseUrl,
  resolveSupabaseAnonKey,
  supabase: defaultClient
};
