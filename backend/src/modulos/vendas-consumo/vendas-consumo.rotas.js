import express from 'express';
import { autenticarApiKey } from '../../middlewares/api-key.js';
import { validar } from '../../middlewares/validacao.js';
import { criarControladorVendasConsumo } from './vendas-consumo.controlador.js';
import { esquemaReceberVendaConsumo } from './vendas-consumo.esquemas.js';

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
  return router;
}
