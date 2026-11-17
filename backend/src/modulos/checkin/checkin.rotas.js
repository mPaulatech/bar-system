import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaListarCheckin,
  esquemaRealizarCheckin,
} from './checkin.esquemas.js';
import { criarControladorCheckin } from './checkin.controlador.js';

export function criarRotasCheckin(dependencias) {
  const router = express.Router();
  const controlador = criarControladorCheckin(dependencias);
  router.use(exigirPerfil('GESTOR', 'FUNCIONARIO'));
  router.post('/', validar(esquemaRealizarCheckin), controlador.realizar);
  router.get('/presentes', validar(esquemaListarCheckin), controlador.presentes);
  router.get('/ausentes', validar(esquemaListarCheckin), controlador.ausentes);
  return router;
}
