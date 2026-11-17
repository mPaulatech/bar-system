import {
  receberLoteVendasConsumo,
  receberVendaConsumo,
} from './vendas-consumo.servico.js';

/**
 * Cria controladores para recebimento de consumo e consulta gerencial.
 * @param {{prisma: import('@prisma/client').PrismaClient}} dependencias Dependências da aplicação.
 * @returns {object} Ações HTTP do módulo de consumo.
 */
export function criarControladorVendasConsumo({ prisma }) {
  return {
    receber: async (req, res) => {
      const resultado = await receberVendaConsumo(
        prisma,
        req.estabelecimentoId,
        req.body,
      );
      res.status(resultado.criada ? 201 : 200).json(resultado.venda);
    },
    receberLote: async (req, res) => {
      const resultado = await receberLoteVendasConsumo(
        prisma,
        req.estabelecimentoId ?? req.usuario.estabelecimentoId,
        req.body.vendas,
      );
      res.status(resultado.criadas > 0 ? 201 : 200).json(resultado);
    },
  };
}
