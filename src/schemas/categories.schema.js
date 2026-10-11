const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string({ required_error: 'O campo name é obrigatório' })
    .trim()
    .min(1, 'O nome não pode ser vazio')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: "O tipo de categoria deve ser estritamente 'INCOME' ou 'EXPENSE'" })
  }),
  color: z.string().max(20, 'O código de cor deve ter no máximo 20 caracteres').optional().nullable(),
  icon: z.string().max(50, 'O ícone deve ter no máximo 50 caracteres').optional().nullable(),
  user_id: z.string().uuid('user_id inválido').optional().nullable()
});

const updateCategorySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'O nome não pode ser vazio')
    .max(100, 'O nome deve ter no máximo 100 caracteres')
    .optional(),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: "O tipo de categoria deve ser estritamente 'INCOME' ou 'EXPENSE'" })
  }).optional(),
  color: z.string().max(20, 'O código de cor deve ter no máximo 20 caracteres').optional().nullable(),
  icon: z.string().max(50, 'O ícone deve ter no máximo 50 caracteres').optional().nullable()
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};
