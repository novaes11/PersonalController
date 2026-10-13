const { getSupabaseClient } = require('../lib/supabase');
const { createTransactionSchema, updateTransactionSchema } = require('../schemas/transactions.schema');

async function listTransactions(req, res) {
  try {
    const supabase = getSupabaseClient(req);
    let query = supabase
      .from('transactions')
      .select('*, category:categories(id, name, type, color, icon)')
      .eq('user_id', req.user.id);

    // Filtros por período
    if (req.query.start_date) {
      query = query.gte('date', req.query.start_date);
    }
    if (req.query.end_date) {
      query = query.lte('date', req.query.end_date);
    }

    // Filtro por categoria
    if (req.query.category_id) {
      query = query.eq('category_id', req.query.category_id);
    }

    // Paginação
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    query = query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    return res.status(200).json({
      status: 'ok',
      count: data?.length || 0,
      limit,
      offset,
      data
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function getTransactionById(req, res) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient(req);

    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(id, name, type, color, icon)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Transação não encontrada' });
    }

    return res.status(200).json({ status: 'ok', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function createTransaction(req, res) {
  try {
    const validation = createTransactionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para criação da transação',
        errors: validation.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      });
    }

    const supabase = getSupabaseClient(req);
    // AuthZ: Vincula estritamente a transação ao req.user.id autenticado, bloqueando bypass ou spoofing
    const payload = {
      ...validation.data,
      user_id: req.user.id
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select('*, category:categories(id, name, type, color, icon)')
      .single();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    return res.status(201).json({ status: 'ok', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const validation = updateTransactionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para atualização da transação',
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

    // AuthZ: Atualiza somente transação do usuário autenticado
    const { data, error } = await supabase
      .from('transactions')
      .update(validation.data)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*, category:categories(id, name, type, color, icon)')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Transação não encontrada para atualização' });
    }

    return res.status(200).json({ status: 'ok', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient(req);

    // AuthZ: Exclui somente transação do usuário autenticado
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .maybeSingle();

    if (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data) {
      return res.status(404).json({ status: 'error', message: 'Transação não encontrada para exclusão' });
    }

    return res.status(200).json({ status: 'ok', message: 'Transação excluída com sucesso', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};
