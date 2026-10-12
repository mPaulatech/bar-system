import express from 'express';
import rateLimit from 'express-rate-limit';
import { validar } from '../../middlewares/validacao.js';
import { esquemaLogin, esquemaRegistro } from './autenticacao.esquemas.js';
import { criarControladorAutenticacao } from './autenticacao.controlador.js';

export function criarRotasAutenticacao(dependencias) {
  const router = express.Router();
  const controlador = criarControladorAutenticacao(dependencias);
  const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { status: 'falha', mensagem: 'Muitas tentativas de login. Tente novamente mais tarde.' },
  });

  router.post('/registro-estabelecimento', validar(esquemaRegistro), controlador.registrar);
  router.post('/login', limiteLogin, validar(esquemaLogin), controlador.login);
  return router;
}
