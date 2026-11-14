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

function normalizeAuthErrorMessage(rawMessage, mode = 'login') {
  if (!rawMessage) {
    return mode === 'signup' ? 'Erro ao realizar cadastro' : 'Credenciais inválidas';
  }
  const lower = String(rawMessage).toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'Usuário já cadastrado com este endereço de e-mail.';
  }
  if (lower.includes('invalid login credentials') || lower.includes('credenciais inválidas')) {
    return 'Credenciais inválidas';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de fazer login (verifique sua caixa de entrada).';
  }
  return rawMessage;
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
        message: normalizeAuthErrorMessage(error.message, 'signup')
      });
    }

    let activeSession = data?.session || null;

    // Caso o provedor não retorne sessão imediata no signUp, tenta obter sessão via signInWithPassword
    if (data?.user && !activeSession && typeof supabase.auth.signInWithPassword === 'function') {
      try {
        const signInAttempt = await supabase.auth.signInWithPassword({ email, password });
        if (signInAttempt?.data?.session) {
          activeSession = signInAttempt.data.session;
        }
      } catch (_) {
        // Mantém activeSession como null caso confirmação de e-mail seja estritamente exigida
      }
    }

    // Se o usuário foi criado, garante registro do perfil na tabela public.users
    if (data?.user) {
      try {
        const dbClient = resolveProfileDbClient(supabase, activeSession?.access_token);
        if (dbClient && typeof dbClient.from === 'function') {
          await dbClient.from('users').upsert(
            {
              id: data.user.id,
              email: data.user.email
            },
            { onConflict: 'id' }
          );
        }
      } catch (profileErr) {
        // Não bloqueia conclusão do cadastro caso confirmação de e-mail esteja pendente
      }
    }

    return res.status(201).json({
      status: 'ok',
      message: activeSession
        ? 'Usuário cadastrado com sucesso'
        : 'Usuário cadastrado com sucesso. Confirme seu e-mail para ativar a sessão.',
      requires_email_confirmation: !activeSession,
      token: activeSession ? activeSession.access_token : null, // allowlist-secret
      user: sanitizeUser(data?.user),
      session: activeSession
        ? {
            access_token: activeSession.access_token, // allowlist-secret
            expires_at: activeSession.expires_at,
            token_type: activeSession.token_type || 'bearer'
          }
        : null
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

    if (error) {
      return res.status(401).json({
        status: 'error',
        message: normalizeAuthErrorMessage(error.message, 'login')
      });
    }

    // Garante sincronização do perfil em public.users após login autenticado
    if (data?.user && data?.session?.access_token) {
      try {
        const dbClient = resolveProfileDbClient(supabase, data.session.access_token);
        if (dbClient && typeof dbClient.from === 'function') {
          await dbClient.from('users').upsert(
            {
              id: data.user.id,
              email: data.user.email
            },
            { onConflict: 'id' }
          );
        }
      } catch (profileErr) {}
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Autenticado com sucesso',
      token: data?.session?.access_token || null, // allowlist-secret
      user: sanitizeUser(data?.user),
      session: {
        access_token: data?.session?.access_token, // allowlist-secret
        expires_at: data?.session?.expires_at,
        token_type: data?.session?.token_type || 'bearer'
      }
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
  normalizeAuthErrorMessage,
  signup,
  login,
  logout,
  getMe
};
