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
    this.eventos = [{ id: 1, estabelecimentoId: 1, status: 'ATIVO' }];
    this.tipos = [{ id: 1, eventoId: 1, estabelecimentoId: 1, preco: 50, quantidadeDisponivel: 1 }];
    this.vendas = [];
    this.clientes = [];
    this.proximoId = 1;
    this.evento = {
      findFirst: async ({ where }) => this.eventos.find((item) => (
        item.id === where.id && item.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
    };
    this.ingressoTipo = {
      findFirst: async ({ where }) => this.tipos.find((item) => (
        item.id === where.id && item.eventoId === where.eventoId
        && item.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
      updateMany: async ({ where, data }) => {
        const tipo = this.tipos.find((item) => item.id === where.id
          && item.estabelecimentoId === where.estabelecimentoId
          && item.quantidadeDisponivel > where.quantidadeDisponivel.gt);
        if (!tipo) return { count: 0 };
        tipo.quantidadeDisponivel += data.quantidadeDisponivel.decrement * -1;
        return { count: 1 };
      },
    };
    this.cliente = {
      findFirst: async ({ where }) => this.clientes.find((item) => (
        item.id === where.id || (item.estabelecimentoId === where.estabelecimentoId
          && item.cpf === where.cpf)
      )) ?? null,
      create: async ({ data }) => {
        const cliente = { id: this.clientes.length + 1, ...data };
        this.clientes.push(cliente);
        return cliente;
      },
    };
    this.vendaIngresso = {
      create: async ({ data }) => {
        const venda = {
          id: this.proximoId++, criadoEm: new Date(), statusVenda: 'CONFIRMADA',
          statusCheckin: 'PENDENTE', ...data,
        };
        this.vendas.push(venda);
        return venda;
      },
      count: async ({ where }) => this.vendas.filter((item) => (
        item.estabelecimentoId === where.estabelecimentoId
      )).length,
      findMany: async () => this.vendas,
      findFirst: async ({ where }) => this.vendas.find((item) => (
        item.id === where.id && item.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
    };
  }

  async $transaction(callback) {
    return callback(this);
  }
}

function token(perfil = 'FUNCIONARIO') {
  return jwt.sign({ usuarioId: 1, estabelecimentoId: 1, perfil }, configuracao.jwtSecret);
}

function requisitar(port, caminho, opcoes) {
  return fetch(`http://127.0.0.1:${port}${caminho}`, {
    ...opcoes,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token()}` },
    body: JSON.stringify(opcoes.body),
  });
}

test('várias vendas simultâneas do último ingresso permitem somente uma', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    const respostas = await Promise.all(
      Array.from({ length: 10 }, () => requisitar(port, '/v1/vendas-ingressos', {
        method: 'POST',
        body: { eventoId: 1, ingressoTipoId: 1 },
      })),
    );

    assert.equal(respostas.filter((resposta) => resposta.status === 201).length, 1);
    assert.equal(respostas.filter((resposta) => resposta.status === 409).length, 9);
    assert.equal(prisma.tipos[0].quantidadeDisponivel, 0);
    assert.match((await respostas.find((resposta) => resposta.status === 201).json()).codigoIngresso, /^[A-HJ-NP-Z2-9]{8}$/);
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
});
