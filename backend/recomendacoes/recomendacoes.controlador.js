import { calcularRecomendacoes } from './recomendacoes.servico.js';

export function criarControladorRecomendacoes({ prisma }) {
  return {
    listar: async (req, res) => {
      res.json(await calcularRecomendacoes(prisma, req.usuario.estabelecimentoId));
    },
  };
}
