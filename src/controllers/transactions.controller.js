const { getSupabaseClient } = require('../lib/supabase');
const {
  createTransactionSchema,
  updateTransactionSchema,
  parsePdfStatementSchema,
  batchCreateTransactionsSchema,
  sanitizeTransaction
} = require('../schemas/transactions.schema');
const { parsePdfStatement } = require('../services/pdfParser.service');

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

    const sanitized = (data || []).map(sanitizeTransaction);
    return res.status(200).json({
      status: 'ok',
      count: sanitized.length,
      limit,
      offset,
      data: sanitized
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

    return res.status(200).json({ status: 'ok', data: sanitizeTransaction(data) });
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
        errors: formatZodIssues(validation.error.issues)
      });
    }

    const supabase = getSupabaseClient(req);
    // AuthZ: Vincula estritamente a transação ao req.user.id autenticado
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

    return res.status(201).json({ status: 'ok', data: sanitizeTransaction(data) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * POST /transactions/parse-pdf (E07.T01)
 * Extrai e classifica transações de um Extrato Bancário ou Fatura de Cartão em PDF,
 * vinculando automaticamente às categorias do usuário autenticado (req.user.id).
 */
async function parsePdfTransactions(req, res) {
  try {
    const validation = parsePdfStatementSchema.safeParse(req.body || {});

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para extração de PDF',
        errors: formatZodIssues(validation.error.issues)
      });
    }

    const { pdf_base64, raw_text } = validation.data;
    if ((!pdf_base64 || !String(pdf_base64).trim()) && (!raw_text || !String(raw_text).trim())) {
      return res.status(400).json({
        status: 'error',
        message: 'É necessário fornecer pdf_base64 ou raw_text para extração de transações'
      });
    }

    let userCategories = [];
    try {
      const supabase = getSupabaseClient(req);
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', req.user.id);
      if (Array.isArray(cats)) {
        userCategories = cats;
      }
    } catch (_) {
      userCategories = [];
    }

    const parsedData = parsePdfStatement(validation.data, { userCategories });

    return res.status(200).json({
      status: 'ok',
      data: parsedData
    });
  } catch (err) {
    const statusCode = err.status || 400;
    return res.status(statusCode).json({
      status: 'error',
      message: err.message || 'Falha ao processar o arquivo PDF'
    });
  }
}

/**
 * POST /transactions/batch (E07.T01)
 * Persiste em lote uma lista de transações extraídas/conciliadas para o usuário autenticado (req.user.id).
 */
async function createBatchTransactions(req, res) {
  try {
    const validation = batchCreateTransactionsSchema.safeParse(req.body || {});

    if (!validation.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Dados inválidos para importação em lote de transações',
        errors: formatZodIssues(validation.error.issues)
      });
    }

    const supabase = getSupabaseClient(req);
    const rowsToInsert = validation.data.transactions.map(tx => ({
      ...tx,
      is_automated: tx.is_automated !== undefined ? tx.is_automated : true,
      user_id: req.user.id
    }));

    const insertQuery = supabase
      .from('transactions')
      .insert(rowsToInsert)
      .select('*, category:categories(id, name, type, color, icon)');

    const result = typeof insertQuery.single === 'function' && rowsToInsert.length === 1
      ? await insertQuery.single()
      : await insertQuery;

    if (result.error) {
      return res.status(500).json({ status: 'error', message: result.error.message });
    }

    const rawRows = Array.isArray(result.data)
      ? result.data
      : (result.data ? [result.data] : rowsToInsert);

    const sanitized = rawRows.map(sanitizeTransaction);

    return res.status(201).json({
      status: 'ok',
      count: sanitized.length,
      data: sanitized
    });
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

    return res.status(200).json({ status: 'ok', data: sanitizeTransaction(data) });
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

    return res.status(200).json({ status: 'ok', message: 'Transação excluída com sucesso', data: sanitizeTransaction(data) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  parsePdfTransactions,
  createBatchTransactions,
  updateTransaction,
  deleteTransaction
};
