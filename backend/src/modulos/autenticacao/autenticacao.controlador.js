import { autenticarUsuario, registrarEstabelecimento } from './autenticacao.servico.js';

export function criarControladorAutenticacao({ prisma, configuracao }) {
  return {
    registrar: async (req, res) => {
      const resultado = await registrarEstabelecimento(prisma, req.body);
      res.status(201).json(resultado);
    },
    login: async (req, res) => {
      const resultado = await autenticarUsuario(prisma, req.body, configuracao);
      res.json(resultado);
    },
  };
}
