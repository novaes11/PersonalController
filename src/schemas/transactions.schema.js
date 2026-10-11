const { z } = require('zod');

const createTransactionSchema = z.object({
  user_id: z.string().uuid('user_id deve ser um UUID válido').optional(),
  category_id: z.string().uuid('category_id deve ser um UUID válido').optional().nullable(),
  amount: z.coerce.number({ required_error: 'O valor da transação (amount) é obrigatório' })
    .positive('O valor da transação deve ser positivo e maior que zero'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato AAAA-MM-DD')
    .optional(),
  description: z.string().max(255, 'A descrição deve ter no máximo 255 caracteres').optional().nullable(),
  is_automated: z.boolean().optional().default(false)
});

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
});

module.exports = {
  createTransactionSchema,
  updateTransactionSchema
};
