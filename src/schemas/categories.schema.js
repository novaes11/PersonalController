const { z } = require('zod');

// Schema estrito de criação de categoria (SEC-04: Mass Assignment Protection)
// O campo user_id foi intencionalmente removido do input do cliente para evitar spoofing.
const createCategorySchema = z.object({
  name: z.string({ required_error: 'O campo name é obrigatório' })
    .trim()
    .min(1, 'O nome não pode ser vazio')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    errorMap: () => ({ message: "O tipo de categoria deve ser estritamente 'INCOME' ou 'EXPENSE'" })
  }),
  color: z.string().max(20, 'O código de cor deve ter no máximo 20 caracteres').optional().nullable(),
  icon: z.string().max(50, 'O ícone deve ter no máximo 50 caracteres').optional().nullable()
}).strict({
  message: 'Campos adicionais não permitidos na criação de categoria (Mass Assignment bloqueado)'
});

// Schema estrito de atualização de categoria (SEC-04: Mass Assignment Protection)
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
}).strict({
  message: 'Campos adicionais não permitidos na atualização de categoria (Mass Assignment bloqueado)'
});

// Sanitizador de resposta de categoria para evitar vazamento de metadados internos
function sanitizeCategory(category) {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    color: category.color ?? null,
    icon: category.icon ?? null,
    user_id: category.user_id ?? null,
    created_at: category.created_at
  };
}

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  sanitizeCategory
};
