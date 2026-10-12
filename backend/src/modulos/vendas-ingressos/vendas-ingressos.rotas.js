import express from 'express';
import { exigirPerfil } from '../../middlewares/autenticacao.js';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaCriarVendaIngresso,
  esquemaIdVendaIngresso,
  esquemaListarVendasIngressos,
} from './vendas-ingressos.esquemas.js';
import { criarControladorVendasIngressos } from './vendas-ingressos.controlador.js';

export function criarRotasVendasIngressos(dependencias) {
  const router = express.Router();
  const controlador = criarControladorVendasIngressos(dependencias);
  router.post('/', exigirPerfil('GESTOR', 'FUNCIONARIO'), validar(esquemaCriarVendaIngresso), controlador.criar);
  router.get('/', validar(esquemaListarVendasIngressos), controlador.listar);
  router.get('/:id', validar(esquemaIdVendaIngresso), controlador.obter);
  router.post('/:id/estorno', exigirPerfil('GESTOR'), validar(esquemaIdVendaIngresso), controlador.estornar);
  return router;
}
