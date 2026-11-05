import { createHash } from 'node:crypto';
import { erroHttp } from '../utilitarios/erro-http.js';

/**
 * Autentica uma integração externa pela API Key e identifica seu estabelecimento.
 * @param {{prisma: import('@prisma/client').PrismaClient}} dependencias Dependências da aplicação.
 * @returns {import('express').RequestHandler} Middleware de autenticação.
 */
export function autenticarApiKey({ prisma }) {
  return async (req, res, next) => {
    const chave = req.get('x-api-key');
    if (!chave) return next(erroHttp(401, 'API Key necessária.'));

    const apiKeyHash = createHash('sha256').update(chave).digest('hex');
    const estabelecimento = await prisma.estabelecimento.findUnique({
      where: { apiKeyHash },
      select: { id: true },
    });
    if (!estabelecimento) return next(erroHttp(401, 'API Key inválida.'));

    req.estabelecimentoId = estabelecimento.id;
    return next();
  };
}
