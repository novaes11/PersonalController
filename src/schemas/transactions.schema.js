const { z } = require('zod');

// Schema estrito de criação de transação (SEC-04: Mass Assignment Protection)
// O campo user_id foi intencionalmente removido do input do cliente para evitar spoofing.
const createTransactionSchema = z.object({
  category_id: z.string().uuid('category_id deve ser um UUID válido').optional().nullable(),
  amount: z.coerce.number({ required_error: 'O valor da transação (amount) é obrigatório' })
    .positive('O valor da transação deve ser positivo e maior que zero'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato AAAA-MM-DD')
    .optional(),
  description: z.string().max(255, 'A descrição deve ter no máximo 255 caracteres').optional().nullable(),
  is_automated: z.boolean().optional().default(false)
}).strict({
  message: 'Campos adicionais não permitidos na criação de transação (Mass Assignment bloqueado)'
});

// Schema estrito de atualização de transação (SEC-04: Mass Assignment Protection)
const updateTransactionSchema = z.object({
  category_id: z.string().uuid('category_id deve ser um UUID válido').optional().nullable(),
  amount: z.coerce.number()
    .positive('O valor da transação deve ser positivo e maior que zero')
    .optional(),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato AAAA-MM-DD')
    .optional(),
  description: z.string().max(255, 'A descrição deve ter no máximo 255 caracteres').optional().nullable(),
  is_automated: z.boolean().optional()
}).strict({
  message: 'Campos adicionais não permitidos na atualização de transação (Mass Assignment bloqueado)'
});

// Sanitizador de resposta de transação para evitar vazamento de metadados internos
function sanitizeTransaction(tx) {
  if (!tx) return null;
  return {
    id: tx.id,
    user_id: tx.user_id,
    category_id: tx.category_id ?? null,
    amount: tx.amount,
    date: tx.date,
    description: tx.description ?? null,
    is_automated: tx.is_automated ?? false,
    created_at: tx.created_at,
    category: tx.category ? {
      id: tx.category.id,
      name: tx.category.name,
      type: tx.category.type,
      color: tx.category.color ?? null,
      icon: tx.category.icon ?? null
    } : null
  };
}

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  sanitizeTransaction
};
