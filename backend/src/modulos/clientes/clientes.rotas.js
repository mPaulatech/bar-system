import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaAtualizarCliente,
  esquemaCpfCliente,
  esquemaCriarCliente,
  esquemaIdCliente,
  esquemaListarClientes,
} from './clientes.esquemas.js';
import { criarControladorClientes } from './clientes.controlador.js';

/**
 * Monta as rotas administrativas de clientes.
 * @param {{prisma: object}} dependencias Dependências da aplicação.
 * @returns {import('express').Router} Router configurado.
 */
export function criarRotasClientes(dependencias) {
  const router = express.Router();
  const controlador = criarControladorClientes(dependencias);
  router.get(
    '/cpf/:cpf',
    exigirPerfil('GESTOR', 'FUNCIONARIO'),
    validar(esquemaCpfCliente),
    controlador.obterParaVenda,
  );
  router.use(exigirPerfil('GESTOR'));
  router.get('/:id', validar(esquemaIdCliente), controlador.obterPorId);
  router.get('/', validar(esquemaListarClientes), controlador.listar);
  router.post('/', validar(esquemaCriarCliente), controlador.criar);
  router.patch('/:id', validar(esquemaAtualizarCliente), controlador.atualizar);
  return router;
}
