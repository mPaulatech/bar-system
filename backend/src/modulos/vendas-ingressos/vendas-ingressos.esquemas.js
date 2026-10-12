import { z } from 'zod';

const cpf = z.string().trim().transform((valor) => valor.replace(/\D/g, ''))
  .refine((valor) => /^\d{11}$/.test(valor), 'CPF deve conter 11 dígitos.');

export const esquemaCriarVendaIngresso = z.object({
  corpo: z.object({
    eventoId: z.coerce.number().int().positive(),
    ingressoTipoId: z.coerce.number().int().positive(),
    clienteId: z.coerce.number().int().positive().optional(),
    cpf: cpf.optional(),
    nomeCliente: z.string().trim().min(1).optional(),
  }).strict().refine(
    (dados) => !(dados.clienteId && dados.cpf),
    'Informe clienteId ou CPF, não os dois.',
  ),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaIdVendaIngresso = z.object({
  corpo: z.object({}),
  parametros: z.object({ id: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});

export const esquemaListarVendasIngressos = z.object({
  corpo: z.object({}),
  parametros: z.object({}),
  consulta: z.object({
    eventoId: z.coerce.number().int().positive().optional(),
    vendedorId: z.coerce.number().int().positive().optional(),
    dataInicio: z.coerce.date().optional(),
    dataFim: z.coerce.date().optional(),
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().positive().max(100).default(20),
  }).refine(
    (dados) => !dados.dataInicio || !dados.dataFim || dados.dataInicio <= dados.dataFim,
    'dataInicio deve ser anterior ou igual a dataFim.',
  ),
});
