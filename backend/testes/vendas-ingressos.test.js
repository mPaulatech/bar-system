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
    this.falharCriacaoVenda = false;
    this.evento = {
      findFirst: async ({ where }) => this.eventos.find((item) => (
        item.id === where.id && item.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
    };
    this.ingressoTipo = {
      findFirst: async ({ where }) => this.tipos.find((item) => (
        item.id === where.id && (!where.eventoId || item.eventoId === where.eventoId)
        && item.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
      updateMany: async ({ where, data }) => {
        const tipo = this.tipos.find((item) => item.id === where.id
          && item.estabelecimentoId === where.estabelecimentoId
          && (where.quantidadeDisponivel?.gte === undefined
            || item.quantidadeDisponivel >= where.quantidadeDisponivel.gte));
        if (!tipo) return { count: 0 };
        if (data.quantidadeDisponivel.decrement !== undefined) {
          tipo.quantidadeDisponivel -= data.quantidadeDisponivel.decrement;
        }
        if (data.quantidadeDisponivel.increment !== undefined) {
          tipo.quantidadeDisponivel += data.quantidadeDisponivel.increment;
        }
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
        if (this.falharCriacaoVenda) throw new Error('Falha simulada ao criar ingresso.');
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
      updateMany: async ({ where, data }) => {
        const venda = this.vendas.find((item) => (
          item.id === where.id
          && item.estabelecimentoId === where.estabelecimentoId
          && item.statusVenda === where.statusVenda
          && item.statusCheckin === where.statusCheckin
        ));
        if (!venda) return { count: 0 };
        Object.assign(venda, data);
        return { count: 1 };
      },
    };
  }

  async $transaction(callback) {
    const estado = {
      tipos: structuredClone(this.tipos),
      vendas: structuredClone(this.vendas),
      clientes: structuredClone(this.clientes),
      proximoId: this.proximoId,
    };
    try {
      return await callback(this);
    } catch (erro) {
      this.tipos = estado.tipos;
      this.vendas = estado.vendas;
      this.clientes = estado.clientes;
      this.proximoId = estado.proximoId;
      throw erro;
    }
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

test('venda com várias unidades baixa o estoque uma vez e retorna cada ingresso', async () => {
  const prisma = new PrismaFake();
  prisma.tipos[0].quantidadeDisponivel = 3;
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    const resposta = await requisitar(port, '/v1/vendas-ingressos', {
      method: 'POST',
      body: {
        eventoId: 1, ingressoTipoId: 1, quantidade: 3,
        formaPagamento: 'PIX',
      },
    });
    const corpo = await resposta.json();
    assert.equal(resposta.status, 201);
    assert.equal(corpo.quantidade, 3);
    assert.equal(corpo.vendas.length, 3);
    assert.equal(corpo.formaPagamento, 'PIX');
    assert.equal(corpo.valorTotal.toString(), '150');
    assert.equal(prisma.tipos[0].quantidadeDisponivel, 0);
    assert.match(corpo.vendas[0].codigoIngresso, /^[A-HJ-NP-Z2-9]{8}$/);
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
});

test('estoque insuficiente não cria nenhuma venda', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const resposta = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: {
      eventoId: 1, ingressoTipoId: 1, quantidade: 2,
      formaPagamento: 'DINHEIRO',
    },
  });
  assert.equal(resposta.status, 409);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 1);
});

test('concorrência pelos últimos ingressos não deixa estoque negativo', async () => {
  const prisma = new PrismaFake();
  prisma.tipos[0].quantidadeDisponivel = 2;
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    const respostas = await Promise.all(
      Array.from({ length: 10 }, () => requisitar(port, '/v1/vendas-ingressos', {
        method: 'POST',
        body: {
          eventoId: 1, ingressoTipoId: 1, quantidade: 1,
          formaPagamento: 'CARTAO_DEBITO',
        },
      })),
    );
    assert.equal(respostas.filter((resposta) => resposta.status === 201).length, 2);
    assert.equal(respostas.filter((resposta) => resposta.status === 409).length, 8);
    assert.equal(prisma.tipos[0].quantidadeDisponivel, 0);
    assert.equal(prisma.vendas.length, 2);
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
});

test('estorno devolve uma unidade e não pode ser realizado duas vezes', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });

  const venda = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: {
      eventoId: 1, ingressoTipoId: 1, quantidade: 1,
      formaPagamento: 'PIX',
    },
  });
  const vendaCriada = await venda.json();
  assert.equal(venda.status, 201);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 0);

  const estorno = await requisitarComPerfil(
    aplicacao,
    `/v1/vendas-ingressos/${vendaCriada.vendas[0].id}/estorno`,
    'GESTOR',
  );
  assert.equal(estorno.status, 200);
  assert.equal((await estorno.json()).statusVenda, 'ESTORNADA');
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 1);

  const segundoEstorno = await requisitarComPerfil(
    aplicacao,
    `/v1/vendas-ingressos/${vendaCriada.vendas[0].id}/estorno`,
    'GESTOR',
  );
  assert.equal(segundoEstorno.status, 409);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 1);
});

test('falha durante a venda desfaz a reserva e o cliente criado', async () => {
  const prisma = new PrismaFake();
  prisma.tipos[0].quantidadeDisponivel = 2;
  prisma.falharCriacaoVenda = true;
  const aplicacao = criarAplicacao(configuracao, { prisma });

  const resposta = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: {
      eventoId: 1, ingressoTipoId: 1, quantidade: 2,
      formaPagamento: 'DINHEIRO',
      cpf: '12345678901',
      nomeCliente: 'Cliente de teste',
    },
  });

  assert.equal(resposta.status, 500);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 2);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.clientes.length, 0);
});

async function requisitarEmAplicacao(aplicacao, caminho, opcoes) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    return await requisitar(port, caminho, opcoes);
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
}

async function requisitarComPerfil(aplicacao, caminho, perfil) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    return await fetch(`http://127.0.0.1:${port}${caminho}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token(perfil)}`,
      },
    });
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
}
