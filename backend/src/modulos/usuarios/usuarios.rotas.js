import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaAlterarAtivo,
  esquemaCriarFuncionario,
  esquemaListarFuncionarios,
} from './usuarios.esquemas.js';
import { criarControladorUsuarios } from './usuarios.controlador.js';

export function criarRotasUsuarios(dependencias) {
  const router = express.Router();
  const controlador = criarControladorUsuarios(dependencias);
  router.use(exigirPerfil('GESTOR'));
  router.post('/funcionarios', validar(esquemaCriarFuncionario), controlador.criar);
  router.get('/funcionarios', validar(esquemaListarFuncionarios), controlador.listar);
  router.patch('/funcionarios/:id/ativo', validar(esquemaAlterarAtivo), controlador.alterarAtivo);
  return router;
}
