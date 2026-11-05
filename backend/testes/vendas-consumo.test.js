import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { criarAplicacao } from '../src/app.js';

const configuracao = {
  frontendUrl: 'http://localhost:5173',
  jwtSecret: 'segredo-de-teste-com-mais-de-16',
};
const apiKey = 'dbk_chave-de-teste';

class PrismaFake {
  constructor() {
    this.eventos = [
      {
        id: 1, estabelecimentoId: 1, nome: 'Noite Rock',
        dataHora: new Date('2026-11-05T20:00:00Z'), duracaoHoras: 8,
      },
      {
        id: 2, estabelecimentoId: 1, nome: 'Noite Pop',
        dataHora: new Date('2026-11-06T22:00:00Z'), duracaoHoras: 8,
      },
      {
        id: 3, estabelecimentoId: 2, nome: 'Evento de outra casa',
        dataHora: new Date('2026-11-05T20:00:00Z'), duracaoHoras: 8,
      },
    ];
    this.clientes = [{ id: 1, estabelecimentoId: 1 }];
    this.vendasConsumo = [];
    this.vendasIngressos = [];
    this.estabelecimento = {
      findUnique: async ({ where }) => (
        where.apiKeyHash === createHash('sha256').update(apiKey).digest('hex')
          ? { id: 1 }
          : null
      ),
    };
    this.evento = {
      findFirst: async ({ where, select }) => {
        const evento = this.eventos.find((item) => (
          item.id === where.id && item.estabelecimentoId === where.estabelecimentoId
        ));
        return evento
          ? Object.fromEntries(Object.keys(select).map((campo) => [campo, evento[campo]]))
          : null;
      },
      findMany: async ({ where }) => this.eventos.filter((evento) => (
        evento.estabelecimentoId === where.estabelecimentoId
        && evento.dataHora >= where.dataHora.gte
        && evento.dataHora <= where.dataHora.lte
      )),
    };
    this.cliente = {
      findFirst: async ({ where }) => this.clientes.find((cliente) => (
        cliente.id === where.id && cliente.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
    };
    this.vendaConsumoApi = {
      create: async ({ data }) => {
        if (this.vendasConsumo.some((venda) => (
          venda.estabelecimentoId === data.estabelecimentoId
          && venda.idTransacaoExterna === data.idTransacaoExterna
        ))) {
          throw Object.assign(new Error('Transação duplicada.'), { code: 'P2002' });
        }
        const venda = { id: this.vendasConsumo.length + 1, criadoEm: new Date(), ...data };
        this.vendasConsumo.push(venda);
        return venda;
      },
      findUnique: async ({ where }) => this.vendasConsumo.find((venda) => (
        venda.estabelecimentoId === where.estabelecimentoId_idTransacaoExterna.estabelecimentoId
        && venda.idTransacaoExterna
          === where.estabelecimentoId_idTransacaoExterna.idTransacaoExterna
      )) ?? null,
      aggregate: async ({ where }) => {
        const vendas = this.vendasConsumo.filter((venda) => (
          venda.estabelecimentoId === where.estabelecimentoId && venda.eventoId === where.eventoId
        ));
        return {
          _sum: {
            valorTotal: vendas.reduce(
              (total, venda) => total.add(venda.valorTotal),
              new Prisma.Decimal(0),
            ),
          },
        };
      },
    };
    this.vendaIngresso = {
      count: async ({ where }) => this.vendasIngressos.filter((venda) => (
        venda.estabelecimentoId === where.estabelecimentoId
        && venda.eventoId === where.eventoId
        && venda.statusVenda === where.statusVenda
        && venda.statusCheckin === where.statusCheckin
      )).length,
    };
  }

  async $transaction(callback) {
    return callback(this);
  }
}

function token(perfil = 'GESTOR', estabelecimentoId = 1) {
  return jwt.sign({ usuarioId: 1, estabelecimentoId, perfil }, configuracao.jwtSecret);
}

async function requisitar(aplicacao, caminho, opcoes = {}) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    return await fetch(`http://127.0.0.1:${port}${caminho}`, {
      ...opcoes,
      headers: { 'content-type': 'application/json', ...(opcoes.headers ?? {}) },
    });
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => (
      erro ? rejeitar(erro) : resolve()
    )));
  }
}

function vendaConsumo(idTransacaoExterna, dados = {}) {
  return {
    idTransacaoExterna,
    valorTotal: '25.50',
    dataHoraTransacao: '2026-11-05T23:00:00Z',
    ...dados,
  };
}

test('recebe consumo sem cliente, identifica evento pelo horário e trata repetição', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const opcoes = {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: JSON.stringify(vendaConsumo('venda-1')),
  };

  const primeira = await requisitar(aplicacao, '/v1/integracoes/consumo', opcoes);
  const corpoPrimeira = await primeira.json();
  assert.equal(primeira.status, 201);
  assert.equal(corpoPrimeira.eventoId, 1);
  assert.equal(corpoPrimeira.clienteId, null);
  assert.equal(corpoPrimeira.valorTotal, '25.50');
  assert.equal(prisma.vendasConsumo.length, 1);

  const repetida = await requisitar(aplicacao, '/v1/integracoes/consumo', opcoes);
  assert.equal(repetida.status, 200);
  assert.equal((await repetida.json()).id, corpoPrimeira.id);
  assert.equal(prisma.vendasConsumo.length, 1);
});

test('prioriza evento informado e deixa consumo sem evento quando há horários sobrepostos', async () => {
  const prisma = new PrismaFake();
  prisma.eventos.push({
    id: 4, estabelecimentoId: 1, nome: 'Evento sobreposto',
    dataHora: new Date('2026-11-05T21:00:00Z'), duracaoHoras: 6,
  });
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const autenticacao = { 'x-api-key': apiKey };

  const manual = await requisitar(aplicacao, '/v1/integracoes/consumo', {
    method: 'POST',
    headers: autenticacao,
    body: JSON.stringify(vendaConsumo('venda-manual', { eventoId: 2 })),
  });
  assert.equal(manual.status, 201);
  assert.equal((await manual.json()).eventoId, 2);

  const ambiguo = await requisitar(aplicacao, '/v1/integracoes/consumo', {
    method: 'POST',
    headers: autenticacao,
    body: JSON.stringify(vendaConsumo('venda-ambigua')),
  });
  assert.equal(ambiguo.status, 201);
  assert.equal((await ambiguo.json()).eventoId, null);

  const eventoDeOutroEstabelecimento = await requisitar(aplicacao, '/v1/integracoes/consumo', {
    method: 'POST',
    headers: autenticacao,
    body: JSON.stringify(vendaConsumo('venda-invalida', { eventoId: 3 })),
  });
  assert.equal(eventoDeOutroEstabelecimento.status, 404);
});

test('calcula faturamento e ticket médio com check-ins e restringe resumo ao gestor', async () => {
  const prisma = new PrismaFake();
  prisma.vendasConsumo.push(
    { estabelecimentoId: 1, eventoId: 1, valorTotal: new Prisma.Decimal('45.50') },
    { estabelecimentoId: 1, eventoId: 1, valorTotal: new Prisma.Decimal('10.25') },
    { estabelecimentoId: 2, eventoId: 1, valorTotal: new Prisma.Decimal('999.00') },
  );
  prisma.vendasIngressos.push(
    { estabelecimentoId: 1, eventoId: 1, statusVenda: 'CONFIRMADA', statusCheckin: 'UTILIZADO' },
    { estabelecimentoId: 1, eventoId: 1, statusVenda: 'CONFIRMADA', statusCheckin: 'UTILIZADO' },
    { estabelecimentoId: 1, eventoId: 1, statusVenda: 'ESTORNADA', statusCheckin: 'PENDENTE' },
  );
  const aplicacao = criarAplicacao(configuracao, { prisma });

  const resposta = await requisitar(aplicacao, '/v1/eventos/1/consumo/resumo', {
    headers: { authorization: `Bearer ${token()}` },
  });
  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), {
    evento: { id: 1, nome: 'Noite Rock', dataHora: '2026-11-05T20:00:00.000Z' },
    faturamentoBar: '55.75',
    presentesCheckin: 2,
    ticketMedioGeral: '27.88',
  });

  const funcionario = await requisitar(aplicacao, '/v1/eventos/1/consumo/resumo', {
    headers: { authorization: `Bearer ${token('FUNCIONARIO')}` },
  });
  assert.equal(funcionario.status, 403);
});

test('exige API Key válida e valida os dados recebidos', async () => {
  const aplicacao = criarAplicacao(configuracao, { prisma: new PrismaFake() });
  const semChave = await requisitar(aplicacao, '/v1/integracoes/consumo', {
    method: 'POST',
    body: JSON.stringify(vendaConsumo('venda-sem-chave')),
  });
  assert.equal(semChave.status, 401);

  const dadosInvalidos = await requisitar(aplicacao, '/v1/integracoes/consumo', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: JSON.stringify(vendaConsumo('venda-invalida', { valorTotal: '-1' })),
  });
  assert.equal(dadosInvalidos.status, 400);
});
