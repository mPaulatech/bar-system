import { z } from 'zod';

const esquemaAmbiente = z.object({
  DATABASE_URL: z.string().url('deve ser uma URL válida'),
  JWT_SECRET: z.string().min(16, 'deve ter pelo menos 16 caracteres'),
  JWT_EXPIRA_EM: z.string().regex(/^\d+(s|m|h|d)$/, 'use um período como 15m, 1h ou 1d'),
  PORTA: z.coerce.number().int().min(1).max(65535),
  FRONTEND_URL: z.string().url('deve ser uma URL válida'),
});

/**
 * Valida as variáveis de ambiente e devolve a configuração da aplicação.
 * @param {NodeJS.ProcessEnv} variaveis Variáveis disponíveis no processo.
 * @returns {{databaseUrl: string, jwtSecret: string, jwtExpiraEm: string, porta: number, frontendUrl: string}} Configuração validada.
 * @throws {Error} Quando alguma variável estiver ausente ou inválida.
 */
export function lerConfiguracao(variaveis = process.env) {
  const resultado = esquemaAmbiente.safeParse(variaveis);

  if (!resultado.success) {
    const mensagens = resultado.error.issues
      .map((problema) => `${problema.path[0]}: ${problema.message}`)
      .join('; ');
    throw new Error(`Configuração inválida: ${mensagens}`);
  }

  return {
    databaseUrl: resultado.data.DATABASE_URL,
    jwtSecret: resultado.data.JWT_SECRET,
    jwtExpiraEm: resultado.data.JWT_EXPIRA_EM,
    porta: resultado.data.PORTA,
    frontendUrl: resultado.data.FRONTEND_URL,
  };
}
