import express from 'express';
import { validar } from '../../middlewares/validacao.js';
import {
  esquemaEstabelecimentoPublico,
  esquemaEventosPublicos,
  esquemaCriarCompraPublica,
  esquemaLotesPublicos,
} from './consulta-publica.esquemas.js';
import { criarControladorConsultaPublica } from './consulta-publica.controlador.js';

export function criarRotasConsultaPublica(dependencias) {
  const router = express.Router();
  const controlador = criarControladorConsultaPublica(dependencias);

  router.get(
    '/estabelecimentos/:identificadorPublico',
    validar(esquemaEstabelecimentoPublico),
    controlador.estabelecimento,
  );
  router.get(
    '/estabelecimentos/:identificadorPublico/eventos',
    validar(esquemaEventosPublicos),
    controlador.eventos,
  );
  router.get(
    '/estabelecimentos/:identificadorPublico/eventos/:eventoId/lotes',
    validar(esquemaLotesPublicos),
    controlador.lotes,
  );
  router.post(
    '/estabelecimentos/:identificadorPublico/compras',
    validar(esquemaCriarCompraPublica),
    controlador.compra,
  );

  return router;
}
