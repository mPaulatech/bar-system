import {
  listarAusentes,
  listarPresentes,
  realizarCheckin,
} from './checkin.servico.js';

export function criarControladorCheckin({ prisma }) {
  return {
    realizar: async (req, res) => res.json(await realizarCheckin(
      prisma,
      req.usuario.estabelecimentoId,
      req.usuario.usuarioId,
      req.body,
    )),
    presentes: async (req, res) => res.json(await listarPresentes(
      prisma,
      req.usuario.estabelecimentoId,
      req.validado.consulta,
    )),
    ausentes: async (req, res) => res.json(await listarAusentes(
      prisma,
      req.usuario.estabelecimentoId,
      req.validado.consulta,
    )),
  };
}
