import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { tratamentoErros } from './middlewares/tratamento-erros.js';

/**
 * Monta a aplicação Express com os middlewares e as rotas iniciais.
 * @param {{frontendUrl: string}} configuracao Configuração necessária para o CORS.
 * @returns {import('express').Express} Aplicação Express pronta para uso.
 */
export function criarAplicacao(configuracao) {
  const aplicacao = express();

  aplicacao.use(helmet());
  aplicacao.use(cors({ origin: configuracao.frontendUrl }));
  aplicacao.use(express.json({ limit: '1mb' }));
  aplicacao.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      status: 'falha',
      mensagem: 'Limite de requisições excedido. Tente novamente mais tarde.',
    },
  }));

  aplicacao.get('/v1/saude', (req, res) => {
    res.json({ status: 'ok' });
  });

  aplicacao.use(tratamentoErros);

  return aplicacao;
}
