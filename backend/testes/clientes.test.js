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
    this.clientes = [];
    this.proximoId = 1;
    this.cliente = {
      create: async ({ data, select }) => {
        if (this.clientes.some((item) => item.estabelecimentoId === data.estabelecimentoId
          && item.cpf === data.cpf)) {
          const erro = new Error('CPF duplicado');
          erro.code = 'P2002';
          throw erro;
        }
        const cliente = {
          id: this.proximoId++,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          dataNascimento: null,
          telefone: null,
          ...data,
        };
        this.clientes.push(cliente);
        return selecionar(cliente, select);
      },
      findFirst: async ({ where, select }) => selecionar(
        this.clientes.find((item) => (
          (where.id === undefined || item.id === where.id)
          && (where.estabelecimentoId === undefined
            || item.estabelecimentoId === where.estabelecimentoId)
          && (where.cpf === undefined || item.cpf === where.cpf)
        )),
        select,
      ),
      count: async ({ where }) => this.clientes.filter((item) => (
        item.estabelecimentoId === where.estabelecimentoId
        && (!where.cpf || item.cpf === where.cpf)
        && (!where.nome || item.nome.toLowerCase().includes(where.nome.contains.toLowerCase()))
      )).length,
      findMany: async ({ where, skip, take, select }) => this.clientes
        .filter((item) => (
          item.estabelecimentoId === where.estabelecimentoId
          && (!where.cpf || item.cpf === where.cpf)
          && (!where.nome || item.nome.toLowerCase().includes(where.nome.contains.toLowerCase()))
        ))
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .slice(skip, skip + take)
        .map((item) => selecionar(item, select)),
      update: async ({ where, data, select }) => {
        const cliente = this.clientes.find((item) => item.id === where.id);
        Object.assign(cliente, data, { atualizadoEm: new Date() });
        return selecionar(cliente, select);
      },
    };
  }
}

function selecionar(valor, select) {
  if (!valor || !select) return valor ?? null;
  return Object.fromEntries(Object.keys(select)
    .filter((campo) => select[campo])
    .map((campo) => [campo, valor[campo]]));
}

function requisitar(
  aplicacao,
  caminho,
  metodo,
  corpo,
  estabelecimentoId = 1,
  perfil = 'GESTOR',
) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  return fetch(`http://127.0.0.1:${port}${caminho}`, {
    method: metodo,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${jwt.sign(
        { usuarioId: 1, estabelecimentoId, perfil },
        configuracao.jwtSecret,
      )}`,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  }).finally(() => new Promise((resolver, rejeitar) => (
    servidor.close((erro) => (erro ? rejeitar(erro) : resolver()))
  )));
}

test('cadastra, consulta, lista, atualiza e isola clientes', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });

  const cadastro = await requisitar(aplicacao, '/v1/clientes', 'POST', {
    nome: '  Ana da Silva  ',
    cpf: '529.982.247-25',
    email: ' ANA@EXEMPLO.COM ',
  });
  assert.equal(cadastro.status, 201);
  const cliente = await cadastro.json();
  assert.equal(cliente.cpf, '52998224725');
  assert.equal(cliente.email, 'ana@exemplo.com');

  const porCpf = await requisitar(aplicacao, '/v1/clientes/cpf/529.982.247-25', 'GET');
  assert.equal(porCpf.status, 200);
  assert.equal((await porCpf.json()).id, cliente.id);

  const lista = await requisitar(aplicacao, '/v1/clientes', 'GET');
  assert.equal((await lista.json()).total, 1);

  const atualizacao = await requisitar(aplicacao, `/v1/clientes/${cliente.id}`, 'PATCH', {
    nome: 'Ana Atualizada',
  });
  assert.equal(atualizacao.status, 200);
  assert.equal((await atualizacao.json()).nome, 'Ana Atualizada');

  const outroEstabelecimento = await requisitar(
    aplicacao, `/v1/clientes/${cliente.id}`, 'GET', undefined, 2,
  );
  assert.equal(outroEstabelecimento.status, 404);
});

test('rejeita CPF, e-mail, nome inválidos e CPF duplicado', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const dados = { nome: 'Cliente', cpf: '52998224725', email: 'cliente@exemplo.com' };

  assert.equal((await requisitar(aplicacao, '/v1/clientes', 'POST', {
    ...dados, cpf: '11111111111',
  })).status, 400);
  assert.equal((await requisitar(aplicacao, '/v1/clientes', 'POST', {
    ...dados, email: 'invalido',
  })).status, 400);
  assert.equal((await requisitar(aplicacao, '/v1/clientes', 'POST', {
    ...dados, nome: '   ',
  })).status, 400);
  assert.equal((await requisitar(aplicacao, '/v1/clientes', 'POST', dados)).status, 201);
  assert.equal((await requisitar(aplicacao, '/v1/clientes', 'POST', dados)).status, 409);
});

test('concorrência de cadastro mantém apenas um cliente por CPF', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const dados = { nome: 'Cliente Concorrente', cpf: '52998224725', email: 'concorrente@exemplo.com' };

  const respostas = await Promise.all([
    requisitar(aplicacao, '/v1/clientes', 'POST', dados),
    requisitar(aplicacao, '/v1/clientes', 'POST', dados),
  ]);

  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [201, 409]);
  assert.equal(prisma.clientes.length, 1);
});

test('funcionário consulta CPF, mas não lista nem atualiza clientes', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const cadastro = await requisitar(aplicacao, '/v1/clientes', 'POST', {
    nome: 'Cliente do PDV',
    cpf: '52998224725',
    email: 'pdv@exemplo.com',
  });
  const cliente = await cadastro.json();

  const consulta = await requisitar(
    aplicacao, '/v1/clientes/cpf/52998224725', 'GET', undefined, 1, 'FUNCIONARIO',
  );
  assert.equal(consulta.status, 200);
  assert.deepEqual(await consulta.json(), {
    id: cliente.id,
    nome: 'Cliente do PDV',
    cpf: '52998224725',
    email: 'pdv@exemplo.com',
  });

  const lista = await requisitar(
    aplicacao, '/v1/clientes', 'GET', undefined, 1, 'FUNCIONARIO',
  );
  assert.equal(lista.status, 403);

  const atualizacao = await requisitar(
    aplicacao,
    `/v1/clientes/${cliente.id}`,
    'PATCH',
    { nome: 'Nome alterado' },
    1,
    'FUNCIONARIO',
  );
  assert.equal(atualizacao.status, 403);
});

test('gestor mantém acesso administrativo e consulta é isolada', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  await requisitar(aplicacao, '/v1/clientes', 'POST', {
    nome: 'Cliente Casa Um',
    cpf: '52998224725',
    email: 'casa1@exemplo.com',
  }, 1);

  const consultaOutroEstabelecimento = await requisitar(
    aplicacao,
    '/v1/clientes/cpf/52998224725',
    'GET',
    undefined,
    2,
    'FUNCIONARIO',
  );
  assert.equal(consultaOutroEstabelecimento.status, 404);

  const listaGestor = await requisitar(
    aplicacao, '/v1/clientes', 'GET', undefined, 1, 'GESTOR',
  );
  assert.equal(listaGestor.status, 200);
  assert.equal((await listaGestor.json()).total, 1);
});
