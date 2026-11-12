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
    this.compras = [];
    this.clientes = [];
    this.proximoId = 1;
    this.falharCriacaoVenda = false;
    this.compra = {
      create: async ({ data }) => {
        const cliente = data.clienteId
          ? this.clientes.find((item) => item.id === data.clienteId)
          : null;
        if (cliente && cliente.estabelecimentoId !== data.estabelecimentoId) {
          throw new Error('Violação de integridade: cliente de outro estabelecimento.');
        }
        const compra = { id: this.compras.length + 1, ...data };
        this.compras.push(compra);
        return compra;
      },
    };
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
        const compra = this.compras.find((item) => item.id === data.compraId);
        if (!compra || compra.estabelecimentoId !== data.estabelecimentoId) {
          throw new Error('Violação de integridade: compra de outro estabelecimento.');
        }
        if (data.clienteId) {
          const cliente = this.clientes.find((item) => item.id === data.clienteId);
          if (!cliente || cliente.estabelecimentoId !== data.estabelecimentoId
            || cliente.id !== compra.clienteId) {
            throw new Error('Violação de integridade: cliente incompatível com a compra.');
          }
        }
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
      compras: this.compras.map((item) => ({ ...item })),
      clientes: structuredClone(this.clientes),
      proximoId: this.proximoId,
    };
    try {
      return await callback(this);
    } catch (erro) {
      this.tipos = estado.tipos;
      this.vendas = estado.vendas;
      this.compras = estado.compras;
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
        nomeCliente: 'Cliente de teste',
        cpf: '529.982.247-25',
        emailCliente: 'cliente@exemplo.com',
      },
    });
    const corpo = await resposta.json();
    assert.equal(resposta.status, 201);
    assert.equal(corpo.quantidade, 3);
    assert.equal(corpo.vendas.length, 3);
    assert.equal(corpo.formaPagamento, 'PIX');
    assert.equal(corpo.valorTotal.toString(), '150');
    assert.equal(prisma.compras.length, 1);
    assert.equal(prisma.compras[0].origem, 'PDV');
    assert.equal(prisma.compras[0].statusPagamento, 'APROVADO');
    assert.equal(corpo.vendas.every((venda) => venda.compraId === prisma.compras[0].id), true);
    const somaIngressos = corpo.vendas.reduce((soma, venda) => soma + Number(venda.valorPago), 0);
    assert.equal(Number(prisma.compras[0].valorTotal), somaIngressos);
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
      nomeCliente: 'Cliente de teste',
      cpf: '529.982.247-25',
      emailCliente: 'cliente@exemplo.com',
    },
  });
  assert.equal(resposta.status, 409);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 1);
});

test('falha na venda desfaz a Compra e o restante da transação', async () => {
  const prisma = new PrismaFake();
  prisma.tipos[0].quantidadeDisponivel = 2;
  prisma.falharCriacaoVenda = true;
  const aplicacao = criarAplicacao(configuracao, { prisma });

  const resposta = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: {
      eventoId: 1, ingressoTipoId: 1, quantidade: 2,
      formaPagamento: 'PIX',
      nomeCliente: 'Cliente de teste',
      cpf: '529.982.247-25',
      emailCliente: 'cliente@exemplo.com',
    },
  });

  assert.equal(resposta.status, 500);
  assert.equal(prisma.compras.length, 0);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.clientes.length, 0);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 2);
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
          nomeCliente: 'Cliente de teste',
          cpf: '529.982.247-25',
          emailCliente: 'cliente@exemplo.com',
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
      nomeCliente: 'Cliente de teste',
      cpf: '529.982.247-25',
      emailCliente: 'cliente@exemplo.com',
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
      cpf: '529.982.247-25',
      nomeCliente: 'Cliente de teste',
      emailCliente: 'cliente@exemplo.com',
    },
  });

  assert.equal(resposta.status, 500);
  assert.equal(prisma.tipos[0].quantidadeDisponivel, 2);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.clientes.length, 0);
});

test('rejeita venda sem identificação, inclusive na portaria', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(configuracao, { prisma });

  const resposta = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: {
      eventoId: 1, ingressoTipoId: 1, quantidade: 1,
      formaPagamento: 'PIX',
    },
  });

  assert.equal(resposta.status, 400);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.clientes.length, 0);
});

test('reutiliza cliente pelo CPF, cria outro e rejeita dados divergentes', async () => {
  const prisma = new PrismaFake();
  prisma.tipos[0].quantidadeDisponivel = 4;
  const aplicacao = criarAplicacao(configuracao, { prisma });
  const dados = {
    eventoId: 1, ingressoTipoId: 1, quantidade: 1,
    formaPagamento: 'PIX',
    nomeCliente: 'Cliente de teste',
    cpf: '529.982.247-25',
    emailCliente: 'cliente@exemplo.com',
  };

  assert.equal((await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST', body: dados,
  })).status, 201);
  assert.equal((await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST', body: dados,
  })).status, 201);
  assert.equal(prisma.clientes.length, 1);

  const novoCliente = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: { ...dados, cpf: '111.444.777-35', emailCliente: 'outro@exemplo.com' },
  });
  assert.equal(novoCliente.status, 201);
  assert.equal(prisma.clientes.length, 2);

  const divergente = await requisitarEmAplicacao(aplicacao, '/v1/vendas-ingressos', {
    method: 'POST',
    body: { ...dados, nomeCliente: 'Outro nome' },
  });
  assert.equal(divergente.status, 409);
  assert.equal(prisma.clientes[0].nome, 'Cliente de teste');
});

test('rejeita compra associada a cliente de outro estabelecimento', async () => {
  const prisma = new PrismaFake();
  prisma.clientes.push({ id: 2, estabelecimentoId: 2, cpf: '11144477735' });

  await assert.rejects(
    () => prisma.compra.create({
      data: {
        estabelecimentoId: 1,
        clienteId: 2,
        origem: 'PDV',
        statusPagamento: 'APROVADO',
        valorTotal: 50,
      },
    }),
    /outro estabelecimento/,
  );
  assert.equal(prisma.compras.length, 0);
});

test('rejeita venda associada a compra e cliente de estabelecimentos diferentes', async () => {
  const prisma = new PrismaFake();
  prisma.clientes.push({ id: 2, estabelecimentoId: 2, cpf: '11144477735' });
  prisma.compras.push({
    id: 2,
    estabelecimentoId: 2,
    clienteId: 2,
    origem: 'PDV',
    statusPagamento: 'APROVADO',
    valorTotal: 50,
  });

  await assert.rejects(
    () => prisma.vendaIngresso.create({
      data: {
        estabelecimentoId: 1,
        eventoId: 1,
        ingressoTipoId: 1,
        compraId: 2,
        clienteId: 2,
        valorPago: 50,
        formaPagamento: 'PIX',
      },
    }),
    /compra de outro estabelecimento/,
  );
  assert.equal(prisma.vendas.length, 0);
});

test('preserva vendas e compras antigas ao criar uma nova venda no PDV', async () => {
  const prisma = new PrismaFake();
  prisma.tipos[0].quantidadeDisponivel = 2;
  prisma.clientes.push({
    id: 7,
    estabelecimentoId: 1,
    cpf: '11144477735',
    nome: 'Cliente antigo',
  });
  prisma.compras.push({
    id: 7,
    estabelecimentoId: 1,
    clienteId: 7,
    origem: 'PDV',
    statusPagamento: 'APROVADO',
    valorTotal: 50,
  });
  prisma.vendas.push({
    id: 7,
    estabelecimentoId: 1,
    compraId: 7,
    clienteId: 7,
    statusVenda: 'CONFIRMADA',
  });

  const resposta = await requisitarEmAplicacao(criarAplicacao(configuracao, { prisma }), '/v1/vendas-ingressos', {
    method: 'POST',
    body: {
      eventoId: 1,
      ingressoTipoId: 1,
      quantidade: 1,
      formaPagamento: 'PIX',
      nomeCliente: 'Cliente novo',
      cpf: '529.982.247-25',
      emailCliente: 'novo@exemplo.com',
    },
  });

  assert.equal(resposta.status, 201);
  assert.equal(prisma.vendas.some((item) => item.id === 7), true);
  assert.equal(prisma.compras.some((item) => item.id === 7), true);
  assert.equal(prisma.vendas.length, 2);
  assert.equal(prisma.compras.length, 2);
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
