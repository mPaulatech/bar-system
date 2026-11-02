import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { calcularRecomendacoes } from '../recomendacoes/recomendacoes.servico.js';
import { criarAplicacaoRecomendacoes } from '../recomendacoes/app.js';

const configuracao = {
  frontendUrl: 'http://localhost:5173',
  jwtSecret: 'segredo-de-teste-com-mais-de-16',
};

function criarPrismaFake() {
  const agora = new Date('2026-11-02T12:00:00.000Z');
  const diasAtras = (dias) => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000);
  const eventos = [
    { id: 1, generoMusical: 'Rock', capacidade: 100, dataHora: diasAtras(10) },
    { id: 2, generoMusical: 'Rock', capacidade: 100, dataHora: diasAtras(50) },
    { id: 3, generoMusical: 'Rock', capacidade: 100, dataHora: diasAtras(90) },
    { id: 4, generoMusical: 'Pop', capacidade: 100, dataHora: diasAtras(10) },
    { id: 5, generoMusical: 'Pop', capacidade: 100, dataHora: diasAtras(50) },
    { id: 6, generoMusical: 'Pop', capacidade: 100, dataHora: diasAtras(90) },
    { id: 7, generoMusical: 'Pop', capacidade: 100, dataHora: diasAtras(120) },
  ];
  const vendas = [
    { eventoId: 1, total: 50 }, { eventoId: 2, total: 60 }, { eventoId: 3, total: 70 },
    { eventoId: 4, total: 20 }, { eventoId: 5, total: 30 }, { eventoId: 6, total: 40 },
    { eventoId: 7, total: 100 },
  ];
  return {
    cliente: {
      findMany: async ({ where }) => {
        assert.equal(where.estabelecimentoId, 10);
        return [
          { id: 1, nome: 'Cliente Inativo', criadoEm: diasAtras(200) },
          { id: 2, nome: 'Cliente Ativo', criadoEm: diasAtras(200) },
          { id: 3, nome: 'Sem compras', criadoEm: diasAtras(61) },
          { id: 4, nome: 'No limite', criadoEm: diasAtras(60) },
        ];
      },
    },
    vendaIngresso: {
      groupBy: async ({ by, where }) => {
        assert.ok(by.includes('clienteId') || by.includes('eventoId'));
        assert.equal(where.estabelecimentoId, 10);
        if (by.includes('clienteId')) {
          return [{ clienteId: 1, _max: { criadoEm: diasAtras(61) } }];
        }
        return vendas
          .filter((venda) => where.eventoId.in.includes(venda.eventoId))
          .map(({ eventoId, total }) => ({ eventoId, _count: { _all: total } }));
      },
    },
    vendaConsumoApi: {
      groupBy: async ({ where }) => {
        assert.equal(where.estabelecimentoId, 10);
        return [{ clienteId: 2, _max: { dataHoraTransacao: diasAtras(2) } }];
      },
    },
    evento: {
      findMany: async ({ where }) => {
        assert.equal(where.estabelecimentoId, 10);
        return eventos;
      },
    },
  };
}

function token(perfil, estabelecimentoId = 10) {
  return jwt.sign({ usuarioId: 1, estabelecimentoId, perfil }, configuracao.jwtSecret);
}

async function requisitar(aplicacao, caminho, autorizacao) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    return await fetch(`http://127.0.0.1:${port}${caminho}`, {
      headers: autorizacao ? { authorization: `Bearer ${autorizacao}` } : {},
    });
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => (
      erro ? rejeitar(erro) : resolve()
    )));
  }
}

test('calcula clientes inativos e adesão média das três edições mais recentes', async () => {
  const recomendacoes = await calcularRecomendacoes(criarPrismaFake(), 10, new Date('2026-11-02T12:00:00.000Z'));

  assert.deepEqual(recomendacoes.clientesInativos.map((cliente) => cliente.nome), [
    'Cliente Inativo',
    'Sem compras',
  ]);
  assert.match(recomendacoes.clientesInativos[0].mensagem, /61 dias/);
  assert.equal(recomendacoes.tiposEventoBaixaAdesao.length, 1);
  assert.equal(recomendacoes.tiposEventoBaixaAdesao[0].generoMusical, 'Pop');
  assert.equal(recomendacoes.tiposEventoBaixaAdesao[0].ocupacaoMediaPercentual, 30);
  assert.equal(recomendacoes.tiposEventoBaixaAdesao[0].edicoesAnalisadas, 3);
});

test('endpoint exige autenticação e perfil gestor', async () => {
  const aplicacao = criarAplicacaoRecomendacoes(configuracao, { prisma: criarPrismaFake() });
  const semAutenticacao = await requisitar(aplicacao, '/v1/recomendacoes');
  const funcionario = await requisitar(aplicacao, '/v1/recomendacoes', token('FUNCIONARIO'));
  const gestor = await requisitar(aplicacao, '/v1/recomendacoes', token('GESTOR'));

  assert.equal(semAutenticacao.status, 401);
  assert.equal(funcionario.status, 403);
  assert.equal(gestor.status, 200);
  const corpo = await gestor.json();
  assert.ok(Array.isArray(corpo.clientesInativos));
  assert.ok(Array.isArray(corpo.tiposEventoBaixaAdesao));
});
