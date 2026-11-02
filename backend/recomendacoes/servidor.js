import { z } from 'zod';
import { prisma } from '../src/banco/prisma.js';
import { lerConfiguracao } from '../src/configuracao/ambiente.js';
import { criarAplicacaoRecomendacoes } from './app.js';

const configuracao = lerConfiguracao();
const porta = z.coerce.number().int().min(1).max(65535).default(3001)
  .parse(process.env.PORTA_RECOMENDACOES);
const aplicacao = criarAplicacaoRecomendacoes(configuracao, { prisma });

const servidor = aplicacao.listen(porta, () => {
  console.log(`Serviço de recomendações iniciado na porta ${porta}.`);
});

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    servidor.close(async (erro) => {
      if (erro) {
        console.error('Falha ao encerrar o serviço de recomendações:', erro);
        process.exitCode = 1;
      }
      await prisma.$disconnect();
    });
  });
}
