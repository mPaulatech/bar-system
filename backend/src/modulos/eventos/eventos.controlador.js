import {
  atualizarEvento,
  criarEvento,
  excluirEvento,
  listarEventos,
  listarEventosAtivos,
  obterEvento,
} from './eventos.servico.js';

export function criarControladorEventos({ prisma }) {
  return {
    criar: async (req, res) => {
      res.status(201).json(await criarEvento(prisma, req.usuario.estabelecimentoId, req.body));
    },
    listar: async (req, res) => {
      res.json(await listarEventos(prisma, req.usuario.estabelecimentoId, req.validado.consulta));
    },
    ativos: async (req, res) => {
      res.json(await listarEventosAtivos(prisma, req.usuario.estabelecimentoId));
    },
    obter: async (req, res) => {
      res.json(await obterEvento(prisma, req.usuario.estabelecimentoId, req.params.id));
    },
    atualizar: async (req, res) => {
      res.json(await atualizarEvento(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.id,
        req.body,
      ));
    },
    excluir: async (req, res) => {
      res.json(await excluirEvento(prisma, req.usuario.estabelecimentoId, req.params.id));
    },
  };
}
