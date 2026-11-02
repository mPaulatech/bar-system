import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaAtualizarIngressoTipo,
  esquemaCriarIngressoTipo,
  esquemaIdIngressoTipo,
  esquemaListarIngressosTipos,
} from './ingressos-tipos.esquemas.js';
import { criarControladorIngressosTipos } from './ingressos-tipos.controlador.js';

export function criarRotasIngressosTipos(dependencias) {
  const router = express.Router();
  const controlador = criarControladorIngressosTipos(dependencias);
  router.get('/:eventoId/ingressos-tipos', validar(esquemaListarIngressosTipos), controlador.listar);
  router.get('/:eventoId/ingressos-tipos/:id', validar(esquemaIdIngressoTipo), controlador.obter);
  router.post('/:eventoId/ingressos-tipos', exigirPerfil('GESTOR'), validar(esquemaCriarIngressoTipo), controlador.criar);
  router.patch('/:eventoId/ingressos-tipos/:id', exigirPerfil('GESTOR'), validar(esquemaAtualizarIngressoTipo), controlador.atualizar);
  router.delete('/:eventoId/ingressos-tipos/:id', exigirPerfil('GESTOR'), validar(esquemaIdIngressoTipo), controlador.excluir);
  return router;
}
