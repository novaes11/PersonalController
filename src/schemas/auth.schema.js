const { z } = require('zod');

const signupSchema = z.object({
  email: z.string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido')
    .trim()
    .toLowerCase(),
  password: z.string({ required_error: 'A senha é obrigatória' })
    .min(6, 'A senha deve conter no mínimo 6 caracteres')
});

const loginSchema = z.object({
  email: z.string({ required_error: 'O e-mail é obrigatório' })
    .email('Formato de e-mail inválido')
    .trim()
    .toLowerCase(),
  password: z.string({ required_error: 'A senha é obrigatória' })
    .min(1, 'A senha é obrigatória')
});

module.exports = {
  signupSchema,
  loginSchema
};
