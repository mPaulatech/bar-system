import { z } from 'zod';

const codigoIngresso = z.string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{8}$/, 'O código do ingresso deve ter 8 caracteres válidos.');

const esquemaEvento = z.coerce.number().int().positive();

export const esquemaRealizarCheckin = z.object({
  corpo: z.object({
    eventoId: esquemaEvento,
    codigoIngresso,
  }).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaListarCheckin = z.object({
  corpo: z.object({}),
  parametros: z.object({}),
  consulta: z.object({
    eventoId: esquemaEvento,
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().positive().max(100).default(20),
  }),
});
