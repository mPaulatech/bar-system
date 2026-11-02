import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaAtualizarEvento,
  esquemaCriarEvento,
  esquemaIdEvento,
  esquemaListarEventos,
} from './eventos.esquemas.js';
import { criarControladorEventos } from './eventos.controlador.js';

export function criarRotasEventos(dependencias) {
  const router = express.Router();
  const controlador = criarControladorEventos(dependencias);
  router.get('/ativos', validar(esquemaListarEventos.pick({ corpo: true, parametros: true })), controlador.ativos);
  router.get('/', validar(esquemaListarEventos), controlador.listar);
  router.get('/:id', validar(esquemaIdEvento), controlador.obter);
  router.post('/', exigirPerfil('GESTOR'), validar(esquemaCriarEvento), controlador.criar);
  router.patch('/:id', exigirPerfil('GESTOR'), validar(esquemaAtualizarEvento), controlador.atualizar);
  router.delete('/:id', exigirPerfil('GESTOR'), validar(esquemaIdEvento), controlador.excluir);
  return router;
}
