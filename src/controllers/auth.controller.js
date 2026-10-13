const { getSupabaseClient } = require('../lib/supabase');
const { signupSchema, loginSchema } = require('../schemas/auth.schema');

async function signup(req, res) {
  try {
    const validation = signupSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para cadastro',
        errors: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
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
      user: {
        id: data.user?.id,
        email: data.user?.email,
        created_at: data.user?.created_at
      },
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
        errors: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
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
      user: {
        id: data.user?.id,
        email: data.user?.email
      },
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
      user: {
        id: req.user.id,
        email: req.user.email,
        created_at: req.user.created_at,
        app_metadata: req.user.app_metadata,
        user_metadata: req.user.user_metadata
      }
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
