import express from 'express';
import { exigirPerfil } from '../src/middlewares/autenticacao.js';
import { validar } from '../src/middlewares/validacao.js';
import { criarControladorRecomendacoes } from './recomendacoes.controlador.js';
import { esquemaListarRecomendacoes } from './recomendacoes.esquemas.js';

export function criarRotasRecomendacoes(dependencias) {
  const router = express.Router();
  const controlador = criarControladorRecomendacoes(dependencias);

  router.get('/', exigirPerfil('GESTOR'), validar(esquemaListarRecomendacoes), controlador.listar);
  return router;
}
