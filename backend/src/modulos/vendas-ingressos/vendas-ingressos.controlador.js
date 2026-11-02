import {
  criarVendaIngresso,
  estornarVendaIngresso,
  listarVendasIngressos,
  obterVendaIngresso,
} from './vendas-ingressos.servico.js';

export function criarControladorVendasIngressos({ prisma }) {
  return {
    criar: async (req, res) => res.status(201).json(await criarVendaIngresso(
      prisma, req.usuario.estabelecimentoId, req.usuario.usuarioId, req.body,
    )),
    obter: async (req, res) => res.json(await obterVendaIngresso(
      prisma, req.usuario.estabelecimentoId, req.params.id,
    )),
    listar: async (req, res) => res.json(await listarVendasIngressos(
      prisma, req.usuario.estabelecimentoId, req.validado.consulta,
    )),
    estornar: async (req, res) => res.json(await estornarVendaIngresso(
      prisma, req.usuario.estabelecimentoId, req.params.id,
    )),
  };
}
