import { z } from 'zod';

const perfilFuncionario = z.literal('FUNCIONARIO');

export const esquemaCriarFuncionario = z.object({
  corpo: z.object({
    nome: z.string().trim().min(2),
    cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/).optional(),
    email: z.string().trim().email().transform((valor) => valor.toLowerCase()),
    senha: z.string().min(8),
    perfil: perfilFuncionario.optional(),
  }).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaListarFuncionarios = z.object({
  corpo: z.object({}),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaAlterarAtivo = z.object({
  corpo: z.object({ ativo: z.boolean() }).strict(),
  parametros: z.object({ id: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});
