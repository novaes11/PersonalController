const { z } = require('zod');

// Schema estrito de cadastro (SEC-04: Mass Assignment Protection)
const signupSchema = z.object({
  email: z.string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido')
    .trim()
    .toLowerCase(),
  password: z.string({ required_error: 'A senha é obrigatória' })
    .min(6, 'A senha deve conter no mínimo 6 caracteres')
}).strict({
  message: 'Campos adicionais não permitidos no cadastro (Mass Assignment bloqueado)'
});

// Schema estrito de login (SEC-04: Mass Assignment Protection)
const loginSchema = z.object({
  email: z.string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido')
    .trim()
    .toLowerCase(),
  password: z.string({ required_error: 'A senha é obrigatória' })
    .min(1, 'A senha é obrigatória')
}).strict({
  message: 'Campos adicionais não permitidos no login (Mass Assignment bloqueado)'
});

// Schema de resposta estrita para usuário (impede vazamento de metadados internos)
const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  created_at: z.string().optional()
}).strip();

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at
  };
}

module.exports = {
  signupSchema,
  loginSchema,
  userResponseSchema,
  sanitizeUser
};
