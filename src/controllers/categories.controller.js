const { getSupabaseClient } = require('../lib/supabase');
const { createCategorySchema, updateCategorySchema } = require('../schemas/categories.schema');

async function listCategories(req, res) {
  try {
    const supabase = getSupabaseClient(req);
    let query = supabase.from('categories').select('*');

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

    return res.status(200).json({ status: 'ok', count: data?.length || 0, data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Categoria não encontrada' });
    }

    return res.status(200).json({ status: 'ok', data });
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
        errors: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const supabase = getSupabaseClient(req);
    const { data, error } = await supabase
      .from('categories')
      .insert([validation.data])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    return res.status(201).json({ status: 'ok', data });
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
        errors: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    if (Object.keys(validation.data).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Nenhum campo fornecido para atualização'
      });
    }

    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase
      .from('categories')
      .update(validation.data)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Categoria não encontrada para atualização' });
    }

    return res.status(200).json({ status: 'ok', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Categoria não encontrada para exclusão' });
    }

    return res.status(200).json({ status: 'ok', message: 'Categoria excluída com sucesso', data });
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
