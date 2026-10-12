import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { criarAplicacao } from '../src/app.js';
import { gerarApiKey } from '../src/modulos/estabelecimento/estabelecimento.servico.js';

const configuracao = {
  frontendUrl: 'http://localhost:5173',
  jwtSecret: 'segredo-de-teste-com-mais-de-16',
  jwtExpiraEm: '1h',
};

class PrismaFake {
  constructor() {
    this.eventos = [];
    this.vendas = [];
    this.estabelecimentos = [{ id: 1, nomeFantasia: 'Casa 1', razaoSocial: 'Casa 1 Ltda.' }];
    this.proximoEvento = 1;
    this.evento = {
      create: ({ data }) => {
        const evento = {
          id: this.proximoEvento++, criadoEm: new Date(), atualizadoEm: new Date(),
          duracaoHoras: 12, ...data,
        };
        this.eventos.push(evento);
        return evento;
      },
      count: ({ where }) => this.filtrar(where).length,
      findMany: ({ where }) => this.filtrar(where),
      findFirst: ({ where }) => this.filtrar(where)[0] ?? null,
      update: ({ where, data }) => {
        const evento = this.eventos.find((item) => item.id === where.id);
        Object.assign(evento, data);
        return evento;
      },
      delete: ({ where }) => {
        this.eventos = this.eventos.filter((item) => item.id !== where.id);
      },
    };
    this.vendaIngresso = {
      count: ({ where }) => this.vendas
        .filter((venda) => venda.estabelecimentoId === where.estabelecimentoId
          && venda.eventoId === where.eventoId).length,
    };
    this.estabelecimento = {
      findUnique: ({ where }) => this.estabelecimentos.find((item) => item.id === where.id) ?? null,
      update: ({ where, data }) => {
        const estabelecimento = this.estabelecimentos.find((item) => item.id === where.id);
        Object.assign(estabelecimento, data);
        return estabelecimento;
      },
    };
  }

  filtrar(where) {
    return this.eventos.filter((evento) => evento.estabelecimentoId === where.estabelecimentoId
      && (!where.id || evento.id === where.id)
      && (!where.status || evento.status === where.status)
      && (!where.generoMusical
        || evento.generoMusical.toLowerCase().includes(where.generoMusical.contains.toLowerCase())));
  }
}

function token(estabelecimentoId, perfil) {
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
    await new Promise((resolve, rejeitar) => servidor.close((erro) => erro ? rejeitar(erro) : resolve()));
  }
}

function json(opcoes) {
  return { ...opcoes, body: JSON.stringify(opcoes.body) };
}

test('gestor cria e lista eventos, funcionário recebe 403 ao criar', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const evento = {
    nome: 'Noite Rock', generoMusical: 'Rock', dataHora: '2026-11-20T22:00:00Z',
  };
  const criado = await requisitar(aplicacao, '/v1/eventos', json({
    method: 'POST', headers: { authorization: `Bearer ${token(1, 'GESTOR')}` }, body: evento,
  }));
  assert.equal(criado.status, 201);
  const lista = await requisitar(aplicacao, '/v1/eventos', {
    headers: { authorization: `Bearer ${token(1, 'FUNCIONARIO')}` },
  });
  assert.equal((await lista.json()).total, 1);
  const proibido = await requisitar(aplicacao, '/v1/eventos', json({
    method: 'POST', headers: { authorization: `Bearer ${token(1, 'FUNCIONARIO')}` }, body: evento,
  }));
  assert.equal(proibido.status, 403);
});

test('evento de outro estabelecimento retorna 404 e venda encerra evento', async () => {
  const prisma = new PrismaFake();
  prisma.eventos.push({
    id: 10, estabelecimentoId: 2, nome: 'Privado', generoMusical: 'Jazz',
    dataHora: new Date(), status: 'ATIVO', duracaoHoras: 12,
  });
  prisma.eventos.push({
    id: 11, estabelecimentoId: 1, nome: 'Vendido', generoMusical: 'Jazz',
    dataHora: new Date(), status: 'ATIVO', duracaoHoras: 12,
  });
  prisma.vendas.push({ estabelecimentoId: 1, eventoId: 11 });
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const outro = await requisitar(aplicacao, '/v1/eventos/10', {
    headers: { authorization: `Bearer ${token(1, 'GESTOR')}` },
  });
  assert.equal(outro.status, 404);
  const excluir = await requisitar(aplicacao, '/v1/eventos/11', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${token(1, 'GESTOR')}` },
  });
  assert.equal(excluir.status, 200);
  assert.equal((await excluir.json()).status, 'ENCERRADO');
});

test('API Key retorna texto puro uma vez e armazena somente hash', async () => {
  const prisma = new PrismaFake();
  const resultado = await gerarApiKey(prisma, 1);
  assert.match(resultado.apiKey, /^dbk_[a-f0-9]{64}$/);
  assert.match(prisma.estabelecimentos[0].apiKeyHash, /^[a-f0-9]{64}$/);
  assert.notEqual(prisma.estabelecimentos[0].apiKeyHash, resultado.apiKey);
  assert.equal(resultado.apiKeyPrefixo, prisma.estabelecimentos[0].apiKeyPrefixo);
});
