import { z } from 'zod';

const valorMonetario = z.union([
  z.string().regex(/^\d{1,10}(?:\.\d{1,2})?$/, 'valorTotal deve ter até duas casas decimais.'),
  z.number().finite().nonnegative().max(9999999999.99)
    .refine((valor) => Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-7,
      'valorTotal deve ter até duas casas decimais.'),
]);

export const esquemaDadosVendaConsumo = z.object({
  idTransacaoExterna: z.string().trim().min(1).max(255),
  valorTotal: valorMonetario,
  dataHoraTransacao: z.coerce.date(),
  eventoId: z.coerce.number().int().positive().optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  itens: z.json().optional(),
}).strict();

export const esquemaReceberVendaConsumo = z.object({
  corpo: esquemaDadosVendaConsumo,
  parametros: z.object({}),
  consulta: z.object({}),
});

const esquemaLoteVendasConsumo = z.array(esquemaDadosVendaConsumo)
  .min(1, 'O lote precisa conter ao menos uma venda.')
  .max(100, 'O lote pode conter no máximo 100 vendas.')
  .superRefine((vendas, contexto) => {
    const identificadores = new Set();
    vendas.forEach((venda, indice) => {
      if (identificadores.has(venda.idTransacaoExterna)) {
        contexto.addIssue({
          code: 'custom',
          path: [indice, 'idTransacaoExterna'],
          message: 'A transação externa não pode se repetir no mesmo lote.',
        });
      }
      identificadores.add(venda.idTransacaoExterna);
    });
  });

export const esquemaReceberLoteVendasConsumo = z.object({
  corpo: z.object({ vendas: esquemaLoteVendasConsumo }).strict(),
  parametros: z.object({}),
  consulta: z.object({}),
});

export const esquemaImportarVendasConsumo = esquemaReceberLoteVendasConsumo;
