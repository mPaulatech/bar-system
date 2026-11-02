import { z } from 'zod';

export const esquemaListarRecomendacoes = z.object({
  corpo: z.object({}),
  parametros: z.object({}),
  consulta: z.object({}),
});
