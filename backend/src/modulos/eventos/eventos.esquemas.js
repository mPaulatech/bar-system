import { z } from 'zod';

const status = z.enum(['RASCUNHO', 'ATIVO', 'ENCERRADO']);
const dataHora = z.coerce.date();

const camposEvento = {
  nome: z.string().trim().min(2),
  generoMusical: z.string().trim().min(2),
  atracoes: z.string().trim().optional().nullable(),
  dataHora,
  duracaoHoras: z.coerce.number().int().positive().max(72).optional(),
  status: status.optional(),
};

export const esquemaCriarEvento = z.object({
  corpo: z.object(camposEvento).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaAtualizarEvento = z.object({
  corpo: z.object(camposEvento).partial().strict().refine(
    (valor) => Object.keys(valor).length > 0,
    'Informe ao menos um campo para alterar.',
  ),
  parametros: z.object({ id: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});

export const esquemaIdEvento = z.object({
  corpo: z.object({}),
  parametros: z.object({ id: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});

export const esquemaListarEventos = z.object({
  corpo: z.object({}),
  parametros: z.object({}),
  consulta: z.object({
    pagina: z.coerce.number().int().positive().default(1),
    limite: z.coerce.number().int().positive().max(100).default(20),
    status: status.optional(),
    generoMusical: z.string().trim().min(1).optional(),
    dataInicio: z.coerce.date().optional(),
    dataFim: z.coerce.date().optional(),
  }).refine(
    (valor) => !valor.dataInicio || !valor.dataFim || valor.dataInicio <= valor.dataFim,
    'O período informado é inválido.',
  ),
});
