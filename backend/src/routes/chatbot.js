import express from 'express';
import { z } from 'zod';
import { validar } from '../middlewares/validacao.js';
import { getSugestao } from '../services/geminiService.js';

const esquemaChatbot = z.object({
  corpo: z.object({ mensagem: z.string().trim().min(1).max(2000) }).strict(),
  parametros: z.object({}), consulta: z.object({}),
});

export function criarRotasChatbot(dependencias) {
  const router = express.Router();
  router.post('/', validar(esquemaChatbot), async (req, res) => {
    try {
      const resposta = await getSugestao(req.body.mensagem, {
        prisma: dependencias.prisma, estabelecimentoId: req.usuario.estabelecimentoId,
      });
      return res.json({ resposta });
    } catch (erro) {
      console.error('Erro no chatbot:', erro);
      const indisponivel = erro instanceof Error && erro.status === 503;
      const limiteExcedido = erro instanceof Error && erro.status === 429;
      if (limiteExcedido) {
        return res.status(429).json({ mensagem: 'Limite de sugestões atingido. Tente novamente mais tarde.' });
      }
      if (indisponivel) {
        return res.status(503).json({ mensagem: 'O assistente está indisponível no momento. Tente novamente em instantes.' });
      }
      return res.status(500).json({ mensagem: 'Não foi possível obter uma sugestão agora.' });
    }
  });
  return router;
}
