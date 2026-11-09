const { getSupabaseClient, getSupabaseAdminClient } = require('../lib/supabase');
const { signupSchema, loginSchema, sanitizeUser } = require('../schemas/auth.schema');

function formatZodIssues(issues) {
  return issues.map(i => {
    if (i.code === 'unrecognized_keys') {
      return {
        field: i.keys.join(', '),
        message: `Campos não permitidos (Mass Assignment detectado): ${i.keys.join(', ')}`
      };
    }
    return { field: i.path.join('.'), message: i.message };
  });
}

function formatAuthErrorMessage(rawMessage, mode = 'login') {
  if (!rawMessage) {
    return mode === 'signup'
      ? 'Não foi possível concluir o cadastro.'
      : 'Credenciais inválidas';
  }

  const msg = String(rawMessage).trim();
  const lower = msg.toLowerCase();

  if (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user_already_exists')
  ) {
    return 'Usuário já cadastrado com este endereço de e-mail.';
  }

  if (lower.includes('já cadastrado') || lower.includes('já está cadastrado')) {
    return msg;
  }

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Credenciais inválidas';
  }

  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'E-mail ainda não confirmado. Verifique sua caixa de entrada para ativar a conta.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.';
  }

  if (lower.includes('fetch failed') || lower.includes('failed to fetch') || lower.includes('enotfound')) {
    return 'Serviço de autenticação temporariamente indisponível. Verifique a configuração do Supabase.';
  }

  return msg;
}

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

async function signup(req, res) {
  try {
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para cadastro',
        errors: formatZodIssues(validation.error.issues)
      });
    }

    const { email, password } = validation.data;
    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({
        status: 'error',
        message: formatAuthErrorMessage(error.message, 'signup')
      });
    }

    // Supabase Auth retorna identities vazio quando o e-mail já existe e confirmação de e-mail está ativa
    if (Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Usuário já cadastrado com este endereço de e-mail.'
      });
    }

    let activeSession = data?.session || null;

    // Caso o signUp não retorne sessão imediata, tenta confirmar (se service_role existir) e autenticar para obter o JWT
    if (!activeSession && data?.user) {
      try {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY && typeof getSupabaseAdminClient === 'function') {
          const adminClient = getSupabaseAdminClient();
          if (adminClient?.auth?.admin && typeof adminClient.auth.admin.updateUserById === 'function') {
            await adminClient.auth.admin.updateUserById(data.user.id, { email_confirm: true });
          }
        }
      } catch (_) {}

      try {
        if (typeof supabase.auth.signInWithPassword === 'function') {
          const signInRes = await supabase.auth.signInWithPassword({ email, password });
          if (!signInRes.error && signInRes.data?.session?.access_token) {
            activeSession = signInRes.data.session;
          }
        }
      } catch (_) {}
    }

    // Se o usuário foi criado, garante registro do perfil na tabela public.users
    if (data?.user) {
      try {
        const dbClient = resolveProfileDbClient(supabase, activeSession?.access_token);
        if (dbClient && typeof dbClient.from === 'function') {
          await dbClient.from('users').upsert({
            id: data.user.id,
            email: data.user.email
          }, { onConflict: 'id' });
        }
      } catch (profileErr) {
        // Não bloqueia conclusão do cadastro caso confirmação de e-mail esteja pendente
      }
    }

    const sessionPayload = activeSession?.access_token
      ? {
          access_token: activeSession.access_token, // allowlist-secret
          refresh_token: activeSession.refresh_token || null, // allowlist-secret
          expires_at: activeSession.expires_at ?? null,
          token_type: activeSession.token_type || 'bearer' // allowlist-secret
        }
      : null;

    const requiresEmailConfirmation = !sessionPayload;

    return res.status(201).json({
      status: 'ok',
      message: requiresEmailConfirmation
        ? 'Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.'
        : 'Usuário cadastrado com sucesso',
      token: sessionPayload ? sessionPayload.access_token : null, // allowlist-secret
      requiresEmailConfirmation,
      user: sanitizeUser(data?.user),
      session: sessionPayload
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Erro interno ao realizar cadastro'
    });
  }
}

async function login(req, res) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para autenticação',
        errors: formatZodIssues(validation.error.issues)
      });
    }

    const { email, password } = validation.data;
    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data?.session?.access_token) {
      return res.status(401).json({
        status: 'error',
        message: formatAuthErrorMessage(error?.message, 'login')
      });
    }

    // Garante sincronização do perfil em public.users após login autenticado
    if (data.user && data.session?.access_token) {
      try {
        const dbClient = resolveProfileDbClient(supabase, data.session.access_token);
        if (dbClient && typeof dbClient.from === 'function') {
          await dbClient.from('users').upsert({
            id: data.user.id,
            email: data.user.email
          }, { onConflict: 'id' });
        }
      } catch (profileErr) {}
    }

    const sessionPayload = {
      access_token: data.session.access_token, // allowlist-secret
      refresh_token: data.session.refresh_token || null, // allowlist-secret
      expires_at: data.session.expires_at ?? null,
      token_type: data.session.token_type || 'bearer' // allowlist-secret
    };

    return res.status(200).json({
      status: 'ok',
      message: 'Autenticado com sucesso',
      token: sessionPayload.access_token, // allowlist-secret
      user: sanitizeUser(data.user),
      session: sessionPayload
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Erro interno ao realizar login'
    });
  }
}

async function logout(req, res) {
  try {
    const supabase = getSupabaseClient(req);
    await supabase.auth.signOut();

    return res.status(200).json({
      status: 'ok',
      message: 'Sessão encerrada com sucesso'
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Erro ao encerrar sessão'
    });
  }
}

async function getMe(req, res) {
  try {
    return res.status(200).json({
      status: 'ok',
      user: sanitizeUser(req.user)
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err.message || 'Erro ao carregar perfil do usuário'
    });
  }
}

module.exports = {
  signup,
  login,
  logout,
  getMe,
  formatAuthErrorMessage
};
