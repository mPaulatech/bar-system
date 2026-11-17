import { z } from 'zod';

const camposTipo = {
  nome: z.string().trim().min(1),
  preco: z.coerce.number().finite().min(0),
  quantidadeDisponivel: z.coerce.number().int().min(0),
};

export const esquemaCriarIngressoTipo = z.object({
  corpo: z.object(camposTipo).strict(),
  parametros: z.object({ eventoId: z.coerce.number().int().positive() }),
  consulta: z.object({}),
});

export const esquemaAtualizarIngressoTipo = z.object({
  corpo: z.object(camposTipo).partial().strict().refine(
    (valor) => Object.keys(valor).length > 0,
    'Informe ao menos um campo para alterar.',
  ),
  parametros: z.object({
    eventoId: z.coerce.number().int().positive(),
    id: z.coerce.number().int().positive(),
  }),
  consulta: z.object({}),
});

export const esquemaIdIngressoTipo = z.object({
  corpo: z.object({}),
  parametros: z.object({
    eventoId: z.coerce.number().int().positive(),
    id: z.coerce.number().int().positive(),
  }),
  consulta: z.object({}),
});

export const esquemaListarIngressosTipos = z.object({
  corpo: z.object({}),
  parametros: z.object({
    eventoId: z.coerce.number().int().positive(),
  }),
  consulta: z.object({}),
});
