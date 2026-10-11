import { criarAplicacao } from './app.js';
import { lerConfiguracao } from './configuracao/ambiente.js';

const configuracao = lerConfiguracao();
const aplicacao = criarAplicacao(configuracao);

aplicacao.listen(configuracao.porta, () => {
  console.log(`Servidor iniciado na porta ${configuracao.porta}.`);
});
