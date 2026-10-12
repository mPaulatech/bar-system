import { alterarAtivo, criarFuncionario, listarFuncionarios } from './usuarios.servico.js';

export function criarControladorUsuarios({ prisma }) {
  return {
    criar: async (req, res) => {
      res.status(201).json(await criarFuncionario(prisma, req.usuario.estabelecimentoId, req.body));
    },
    listar: async (req, res) => {
      res.json(await listarFuncionarios(prisma, req.usuario.estabelecimentoId));
    },
    alterarAtivo: async (req, res) => {
      res.json(await alterarAtivo(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.id,
        req.body.ativo,
      ));
    },
  };
}
