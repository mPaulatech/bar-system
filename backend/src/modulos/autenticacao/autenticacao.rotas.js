import express from 'express';
import rateLimit from 'express-rate-limit';
import { validar } from '../../middlewares/validacao.js';
import { esquemaLogin, esquemaRegistro } from './autenticacao.esquemas.js';
import { criarControladorAutenticacao } from './autenticacao.controlador.js';

export function criarRotasAutenticacao(dependencias) {
  const router = express.Router();
  const controlador = criarControladorAutenticacao(dependencias);
  const limiteLogin = rateLimit({
    windowMs: dependencias.configuracao.loginJanelaMinutos * 60 * 1000,
    limit: dependencias.configuracao.loginLimiteTentativas,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { status: 'falha', mensagem: 'Muitas tentativas de login. Tente novamente mais tarde.' },
  });

  router.post('/registro-estabelecimento', validar(esquemaRegistro), controlador.registrar);
  router.post('/login', limiteLogin, validar(esquemaLogin), controlador.login);
  return router;
}
