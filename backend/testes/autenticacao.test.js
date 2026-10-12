import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { criarAplicacao } from '../src/app.js';

class PrismaFake {
  constructor() {
    this.estabelecimentos = [];
    this.usuarios = [];
    this.proximoEstabelecimento = 1;
    this.proximoUsuario = 1;
    this.estabelecimento = { create: (args) => this.criarEstabelecimento(args) };
    this.usuario = {
      create: (args) => this.criarUsuario(args),
      findUnique: (args) => this.usuarios.find((usuario) => usuario.email === args.where.email) ?? null,
      findMany: (args) => this.usuarios
        .filter((usuario) => usuario.estabelecimentoId === args.where.estabelecimentoId
          && usuario.perfil === args.where.perfil)
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((usuario) => this.selecionar(usuario, args.select)),
      updateMany: (args) => {
        const usuario = this.usuarios.find((item) => item.id === args.where.id
          && item.estabelecimentoId === args.where.estabelecimentoId
          && item.perfil === args.where.perfil);
        if (!usuario) return { count: 0 };
        Object.assign(usuario, args.data);
        return { count: 1 };
      },
      findFirst: (args) => {
        const usuario = this.usuarios.find((item) => item.id === args.where.id
          && item.estabelecimentoId === args.where.estabelecimentoId);
        return usuario ? this.selecionar(usuario, args.select) : null;
      },
    };
  }

  async $transaction(callback) {
    return callback(this);
  }

  criarEstabelecimento({ data }) {
    if (this.estabelecimentos.some((item) => item.cnpj === data.cnpj)) {
      const erro = new Error('unique'); erro.code = 'P2002'; throw erro;
    }
    const estabelecimento = { id: this.proximoEstabelecimento++, ...data };
    this.estabelecimentos.push(estabelecimento);
    return estabelecimento;
  }

  criarUsuario({ data, select }) {
    if (this.usuarios.some((item) => item.email === data.email)) {
      const erro = new Error('unique'); erro.code = 'P2002'; throw erro;
    }
    const usuario = { id: this.proximoUsuario++, ativo: true, ...data };
    this.usuarios.push(usuario);
    return this.selecionar(usuario, select);
  }

  selecionar(usuario, select) {
    if (!select) return { ...usuario };
    return Object.fromEntries(Object.keys(select)
      .filter((campo) => select[campo])
      .map((campo) => [campo, usuario[campo]]));
  }
}

const configuracao = {
  frontendUrl: 'http://localhost:5173',
  jwtSecret: 'segredo-de-teste-com-mais-de-16',
  jwtExpiraEm: '1h',
};

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

const registro = (sufixo) => ({
  nomeFantasia: `Casa ${sufixo}`,
  razaoSocial: `Casa ${sufixo} Eventos Ltda.`,
  cnpj: sufixo === 'Um' ? '12.345.678/0001-90' : '11.222.333/0001-81',
  emailContato: `contato${sufixo}@example.com`,
  nomeGestor: `Gestor ${sufixo}`,
  emailGestor: `gestor${sufixo}@example.com`,
  senhaGestor: 'Gestor@123456',
});

test('registro, login e rota protegida funcionam', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const criado = await requisitar(aplicacao, '/v1/autenticacao/registro-estabelecimento', json({
    method: 'POST', body: registro('Um'),
  }));
  assert.equal(criado.status, 201);

  const login = await requisitar(aplicacao, '/v1/autenticacao/login', json({
    method: 'POST',
    body: { email: 'gestorum@example.com', senha: 'Gestor@123456' },
  }));
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const funcionarios = await requisitar(aplicacao, '/v1/usuarios/funcionarios', {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(funcionarios.status, 200);
  assert.deepEqual(await funcionarios.json(), []);
});

test('funcionário recebe 403 na rota exclusiva de gestor', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  await requisitar(aplicacao, '/v1/autenticacao/registro-estabelecimento', json({
    method: 'POST', body: registro('Um'),
  }));
  const senhaHash = await bcrypt.hash('Funcionario@123', 4);
  prisma.usuarios.push({
    id: 99, estabelecimentoId: 1, nome: 'Funcionário', email: 'func@example.com',
    senhaHash, perfil: 'FUNCIONARIO', ativo: true,
  });
  const login = await requisitar(aplicacao, '/v1/autenticacao/login', json({
    method: 'POST', body: { email: 'func@example.com', senha: 'Funcionario@123' },
  }));
  const { token } = await login.json();
  const resposta = await requisitar(aplicacao, '/v1/usuarios/funcionarios', {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(resposta.status, 403);
});

test('token de um estabelecimento não acessa funcionários de outro', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });
  for (const sufixo of ['Um', 'Dois']) {
    await requisitar(aplicacao, '/v1/autenticacao/registro-estabelecimento', json({
      method: 'POST', body: registro(sufixo),
    }));
  }
  const login = await requisitar(aplicacao, '/v1/autenticacao/login', json({
    method: 'POST',
    body: { email: 'gestorum@example.com', senha: 'Gestor@123456' },
  }));
  const { token } = await login.json();
  const funcionario = await requisitar(aplicacao, '/v1/usuarios/funcionarios', json({
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: { nome: 'Somente Casa Um', email: 'somenteum@example.com', senha: 'Senha@123456' },
  }));
  assert.equal(funcionario.status, 201);

  const lista = await requisitar(aplicacao, '/v1/usuarios/funcionarios', {
    headers: { authorization: `Bearer ${token}` },
  });
  const dados = await lista.json();
  assert.equal(dados.length, 1);
  assert.equal(dados[0].email, 'somenteum@example.com');
  assert.equal(dados[0].estabelecimentoId, undefined);
});
