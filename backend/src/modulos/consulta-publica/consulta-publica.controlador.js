import {
  criarCompraPublica,
  listarEventosPublicos,
  listarLotesPublicos,
  obterEstabelecimentoPublico,
} from './consulta-publica.servico.js';

export function criarControladorConsultaPublica({ prisma }) {
  return {
    estabelecimento: async (req, res) => {
      res.json(await obterEstabelecimentoPublico(
        prisma,
        req.validado.parametros.identificadorPublico,
      ));
    },
    eventos: async (req, res) => {
      res.json(await listarEventosPublicos(
        prisma,
        req.validado.parametros.identificadorPublico,
      ));
    },
    lotes: async (req, res) => {
      res.json(await listarLotesPublicos(
        prisma,
        req.validado.parametros.identificadorPublico,
        req.validado.parametros.eventoId,
      ));
    },
    compra: async (req, res) => {
      res.status(201).json(await criarCompraPublica(
        prisma,
        req.validado.parametros.identificadorPublico,
        req.validado.corpo,
      ));
    },
  };
}
