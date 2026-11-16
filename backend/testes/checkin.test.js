import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { criarAplicacao } from '../src/app.js';

const configuracao = {
  frontendUrl: 'http://localhost:5173',
  jwtSecret: 'segredo-de-teste-com-mais-de-16',
};

class PrismaFake {
  constructor() {
    this.eventos = [
      { id: 1, estabelecimentoId: 1, nome: 'Evento ativo', status: 'ATIVO' },
      { id: 2, estabelecimentoId: 1, nome: 'Evento inativo', status: 'ENCERRADO' },
    ];
    this.vendas = [
      this.venda('X3QFHM87', 1, 1, 'CONFIRMADA', 'PENDENTE'),
      this.venda('F4G5H6J7', 6, 1, 'CONFIRMADA', 'PENDENTE'),
      this.venda('U2L3Z4A5', 2, 1, 'CONFIRMADA', 'UTILIZADO'),
      this.venda('E5T2R9A8', 3, 1, 'ESTORNADA', 'PENDENTE'),
      this.venda('E4T2V5C7', 4, 1, 'CONFIRMADA', 'PENDENTE', 2),
      this.venda('C4S2D6F8', 5, 2, 'CONFIRMADA', 'PENDENTE'),
    ];
  }

  venda(codigoIngresso, id, estabelecimentoId, statusVenda, statusCheckin, eventoId = 1) {
    return {
      id, codigoIngresso, estabelecimentoId, eventoId, statusVenda, statusCheckin,
      checkinEm: statusCheckin === 'UTILIZADO' ? new Date() : null,
      checkinPorId: statusCheckin === 'UTILIZADO' ? 8 : null,
      ingressoTipo: { nome: 'Pista' },
      cliente: { nome: 'Cliente de teste', cpf: '123', email: 'privado@teste' },
      checkinPor: statusCheckin === 'UTILIZADO' ? { nome: 'Funcionário' } : null,
    };
  }

  selecionar(venda) {
    if (!venda) return null;
    return {
      ...venda,
      evento: this.eventos.find((evento) => evento.id === venda.eventoId),
    };
  }

  matches(venda, where) {
    return Object.entries(where).every(([campo, valor]) => venda[campo] === valor);
  }

  async $transaction(callback) { return callback(this); }

  get evento() {
    return {
      findFirst: async ({ where }) => this.eventos.find((evento) => (
        evento.id === where.id && evento.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
    };
  }

  get vendaIngresso() {
    return {
      findFirst: async ({ where }) => this.selecionar(this.vendas.find((venda) => (
        venda.estabelecimentoId === where.estabelecimentoId
        && (where.id === undefined || venda.id === where.id)
        && (where.codigoIngresso === undefined || venda.codigoIngresso === where.codigoIngresso)
      ))),
      updateMany: async ({ where, data }) => {
        const venda = this.vendas.find((item) => this.matches(item, where));
        if (!venda) return { count: 0 };
        Object.assign(venda, data);
        return { count: 1 };
      },
      count: async ({ where }) => this.vendas.filter((venda) => this.matches(venda, where)).length,
      findMany: async ({ where, skip = 0, take = 20 }) => this.vendas
        .filter((venda) => this.matches(venda, where))
        .slice(skip, skip + take)
        .map((venda) => this.selecionar(venda)),
    };
  }
}

function token(estabelecimentoId, perfil) {
  return jwt.sign({ usuarioId: perfil === 'GESTOR' ? 7 : 8, estabelecimentoId, perfil }, configuracao.jwtSecret);
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
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
}

function json(opcoes) {
  return { ...opcoes, body: JSON.stringify(opcoes.body) };
}

async function checkin(prisma, codigoIngresso, eventoId = 1, perfil = 'FUNCIONARIO', estabelecimentoId = 1) {
  const resposta = await requisitar(criarAplicacao(configuracao, { prisma }), '/v1/checkin', json({
    method: 'POST',
    headers: { authorization: ['Bearer', token(estabelecimentoId, perfil)].join(' ') },
    body: { eventoId, codigoIngresso },
  }));
  return { resposta, corpo: await resposta.json() };
}

test('autoriza gestor e funcionário e não expõe CPF ou e-mail', async () => {
  const prisma = new PrismaFake();
  const gestor = await checkin(prisma, 'X3QFHM87', 1, 'GESTOR');
  assert.equal(gestor.resposta.status, 200);
  assert.equal(gestor.corpo.resultado, 'AUTORIZADO');
  assert.equal(JSON.stringify(gestor.corpo).includes('cpf'), false);
  assert.equal(JSON.stringify(gestor.corpo).includes('email'), false);

  const funcionario = await checkin(prisma, 'F4G5H6J7', 1, 'FUNCIONARIO');
  assert.equal(funcionario.resposta.status, 200);
  assert.equal(funcionario.corpo.resultado, 'AUTORIZADO');

  const estornado = await checkin(prisma, 'E5T2R9A8', 1, 'FUNCIONARIO');
  assert.equal(estornado.resposta.status, 409);
  assert.equal(estornado.corpo.detalhes.resultado, 'ESTORNADO');
});

test('recusa ingresso utilizado, evento incorreto e evento inativo', async () => {
  const prisma = new PrismaFake();
  assert.equal((await checkin(prisma, 'U2L3Z4A5')).corpo.detalhes.resultado, 'JA_UTILIZADO');
  assert.equal((await checkin(prisma, 'E4T2V5C7')).corpo.detalhes.resultado, 'EVENTO_INCORRETO');
  assert.equal((await checkin(prisma, 'X3QFHM87', 2)).corpo.detalhes.resultado, 'EVENTO_INATIVO');
});

test('recusa código de outro estabelecimento e código inválido', async () => {
  const prisma = new PrismaFake();
  assert.equal((await checkin(prisma, 'C4S2D6F8', 1, 'GESTOR', 1)).corpo.detalhes.resultado, 'INGRESSO_INVALIDO');
  assert.equal((await checkin(prisma, 'NA2X3Y4Z')).corpo.detalhes.resultado, 'INGRESSO_INVALIDO');
});

test('a atualização condicional impede dupla entrada simultânea', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const opcoes = json({
    method: 'POST',
    headers: { authorization: ['Bearer', token(1, 'FUNCIONARIO')].join(' ') },
    body: { eventoId: 1, codigoIngresso: 'X3QFHM87' },
  });
  const [primeira, segunda] = await Promise.all([
    requisitar(aplicacao, '/v1/checkin', opcoes),
    requisitar(aplicacao, '/v1/checkin', opcoes),
  ]);
  assert.deepEqual([primeira.status, segunda.status].sort(), [200, 409]);
});

test('lista presentes e ausentes com paginação e sem dados sensíveis', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const presentes = await requisitar(aplicacao, '/v1/checkin/presentes?eventoId=1&pagina=1&limite=20', {
    headers: { authorization: ['Bearer', token(1, 'GESTOR')].join(' ') },
  });
  const ausentes = await requisitar(aplicacao, '/v1/checkin/ausentes?eventoId=1&pagina=1&limite=20', {
    headers: { authorization: ['Bearer', token(1, 'FUNCIONARIO')].join(' ') },
  });
  const presentesJson = await presentes.json();
  const ausentesJson = await ausentes.json();
  assert.equal(presentes.status, 200);
  assert.equal(ausentes.status, 200);
  assert.equal(presentesJson.total, 1);
  assert.equal(ausentesJson.total, 2);
  assert.equal(JSON.stringify(ausentesJson).includes('email'), false);
  assert.equal(JSON.stringify(ausentesJson).includes('cpf'), false);
});
