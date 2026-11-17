import {
  atualizarCliente,
  criarCliente,
  listarClientes,
  obterClientePorCpf,
  obterClientePorId,
  obterClienteParaVenda,
} from './clientes.servico.js';

/**
 * Cria os controladores do módulo de clientes.
 * @param {{prisma: object}} dependencias Dependências da aplicação.
 * @returns {object} Funções de controlador.
 */
export function criarControladorClientes({ prisma }) {
  return {
    criar: async (req, res) => {
      res.status(201).json(await criarCliente(
        prisma, req.usuario.estabelecimentoId, req.body,
      ));
    },
    listar: async (req, res) => {
      res.json(await listarClientes(
        prisma, req.usuario.estabelecimentoId, req.validado.consulta,
      ));
    },
    obterPorCpf: async (req, res) => {
      res.json(await obterClientePorCpf(
        prisma, req.usuario.estabelecimentoId, req.params.cpf,
      ));
    },
    obterParaVenda: async (req, res) => {
      res.json(await obterClienteParaVenda(
        prisma, req.usuario.estabelecimentoId, req.params.cpf,
      ));
    },
    obterPorId: async (req, res) => {
      res.json(await obterClientePorId(
        prisma, req.usuario.estabelecimentoId, req.params.id,
      ));
    },
    atualizar: async (req, res) => {
      res.json(await atualizarCliente(
        prisma,
        req.usuario.estabelecimentoId,
        req.params.id,
        req.body,
      ));
    },
  };
}
