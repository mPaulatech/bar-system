import assert from 'node:assert/strict';
import test from 'node:test';
import { criarAplicacao } from '../src/app.js';

const aplicacao = criarAplicacao({ frontendUrl: 'http://localhost:5173' });

/**
 * Envia uma requisição HTTP para a aplicação sem iniciar uma porta fixa.
 * @param {string} caminho Caminho da rota a consultar.
 * @returns {Promise<Response>} Resposta HTTP recebida.
 */
async function requisitar(caminho) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();

  try {
    return await fetch(`http://127.0.0.1:${port}${caminho}`);
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
}

test('GET /v1/saude responde com status ok', async () => {
  const resposta = await requisitar('/v1/saude');
  const corpo = await resposta.json();

  assert.equal(resposta.status, 200);
  assert.deepEqual(corpo, { status: 'ok' });
});
