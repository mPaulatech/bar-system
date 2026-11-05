import { z } from 'zod';

const valorMonetario = z.union([
  z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'valorTotal deve ter até duas casas decimais.'),
  z.number().finite().nonnegative().max(9999999999.99)
    .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-7,
      'valorTotal deve ter até duas casas decimais.'),
]);

export const esquemaReceberVendaConsumo = z.object({
  corpo: z.object({
    idTransacaoExterna: z.string().trim().min(1).max(255),
    valorTotal: valorMonetario,
    dataHoraTransacao: z.coerce.date(),
    eventoId: z.coerce.number().int().positive().optional(),
    clienteId: z.coerce.number().int().positive().optional(),
    itens: z.json().optional(),
  }).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});
