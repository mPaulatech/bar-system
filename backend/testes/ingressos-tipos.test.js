import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { criarAplicacao } from '../src/app.js';

const configuracao = {
  frontendUrl: 'http://localhost:5173',
  jwtSecret: 'segredo-de-teste-com-mais-de-16',
  jwtExpiraEm: '1h',
};

class PrismaFake {
  constructor() {
    this.eventos = [
      { id: 1, estabelecimentoId: 1, status: 'ATIVO' },
      { id: 2, estabelecimentoId: 1, status: 'ENCERRADO' },
      { id: 3, estabelecimentoId: 1, status: 'RASCUNHO' },
      { id: 4, estabelecimentoId: 2, status: 'ATIVO' },
    ];
    this.tipos = [];
    this.vendas = [];
    this.proximoTipo = 1;
    this.evento = {
      findFirst: ({ where }) => this.eventos.find((evento) => (
        evento.id === where.id && evento.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
    };
    this.ingressoTipo = {
      create: ({ data }) => {
        const tipo = {
          id: this.proximoTipo++,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          ...data,
        };
        this.tipos.push(tipo);
        return tipo;
      },
      findMany: ({ where }) => this.tipos.filter((tipo) => (
        tipo.estabelecimentoId === where.estabelecimentoId && tipo.eventoId === where.eventoId
      )),
      findFirst: ({ where }) => this.tipos.find((tipo) => (
        tipo.id === where.id
        && tipo.eventoId === where.eventoId
        && tipo.estabelecimentoId === where.estabelecimentoId
      )) ?? null,
      update: ({ where, data }) => {
        const tipo = this.tipos.find((item) => item.id === where.id);
        Object.assign(tipo, data);
        return tipo;
      },
      delete: ({ where }) => {
        this.tipos = this.tipos.filter((tipo) => tipo.id !== where.id);
      },
    };
    this.vendaIngresso = {
      count: ({ where }) => this.vendas.filter((venda) => (
        venda.estabelecimentoId === where.estabelecimentoId
        && venda.eventoId === where.eventoId
        && venda.ingressoTipoId === where.ingressoTipoId
        && venda.statusVenda === where.statusVenda
      )).length,
    };
    this.opcoesTransacao = [];
    this.$transaction = async (operacao, opcoes) => {
      this.opcoesTransacao.push(opcoes);
      return operacao(this);
    };
  }
}

function token(perfil) {
  return jwt.sign({ usuarioId: 1, estabelecimentoId: 1, perfil }, configuracao.jwtSecret);
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

test('gestor cria, lista quantidade restante e funcionário não edita', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const criado = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: `Bearer ${token('GESTOR')}` },
    body: { nome: 'VIP', preco: 90, quantidadeDisponivel: 10 },
  }));
  assert.equal(criado.status, 201);
  const tipo = await criado.json();
  prisma.vendas.push({
    estabelecimentoId: 1, eventoId: 1, ingressoTipoId: tipo.id, statusVenda: 'CONFIRMADA',
  });
  prisma.vendas.push({
    estabelecimentoId: 1, eventoId: 1, ingressoTipoId: tipo.id, statusVenda: 'ESTORNADA',
  });

  const lista = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', {
    headers: { authorization: `Bearer ${token('FUNCIONARIO')}` },
  });
  assert.equal(lista.status, 200);
  const dadosLista = (await lista.json())[0];
  assert.equal(dadosLista.quantidadeRestante, 10);
  assert.equal(dadosLista.esgotado, false);

  const proibido = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: `Bearer ${token('FUNCIONARIO')}` },
    body: { nome: 'VIP novo' },
  }));
  assert.equal(proibido.status, 403);
});

test('regras de evento encerrado, valores e redução abaixo do vendido', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const encerrado = await requisitar(aplicacao, '/v1/eventos/2/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: `Bearer ${token('GESTOR')}` },
    body: { nome: 'Cortesia', preco: 0, quantidadeDisponivel: 10 },
  }));
  assert.equal(encerrado.status, 409);

  const invalido = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: `Bearer ${token('GESTOR')}` },
    body: { nome: 'Meia', preco: -1, quantidadeDisponivel: -2 },
  }));
  assert.equal(invalido.status, 400);

  const criado = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: `Bearer ${token('GESTOR')}` },
    body: { nome: 'Pista', preco: 45, quantidadeDisponivel: 2 },
  }));
  const tipo = await criado.json();
  prisma.vendas.push({
    estabelecimentoId: 1, eventoId: 1, ingressoTipoId: tipo.id, statusVenda: 'CONFIRMADA',
  });
  prisma.vendas.push({
    estabelecimentoId: 1, eventoId: 1, ingressoTipoId: tipo.id, statusVenda: 'ESTORNADA',
  });
  const reduzir = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: `Bearer ${token('GESTOR')}` },
    body: { quantidadeDisponivel: 0 },
  }));
  assert.equal(reduzir.status, 409);
  assert.equal(prisma.tipos.find((item) => item.id === tipo.id).quantidadeDisponivel, 2);

  const igualAoMinimo = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { quantidadeDisponivel: 1 },
  }));
  assert.equal(igualAoMinimo.status, 200);
  assert.equal((await igualAoMinimo.json()).quantidadeRestante, 1);
  assert.equal(prisma.opcoesTransacao.at(-1).isolationLevel, 'Serializable');
});

test('lote sem vendas permite redução válida e aumento', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const criado = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Pista', preco: 45, quantidadeDisponivel: 10 },
  }));
  const tipo = await criado.json();

  const reduzir = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { quantidadeDisponivel: 4 },
  }));
  assert.equal(reduzir.status, 200);
  assert.equal((await reduzir.json()).quantidadeRestante, 4);

  const aumentar = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { quantidadeDisponivel: 12 },
  }));
  assert.equal(aumentar.status, 200);
  assert.equal((await aumentar.json()).quantidadeRestante, 12);
});

test('não edita lote de evento encerrado e mantém os dados', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const criado = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Pista', preco: 45, quantidadeDisponivel: 10 },
  }));
  const tipo = await criado.json();
  const original = { ...prisma.tipos.find((item) => item.id === tipo.id) };
  prisma.eventos.find((evento) => evento.id === 1).status = 'ENCERRADO';

  const resposta = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Pista nova', preco: 60, quantidadeDisponivel: 20 },
  }));

  assert.equal(resposta.status, 409);
  assert.deepEqual(prisma.tipos.find((item) => item.id === tipo.id), original);
});

test('continua editando lotes de eventos ativos e em rascunho', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const ativo = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Pista', preco: 45, quantidadeDisponivel: 10 },
  }));
  const tipoAtivo = await ativo.json();
  const rascunho = await requisitar(aplicacao, '/v1/eventos/3/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'VIP', preco: 90, quantidadeDisponivel: 5 },
  }));
  const tipoRascunho = await rascunho.json();

  const atualizarAtivo = await requisitar(aplicacao, `/v1/eventos/1/ingressos-tipos/${tipoAtivo.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Pista atualizada' },
  }));
  const atualizarRascunho = await requisitar(aplicacao, `/v1/eventos/3/ingressos-tipos/${tipoRascunho.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'VIP atualizada' },
  }));

  assert.equal(atualizarAtivo.status, 200);
  assert.equal((await atualizarAtivo.json()).nome, 'Pista atualizada');
  assert.equal(atualizarRascunho.status, 200);
  assert.equal((await atualizarRascunho.json()).nome, 'VIP atualizada');
});

test('não permite editar lote por evento de outro estabelecimento', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const criado = await requisitar(aplicacao, '/v1/eventos/1/ingressos-tipos', json({
    method: 'POST',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Pista', preco: 45, quantidadeDisponivel: 10 },
  }));
  const tipo = await criado.json();
  const original = { ...prisma.tipos.find((item) => item.id === tipo.id) };

  const resposta = await requisitar(aplicacao, `/v1/eventos/4/ingressos-tipos/${tipo.id}`, json({
    method: 'PATCH',
    headers: { authorization: 'Bearer ' + token('GESTOR') },
    body: { nome: 'Acesso indevido' },
  }));

  assert.equal(resposta.status, 404);
  assert.deepEqual(prisma.tipos.find((item) => item.id === tipo.id), original);
});
