import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { prisma as prismaPadrao } from '../src/banco/prisma.js';
import { autenticacao } from '../src/middlewares/autenticacao.js';
import { tratamentoErros } from '../src/middlewares/tratamento-erros.js';
import { criarRotasRecomendacoes } from './recomendacoes.rotas.js';

export function criarAplicacaoRecomendacoes(configuracao, dependencias = {}) {
  const aplicacao = express();
  const prisma = dependencias.prisma ?? prismaPadrao;

  aplicacao.use(helmet());
  aplicacao.use(cors({ origin: configuracao.frontendUrl }));
  aplicacao.use(express.json({ limit: '1mb' }));
  aplicacao.get('/v1/saude', (req, res) => res.json({ status: 'ok' }));
  aplicacao.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { status: 'falha', mensagem: 'Limite de requisições excedido. Tente novamente mais tarde.' },
  }));
  aplicacao.use(autenticacao(configuracao));
  aplicacao.use('/v1/recomendacoes', criarRotasRecomendacoes({ prisma }));
  aplicacao.use(tratamentoErros);

  return aplicacao;
}
