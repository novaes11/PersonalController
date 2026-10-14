const { getSupabaseClient } = require('../lib/supabase');
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
        message: error.message
      });
    }

    // Se o usuário foi criado, garante registro do perfil na tabela public.users
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email
      }, { onConflict: 'id' });
    }

    return res.status(201).json({
      status: 'ok',
      message: 'Usuário cadastrado com sucesso',
      user: sanitizeUser(data.user),
      session: data.session ? {
        access_token: data.session.access_token, // allowlist-secret
        expires_at: data.session.expires_at
      } : null
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
        message: 'Credenciais inválidas'
      });
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Autenticado com sucesso',
      user: sanitizeUser(data.user),
      session: {
        access_token: data.session?.access_token, // allowlist-secret
        expires_at: data.session?.expires_at,
        token_type: data.session?.token_type || 'bearer'
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
  signup,
  login,
  logout,
  getMe
};
