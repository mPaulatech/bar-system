import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { autenticarApiKey } from '../../middlewares/api-key.js';
import { validar } from '../../middlewares/validacao.js';
import { criarControladorVendasConsumo } from './vendas-consumo.controlador.js';
import { normalizarArquivoVendasConsumo } from './vendas-consumo.csv.js';
import {
  esquemaImportarVendasConsumo,
  esquemaReceberLoteVendasConsumo,
  esquemaReceberVendaConsumo,
} from './vendas-consumo.esquemas.js';

/**
 * Monta as rotas de integração do consumo do bar.
 * @param {{prisma: import('@prisma/client').PrismaClient}} dependencias Dependências da aplicação.
 * @returns {import('express').Router} Rotas do módulo.
 */
export function criarRotasVendasConsumo(dependencias) {
  const router = express.Router();
  const controlador = criarControladorVendasConsumo(dependencias);

  router.post(
    '/',
    autenticarApiKey(dependencias),
    validar(esquemaReceberVendaConsumo),
    controlador.receber,
  );
  router.post(
    '/lote',
    autenticarApiKey(dependencias),
    validar(esquemaReceberLoteVendasConsumo),
    controlador.receberLote,
  );
  return router;
}

/**
 * Monta a rota de importação de consumo para gestores autenticados por JWT.
 * @param {object} dependencias Dependências da aplicação.
 * @returns {import('express').Router} Rota de importação gerencial.
 */
export function criarRotasImportacaoVendasConsumo(dependencias) {
  const router = express.Router();
  const controlador = criarControladorVendasConsumo(dependencias);

  router.post(
    '/importacao',
    exigirPerfil('GESTOR'),
    express.text({ type: 'text/csv', limit: '1mb' }),
    normalizarArquivoVendasConsumo,
    validar(esquemaImportarVendasConsumo),
    controlador.receberLote,
  );
  return router;
}
