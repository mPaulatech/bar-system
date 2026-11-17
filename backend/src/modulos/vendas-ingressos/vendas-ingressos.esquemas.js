import { z } from 'zod';
import { esquemaCpf, esquemaEmail, esquemaNome } from '../clientes/clientes.esquemas.js';

const formaPagamento = z.enum(['DINHEIRO', 'PIX', 'CARTAO_DEBITO', 'CARTAO_CREDITO']);

export const esquemaCriarVendaIngresso = z.object({
  corpo: z.object({
    eventoId: z.coerce.number().int().positive(),
    ingressoTipoId: z.coerce.number().int().positive(),
    quantidade: z.coerce.number().int().min(1).max(20),
    formaPagamento,
    cpf: esquemaCpf,
    nomeCliente: esquemaNome,
    emailCliente: esquemaEmail,
  }).strict(),
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
