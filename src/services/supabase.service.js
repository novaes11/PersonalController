const {
  getSupabaseClient,
  getSupabaseAdminClient,
  supabase
} = require('../lib/supabase');

/**
 * Resolve o cliente de banco de dados mais adequado para persistência do perfil do usuário (`public.users`).
 */
function resolveProfileDbClient(fallbackClient, accessToken) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && typeof getSupabaseAdminClient === 'function') {
    return getSupabaseAdminClient();
  }
  if (accessToken && typeof getSupabaseClient === 'function') {
    return getSupabaseClient({
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });
  }
  return fallbackClient;
}

/**
 * Garante a sincronização do registro do usuário na tabela `public.users` (1:1 com `auth.users`).
 */
async function syncUserProfile(user, optionsOrToken = {}, explicitFallbackClient = null) {
  if (!user || !user.id || !user.email) {
    return { synced: false };
  }

  let accessToken = null;
  let fallbackClient = explicitFallbackClient;

  if (optionsOrToken && typeof optionsOrToken === 'object') {
    accessToken = optionsOrToken.accessToken || null; // allowlist-secret
    fallbackClient = optionsOrToken.fallbackClient || explicitFallbackClient;
  } else if (typeof optionsOrToken === 'string') {
    accessToken = optionsOrToken; // allowlist-secret
  }

  try {
    const dbClient = resolveProfileDbClient(fallbackClient, accessToken);
    if (dbClient && typeof dbClient.from === 'function') {
      await dbClient.from('users').upsert(
        {
          id: user.id,
          email: user.email
        },
        { onConflict: 'id' }
      );
    }
    return { synced: true, id: user.id, email: user.email };
  } catch (_) {
    // Não bloqueia o fluxo de autenticação caso confirmação de e-mail esteja pendente
    return { synced: false };
  }
}

module.exports = {
  getSupabaseClient,
  getSupabaseAdminClient,
  supabase,
  resolveProfileDbClient,
  syncUserProfile
};
