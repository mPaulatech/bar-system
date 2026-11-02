import {
  atualizarEstabelecimento,
  gerarApiKey,
  obterEstabelecimento,
} from './estabelecimento.servico.js';

export function criarControladorEstabelecimento({ prisma }) {
  return {
    obter: async (req, res) => {
      res.json(await obterEstabelecimento(prisma, req.usuario.estabelecimentoId));
    },
    atualizar: async (req, res) => {
      res.json(await atualizarEstabelecimento(
        prisma,
        req.usuario.estabelecimentoId,
        req.body,
      ));
    },
    gerarApiKey: async (req, res) => {
      res.status(201).json(await gerarApiKey(prisma, req.usuario.estabelecimentoId));
    },
  };
}
