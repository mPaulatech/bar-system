import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { prisma as prismaPadrao } from './banco/prisma.js';
import { autenticacao } from './middlewares/autenticacao.js';
import { tratamentoErros } from './middlewares/tratamento-erros.js';
import { criarRotasAutenticacao } from './modulos/autenticacao/autenticacao.rotas.js';
import { criarRotasUsuarios } from './modulos/usuarios/usuarios.rotas.js';
import { criarRotasEventos } from './modulos/eventos/eventos.rotas.js';
import { criarRotasIngressosTipos } from './modulos/ingressos-tipos/ingressos-tipos.rotas.js';
import { criarRotasEstabelecimento } from './modulos/estabelecimento/estabelecimento.rotas.js';
import { criarRotasVendasIngressos } from './modulos/vendas-ingressos/vendas-ingressos.rotas.js';

/**
 * Monta a aplicação Express com os middlewares e as rotas iniciais.
 * @param {{frontendUrl: string}} configuracao Configuração necessária para o CORS.
 * @returns {import('express').Express} Aplicação Express pronta para uso.
 */
export function criarAplicacao(configuracao, dependencias = {}) {
  const aplicacao = express();
  const prisma = dependencias.prisma ?? prismaPadrao;
  const configuracaoCompleta = {
    jwtSecret: configuracao.jwtSecret ?? process.env.JWT_SECRET ?? 'chave-local-desenvolvimento-32',
    jwtExpiraEm: configuracao.jwtExpiraEm ?? process.env.JWT_EXPIRA_EM ?? '8h',
  };

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

  aplicacao.use('/v1/autenticacao', criarRotasAutenticacao({ prisma, configuracao: configuracaoCompleta }));
  aplicacao.use(autenticacao(configuracaoCompleta));
  aplicacao.use('/v1/usuarios', criarRotasUsuarios({ prisma }));
  aplicacao.use('/v1/eventos', criarRotasEventos({ prisma }));
  aplicacao.use('/v1/eventos', criarRotasIngressosTipos({ prisma }));
  aplicacao.use('/v1/estabelecimento', criarRotasEstabelecimento({ prisma }));
  aplicacao.use('/v1/vendas-ingressos', criarRotasVendasIngressos({ prisma }));
  aplicacao.use(tratamentoErros);

  return aplicacao;
}
