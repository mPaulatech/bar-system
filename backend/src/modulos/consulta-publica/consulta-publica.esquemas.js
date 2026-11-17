import { z } from 'zod';
import { esquemaCpf, esquemaEmail, esquemaNome } from '../clientes/clientes.esquemas.js';

const identificadorPublico = z.string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, 'Identificador público inválido.');

export const esquemaEstabelecimentoPublico = z.object({
  corpo: z.object({}),
  parametros: z.object({ identificadorPublico }),
  consulta: z.object({}),
});

export const esquemaEventosPublicos = esquemaEstabelecimentoPublico;

export const esquemaLotesPublicos = z.object({
  corpo: z.object({}),
  parametros: z.object({
    identificadorPublico,
    eventoId: z.coerce.number().int().positive(),
  }),
  consulta: z.object({}),
});

export const esquemaCriarCompraPublica = z.object({
  corpo: z.object({
    eventoId: z.coerce.number().int().positive(),
    ingressoTipoId: z.coerce.number().int().positive(),
    quantidade: z.coerce.number().int().min(1).max(20),
    nome: esquemaNome,
    cpf: esquemaCpf,
    email: esquemaEmail,
    chaveIdempotencia: z.string().trim().min(1).max(100),
    pagamentoSimulado: z.enum(['APROVADO', 'RECUSADO']).default('APROVADO'),
    consentimentoMarketing: z.boolean().default(false),
  }).strict(),
  parametros: z.object({ identificadorPublico }),
  consulta: z.object({}),
});
