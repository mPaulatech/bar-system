import { z } from 'zod';

export const esquemaAtualizarEstabelecimento = z.object({
  corpo: z.object({
    nomeFantasia: z.string().trim().min(2).optional(),
    razaoSocial: z.string().trim().min(2).optional(),
  }).strict().refine(
    (valor) => Object.keys(valor).length > 0,
    'Informe ao menos um campo para alterar.',
  ),
  parametros: z.object({}),
  consulta: z.object({}),
});
