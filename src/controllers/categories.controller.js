const { getSupabaseClient } = require('../lib/supabase');
const { createCategorySchema, updateCategorySchema, sanitizeCategory } = require('../schemas/categories.schema');

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

async function listCategories(req, res) {
  try {
    const supabase = getSupabaseClient(req);
    // AuthZ: Lista categorias de sistema (user_id IS NULL) e as personalizadas do usuário autenticado
    let query = supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${req.user.id}`);

    if (req.query.type) {
      const type = req.query.type.toUpperCase();
      if (!['INCOME', 'EXPENSE'].includes(type)) {
        return res.status(400).json({
          status: 'error',
          message: "Parâmetro 'type' deve ser 'INCOME' ou 'EXPENSE'"
        });
      }
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    const sanitized = (data || []).map(sanitizeCategory);
    return res.status(200).json({ status: 'ok', count: sanitized.length, data: sanitized });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient(req);

    // AuthZ: Permite consultar categorias do sistema ou do próprio usuário
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .or(`user_id.is.null,user_id.eq.${req.user.id}`)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Categoria não encontrada' });
    }

    return res.status(200).json({ status: 'ok', data: sanitizeCategory(data) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function createCategory(req, res) {
  try {
    const validation = createCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para criação da categoria',
        errors: formatZodIssues(validation.error.issues)
      });
    }

    const supabase = getSupabaseClient(req);
    // AuthZ: Categoria customizada pertence estritamente ao usuário autenticado
    const payload = {
      ...validation.data,
      user_id: req.user.id
    };

    const { data, error } = await supabase
      .from('categories')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    return res.status(201).json({ status: 'ok', data: sanitizeCategory(data) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const validation = updateCategorySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para atualização da categoria',
        errors: formatZodIssues(validation.error.issues)
      });
    }

    if (Object.keys(validation.data).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenhum campo fornecido para atualização'
      });
    }

    const supabase = getSupabaseClient(req);

    // AuthZ: Impede edição de categorias do sistema ou de terceiros; só atualiza se user_id == req.user.id
    const { data, error } = await supabase
      .from('categories')
      .update(validation.data)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Categoria não encontrada ou você não tem permissão para editá-la' });
    }

    return res.status(200).json({ status: 'ok', data: sanitizeCategory(data) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient(req);

    // AuthZ: Impede exclusão de categorias do sistema ou de terceiros; só exclui se user_id == req.user.id
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Categoria não encontrada ou você não tem permissão para excluí-la' });
    }

    return res.status(200).json({ status: 'ok', message: 'Categoria excluída com sucesso', data: sanitizeCategory(data) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
