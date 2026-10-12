import {
  atualizarIngressoTipo,
  criarIngressoTipo,
  excluirIngressoTipo,
  listarIngressosTipos,
  obterIngressoTipo,
} from './ingressos-tipos.servico.js';

export function criarControladorIngressosTipos({ prisma }) {
  return {
    criar: async (req, res) => {
      res.status(201).json(await criarIngressoTipo(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.eventoId,
        req.body,
      ));
    },
    listar: async (req, res) => {
      res.json(await listarIngressosTipos(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.eventoId,
      ));
    },
    obter: async (req, res) => {
      res.json(await obterIngressoTipo(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.eventoId,
        req.params.id,
      ));
    },
    atualizar: async (req, res) => {
      res.json(await atualizarIngressoTipo(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.eventoId,
        req.params.id,
        req.body,
      ));
    },
    excluir: async (req, res) => {
      res.json(await excluirIngressoTipo(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.eventoId,
        req.params.id,
      ));
    },
  };
}
