import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import { esquemaAtualizarEstabelecimento } from './estabelecimento.esquemas.js';
import { criarControladorEstabelecimento } from './estabelecimento.controlador.js';

export function criarRotasEstabelecimento(dependencias) {
  const router = express.Router();
  const controlador = criarControladorEstabelecimento(dependencias);
  router.get('/', controlador.obter);
  router.patch('/', exigirPerfil('GESTOR'), validar(esquemaAtualizarEstabelecimento), controlador.atualizar);
  router.post('/api-key', exigirPerfil('GESTOR'), controlador.gerarApiKey);
  return router;
}
