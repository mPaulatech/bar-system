import jwt from 'jsonwebtoken';
import { erroHttp } from '../utilitarios/erro-http.js';

export function autenticacao({ jwtSecret }) {
  return (req, res, next) => {
    const cabecalho = req.get('authorization');
    const [tipo, token] = cabecalho?.split(' ') ?? [];

    if (tipo !== 'Bearer' || !token) {
      return next(erroHttp(401, 'Autenticação necessária.'));
    }

    try {
      const dados = jwt.verify(token, jwtSecret);
      if (
        typeof dados !== 'object'
        || !Number.isInteger(dados.usuarioId)
        || !Number.isInteger(dados.estabelecimentoId)
        || (dados.perfil !== 'GESTOR' && dados.perfil !== 'FUNCIONARIO')
      ) {
        throw new Error('Payload inválido');
      }
      req.usuario = {
        usuarioId: dados.usuarioId,
        estabelecimentoId: dados.estabelecimentoId,
        perfil: dados.perfil,
      };
      return next();
    } catch {
      return next(erroHttp(401, 'Token inválido ou expirado.'));
    }
  };
}

export function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!req.usuario || !perfis.includes(req.usuario.perfil)) {
      return next(erroHttp(403, 'Você não tem permissão para esta operação.'));
    }
    return next();
  };
}
