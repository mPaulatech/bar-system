import assert from 'node:assert/strict';
import test from 'node:test';
import { criarAplicacao } from '../src/app.js';

class PrismaFake {
  constructor() {
    const dataFutura = new Date(Date.now() + 24 * 60 * 60 * 1000);
    this.estabelecimentos = [
      { id: 1, identificadorPublico: 'casa-um', nomeFantasia: 'Casa Um', cnpj: 'interno' },
      { id: 2, identificadorPublico: 'casa-dois', nomeFantasia: 'Casa Dois', cnpj: 'sensivel' },
    ];
    this.eventos = [
      {
        id: 1, estabelecimentoId: 1, nome: 'Evento disponível',
        generoMusical: 'Samba', atracoes: null, dataHora: dataFutura,
        duracaoHoras: 8, status: 'ATIVO',
      },
      {
        id: 2, estabelecimentoId: 1, nome: 'Evento esgotado',
        generoMusical: 'Rock', atracoes: null, dataHora: dataFutura,
        duracaoHoras: 8, status: 'ATIVO',
      },
      {
        id: 3, estabelecimentoId: 1, nome: 'Evento não publicado',
        generoMusical: 'Forro', atracoes: null, dataHora: dataFutura,
        duracaoHoras: 8, status: 'RASCUNHO',
      },
      {
        id: 4, estabelecimentoId: 2, nome: 'Evento de outra casa',
        generoMusical: 'Pop', atracoes: null, dataHora: dataFutura,
        duracaoHoras: 8, status: 'ATIVO',
      },
      {
        id: 5, estabelecimentoId: 1, nome: 'Evento encerrado',
        generoMusical: 'Pagode', atracoes: null, dataHora: dataFutura,
        duracaoHoras: 8, status: 'ENCERRADO',
      },
      {
        id: 6, estabelecimentoId: 1, nome: 'Evento fora da vigência',
        generoMusical: 'Reggae', atracoes: null,
        dataHora: new Date(Date.now() - 10 * 60 * 60 * 1000),
        duracaoHoras: 2, status: 'ATIVO',
      },
    ];
    this.lotes = [
      { id: 10, estabelecimentoId: 1, eventoId: 1, nome: 'Lote 1', preco: '50.00', quantidadeDisponivel: 7 },
      { id: 11, estabelecimentoId: 1, eventoId: 1, nome: 'Lote esgotado', preco: '70.00', quantidadeDisponivel: 0 },
      { id: 14, estabelecimentoId: 1, eventoId: 1, nome: 'Lote negativo', preco: '80.00', quantidadeDisponivel: -2 },
      { id: 12, estabelecimentoId: 1, eventoId: 2, nome: 'Lote esgotado', preco: '40.00', quantidadeDisponivel: 0 },
      { id: 15, estabelecimentoId: 2, eventoId: 1, nome: 'Lote de outra casa no evento', preco: '99.00', quantidadeDisponivel: 8 },
      { id: 16, estabelecimentoId: 1, eventoId: 5, nome: 'Lote do evento encerrado', preco: '60.00', quantidadeDisponivel: 8 },
      { id: 17, estabelecimentoId: 1, eventoId: 6, nome: 'Lote do evento fora da vigência', preco: '60.00', quantidadeDisponivel: 8 },
      { id: 13, estabelecimentoId: 2, eventoId: 4, nome: 'Lote de outra casa', preco: '90.00', quantidadeDisponivel: 8 },
    ];
    this.clientes = [];
    this.compras = [];
    this.vendas = [];
    this.proximoClienteId = 1;
    this.proximoCompraId = 1;
    this.proximoVendaId = 1;
    this.estabelecimento = {
      findUnique: async ({ where, select }) => {
        const encontrado = this.estabelecimentos.find(
          (item) => item.identificadorPublico === where.identificadorPublico,
        );
        return encontrado ? selecionar(encontrado, select) : null;
      },
    };
    this.evento = {
      findMany: async ({ where, select }) => this.eventos
        .filter((evento) => evento.estabelecimentoId === where.estabelecimentoId
          && evento.status === where.status
          && (where.ingressosTipos?.some
            ? this.lotes.some((lote) => lote.eventoId === evento.id
              && corresponde(lote, where.ingressosTipos.some))
            : true))
        .map((evento) => selecionar({
          ...evento,
          ingressosTipos: this.lotes.filter((lote) => lote.eventoId === evento.id),
        }, select)),
      findFirst: async ({ where, select }) => {
        const evento = this.eventos.find((item) => item.id === where.id
          && item.estabelecimentoId === where.estabelecimentoId
          && (!where.status || item.status === where.status));
        return evento ? selecionar(evento, select) : null;
      },
    };
    this.ingressoTipo = {
      findFirst: async ({ where, select }) => {
        const lote = this.lotes.find((item) => corresponde(item, where));
        return lote ? selecionar(lote, select) : null;
      },
      findMany: async ({ where, select }) => this.lotes
        .filter((lote) => corresponde(lote, where))
        .map((lote) => selecionar(lote, select)),
      updateMany: async ({ where, data }) => {
        const lote = this.lotes.find((item) => item.id === where.id
          && item.estabelecimentoId === where.estabelecimentoId
          && (where.quantidadeDisponivel?.gte === undefined
            || item.quantidadeDisponivel >= where.quantidadeDisponivel.gte));
        if (!lote) return { count: 0 };
        lote.quantidadeDisponivel -= data.quantidadeDisponivel.decrement;
        return { count: 1 };
      },
    };
    this.cliente = {
      findFirst: async ({ where }) => this.clientes.find((item) => (
        item.estabelecimentoId === where.estabelecimentoId && item.cpf === where.cpf
      )) ?? null,
      create: async ({ data }) => {
        if (this.clientes.some((item) => item.estabelecimentoId === data.estabelecimentoId
          && item.cpf === data.cpf)) {
          const erro = new Error('CPF duplicado');
          erro.code = 'P2002';
          throw erro;
        }
        const cliente = { id: this.proximoClienteId++, ...data };
        this.clientes.push(cliente);
        return cliente;
      },
      update: async ({ where, data }) => {
        const cliente = this.clientes.find((item) => item.id === where.id);
        Object.assign(cliente, data);
        return cliente;
      },
    };
    this.compra = {
      findFirst: async ({ where, select }) => {
        const compra = this.compras.find((item) => item.estabelecimentoId === where.estabelecimentoId
          && item.chaveIdempotencia === where.chaveIdempotencia);
        if (!compra) return null;
        return selecionar({
          ...compra,
          cliente: this.clientes.find((item) => item.id === compra.clienteId),
          vendasIngressos: this.vendas.filter((item) => item.compraId === compra.id),
        }, select);
      },
      create: async ({ data, select }) => {
        if (this.compras.some((item) => item.estabelecimentoId === data.estabelecimentoId
          && item.chaveIdempotencia === data.chaveIdempotencia)) {
          const erro = new Error('Chave de idempotência duplicada');
          erro.code = 'P2002';
          throw erro;
        }
        const compra = { id: this.proximoCompraId++, ...data };
        this.compras.push(compra);
        return selecionar(compra, select);
      },
    };
    this.vendaIngresso = {
      create: async ({ data, select }) => {
        const venda = {
          id: this.proximoVendaId++,
          statusVenda: 'CONFIRMADA',
          statusCheckin: 'PENDENTE',
          criadoEm: new Date(),
          compra: this.compras.find((item) => item.id === data.compraId),
          evento: this.eventos.find((item) => item.id === data.eventoId),
          ingressoTipo: this.lotes.find((item) => item.id === data.ingressoTipoId),
          cliente: this.clientes.find((item) => item.id === data.clienteId),
          ...data,
        };
        this.vendas.push(venda);
        return selecionar(venda, select);
      },
      findMany: async ({ where, select }) => this.vendas
        .filter((item) => item.estabelecimentoId === where.estabelecimentoId
          && item.compraId === where.compraId)
        .map((item) => selecionar(item, select)),
    };
  }

  async $transaction(callback) {
    while (this.transacaoEmAndamento) {
      await this.transacaoEmAndamento;
    }
    let liberarTransacao;
    this.transacaoEmAndamento = new Promise((resolve) => {
      liberarTransacao = resolve;
    });
    const estado = {
      lotes: structuredClone(this.lotes),
      clientes: this.clientes.map((item) => ({ ...item })),
      compras: this.compras.map((item) => ({ ...item })),
      vendas: this.vendas.map((item) => ({ ...item })),
      proximoClienteId: this.proximoClienteId,
      proximoCompraId: this.proximoCompraId,
      proximoVendaId: this.proximoVendaId,
    };
    try {
      return await callback(this);
    } catch (erro) {
      Object.assign(this, estado);
      throw erro;
    } finally {
      liberarTransacao();
      this.transacaoEmAndamento = null;
    }
  }
}

function selecionar(registro, select) {
  if (!select) return { ...registro };
  return Object.fromEntries(Object.entries(select)
    .filter(([, configuracao]) => configuracao === true || typeof configuracao === 'object')
    .map(([campo, configuracao]) => {
      if (configuracao === true) return [campo, registro[campo]];
      const relacionamento = registro[campo];
      if (!relacionamento) return [campo, null];
      if (!Array.isArray(relacionamento)) {
        return [campo, selecionar(relacionamento, configuracao.select)];
      }
      const itensFiltrados = configuracao.where
        ? relacionamento.filter((item) => corresponde(item, configuracao.where))
        : relacionamento;
      return [
        campo,
        itensFiltrados.map((item) => selecionar(item, configuracao.select)),
      ];
    }));
}

function corresponde(registro, filtro) {
  return Object.entries(filtro).every(([campo, condicao]) => {
    if (condicao && typeof condicao === 'object') {
      return registro[campo] > condicao.gt;
    }
    return registro[campo] === condicao;
  });
}

async function requisitar(aplicacao, caminho, opcoes = {}) {
  const servidor = aplicacao.listen(0);
  const { port } = servidor.address();
  try {
    return await fetch(`http://127.0.0.1:${port}${caminho}`, {
      ...opcoes,
      headers: {
        ...(opcoes.body ? { 'content-type': 'application/json' } : {}),
        ...opcoes.headers,
      },
      body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
    });
  } finally {
    await new Promise((resolve, rejeitar) => servidor.close((erro) => (
      erro ? rejeitar(erro) : resolve()
    )));
  }
}

test('consulta pública funciona sem token e não expõe dados internos', async () => {
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173', jwtSecret: 'segredo-de-teste-com-mais-de-16' },
    { prisma: new PrismaFake() },
  );

  const resposta = await requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um');

  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), {
    identificadorPublico: 'casa-um',
    nomeFantasia: 'Casa Um',
  });
});

test('identificador público inválido ou inexistente falha', async () => {
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma: new PrismaFake() },
  );

  const invalido = await requisitar(aplicacao, '/v1/publico/estabelecimentos/invalido!');
  const inexistente = await requisitar(aplicacao, '/v1/publico/estabelecimentos/nao-existe');

  assert.equal(invalido.status, 400);
  assert.equal(inexistente.status, 404);
});

test('eventos e lotes públicos respeitam estabelecimento e disponibilidade', async () => {
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma: new PrismaFake() },
  );

  const eventos = await requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um/eventos');
  const lotes = await requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um/eventos/1/lotes');
  const eventoEsgotado = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/eventos/2/lotes',
  );
  const outroEvento = await requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um/eventos/4/lotes');

  assert.equal(eventos.status, 200);
  assert.deepEqual((await eventos.json()).map((evento) => evento.id), [1]);
  assert.equal(lotes.status, 200);
  assert.deepEqual(await lotes.json(), [{
    id: 10,
    nome: 'Lote 1',
    preco: '50.00',
    quantidadeDisponivel: 7,
  }]);
  assert.equal(eventoEsgotado.status, 200);
  assert.deepEqual(await eventoEsgotado.json(), []);
  assert.equal(outroEvento.status, 404);
});

test('não publica eventos encerrados ou fora da vigência', async () => {
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma: new PrismaFake() },
  );

  const eventos = await requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um/eventos');
  const encerrado = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/eventos/5/lotes',
  );
  const expirado = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/eventos/6/lotes',
  );

  assert.deepEqual((await eventos.json()).map((evento) => evento.id), [1]);
  assert.equal(encerrado.status, 404);
  assert.equal(expirado.status, 404);
});

test('não publica lotes sem estoque ou de outro estabelecimento', async () => {
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma: new PrismaFake() },
  );

  const lotes = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/eventos/1/lotes',
  );

  assert.deepEqual(await lotes.json(), [{
    id: 10,
    nome: 'Lote 1',
    preco: '50.00',
    quantidadeDisponivel: 7,
  }]);
});

test('cria compra pública sem JWT, calcula valor e baixa estoque', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );

  const resposta = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    {
      method: 'POST',
      body: {
        eventoId: 1,
        ingressoTipoId: 10,
        quantidade: 2,
        nome: 'Cliente público',
        cpf: '529.982.247-25',
        email: 'PUBLICO@EXEMPLO.COM',
        chaveIdempotencia: 'compra-publica-1',
        pagamentoSimulado: 'APROVADO',
        consentimentoMarketing: true,
      },
    },
  );
  const corpo = await resposta.json();

  assert.equal(resposta.status, 201);
  assert.equal(corpo.quantidade, 2);
  assert.equal(corpo.vendas.length, 2);
  assert.equal(corpo.valorTotal.toString(), '100');
  assert.equal(corpo.statusPagamento, 'APROVADO');
  assert.equal(corpo.emailTransacionalSimulado, true);
  assert.equal(prisma.compras[0].origem, 'PUBLICA');
  assert.equal(prisma.compras[0].clienteId, prisma.clientes[0].id);
  assert.equal(prisma.vendas.every((venda) => venda.usuarioVendedorId === null), true);
  assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 5);
  assert.equal(prisma.clientes[0].email, 'publico@exemplo.com');
  assert.equal(prisma.clientes[0].consentimentoMarketing, true);
});

test('pagamento público recusado não cria compra nem altera estoque', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );

  const resposta = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    {
      method: 'POST',
      body: {
        eventoId: 1,
        ingressoTipoId: 10,
        quantidade: 2,
        nome: 'Cliente recusado',
        cpf: '529.982.247-25',
        email: 'recusado@exemplo.com',
        chaveIdempotencia: 'compra-publica-recusada',
        pagamentoSimulado: 'RECUSADO',
        consentimentoMarketing: false,
      },
    },
  );

  assert.equal(resposta.status, 402);
  assert.equal(prisma.compras.length, 0);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 7);
});

test('mesma chave com quantidade diferente retorna 409 sem baixar estoque novamente', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );
  const dados = {
    eventoId: 1,
    ingressoTipoId: 10,
    quantidade: 2,
    nome: 'Cliente idempotente',
    cpf: '529.982.247-25',
    email: 'idempotente@exemplo.com',
    chaveIdempotencia: 'compra-publica-idempotente',
  };

  const primeira = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: dados },
  );
  const segunda = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: { ...dados, quantidade: 1 } },
  );
  const primeiraCorpo = await primeira.json();
  const segundaCorpo = await segunda.json();

  assert.equal(primeira.status, 201, JSON.stringify(primeiraCorpo));
  assert.equal(segunda.status, 409, JSON.stringify(segundaCorpo));
  assert.equal(prisma.compras.length, 1);
  assert.equal(prisma.vendas.length, 2);
  assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 5);
});

test('mesma chave e mesmos dados retornam exatamente os ingressos existentes', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );
  const dados = {
    eventoId: 1,
    ingressoTipoId: 10,
    quantidade: 2,
    nome: 'Cliente idempotente',
    cpf: '529.982.247-25',
    email: 'idempotente@exemplo.com',
    chaveIdempotencia: 'compra-publica-reutilizada',
  };

  const primeira = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: dados },
  );
  const segunda = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: dados },
  );
  const primeiraCorpo = await primeira.json();
  const segundaCorpo = await segunda.json();

  assert.equal(primeira.status, 201);
  assert.equal(segunda.status, 201);
  assert.deepEqual(
    segundaCorpo.vendas.map((venda) => venda.id),
    primeiraCorpo.vendas.map((venda) => venda.id),
  );
  assert.equal(new Set(segundaCorpo.vendas.map((venda) => venda.codigoIngresso)).size, 2);
  assert.equal(prisma.compras.length, 1);
  assert.equal(prisma.vendas.length, 2);
  assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 5);
});

test('mesma chave com evento, lote, quantidade, CPF, nome ou e-mail diferente retorna 409', async () => {
  const casos = [
    ['eventoId', 2],
    ['ingressoTipoId', 11],
    ['quantidade', 2],
    ['cpf', '153.509.460-56'],
    ['nome', 'Outro nome'],
    ['email', 'outro@exemplo.com'],
  ];

  for (const [campo, valor] of casos) {
    const prisma = new PrismaFake();
    const aplicacao = criarAplicacao(
      { frontendUrl: 'http://localhost:5173' },
      { prisma },
    );
    const dados = {
      eventoId: 1,
      ingressoTipoId: 10,
      quantidade: 1,
      nome: 'Cliente idempotente',
      cpf: '529.982.247-25',
      email: 'idempotente@exemplo.com',
      chaveIdempotencia: `compra-divergente-${campo}`,
    };

    const primeira = await requisitar(
      aplicacao,
      '/v1/publico/estabelecimentos/casa-um/compras',
      { method: 'POST', body: dados },
    );
    const segunda = await requisitar(
      aplicacao,
      '/v1/publico/estabelecimentos/casa-um/compras',
      { method: 'POST', body: { ...dados, [campo]: valor } },
    );
    const corpo = await segunda.json();

    assert.equal(primeira.status, 201);
    assert.equal(segunda.status, 409);
    assert.equal(corpo.detalhes, undefined);
    assert.equal(JSON.stringify(corpo).includes(dados.cpf), false);
    assert.equal(prisma.compras.length, 1);
    assert.equal(prisma.vendas.length, 1);
    assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 6);
  }
});

test('duas requisições simultâneas com a mesma chave reutilizam uma compra', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );
  const dados = {
    eventoId: 1,
    ingressoTipoId: 10,
    quantidade: 2,
    nome: 'Cliente concorrente',
    cpf: '529.982.247-25',
    email: 'concorrente@exemplo.com',
    chaveIdempotencia: 'compra-concorrente',
  };

  const respostas = await Promise.all([
    requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um/compras', {
      method: 'POST',
      body: dados,
    }),
    requisitar(aplicacao, '/v1/publico/estabelecimentos/casa-um/compras', {
      method: 'POST',
      body: dados,
    }),
  ]);
  const corpos = await Promise.all(respostas.map((resposta) => resposta.json()));

  assert.deepEqual(respostas.map((resposta) => resposta.status).sort(), [201, 201]);
  assert.equal(prisma.compras.length, 1);
  assert.equal(prisma.vendas.length, 2);
  assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 5);
  assert.deepEqual(corpos[0].vendas.map((venda) => venda.codigoIngresso).sort(), [
    ...corpos[1].vendas.map((venda) => venda.codigoIngresso).sort(),
  ]);
});

test('compra pública reutiliza cliente e rejeita dados divergentes do CPF', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );
  const dados = {
    eventoId: 1,
    ingressoTipoId: 10,
    quantidade: 1,
    nome: 'Cliente reutilizado',
    cpf: '529.982.247-25',
    email: 'reutilizado@exemplo.com',
  };

  const primeira = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: { ...dados, chaveIdempotencia: 'cliente-1' } },
  );
  const segunda = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: { ...dados, chaveIdempotencia: 'cliente-2' } },
  );
  const divergente = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    {
      method: 'POST',
      body: {
        ...dados,
        nome: 'Outro nome',
        chaveIdempotencia: 'cliente-3',
      },
    },
  );

  assert.equal(primeira.status, 201);
  assert.equal(segunda.status, 201);
  assert.equal(divergente.status, 409);
  assert.equal(prisma.clientes.length, 1);
  assert.equal(prisma.compras.length, 2);
});

test('compra pública valida estabelecimento, evento, lote, vigência e identificação', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );
  const dados = {
    quantidade: 1,
    nome: 'Cliente público',
    cpf: '529.982.247-25',
    email: 'publico@exemplo.com',
    chaveIdempotencia: 'chave-validacao',
  };

  const casos = [
    ['/v1/publico/estabelecimentos/casa-dois/compras', { eventoId: 1, ingressoTipoId: 10 }, 404],
    ['/v1/publico/estabelecimentos/casa-um/compras', { eventoId: 4, ingressoTipoId: 13 }, 404],
    ['/v1/publico/estabelecimentos/casa-um/compras', { eventoId: 1, ingressoTipoId: 13 }, 404],
    ['/v1/publico/estabelecimentos/casa-um/compras', { eventoId: 5, ingressoTipoId: 16 }, 409],
    ['/v1/publico/estabelecimentos/casa-um/compras', { eventoId: 6, ingressoTipoId: 17 }, 409],
  ];

  for (const [caminho, identificadores, status] of casos) {
    const resposta = await requisitar(aplicacao, caminho, {
      method: 'POST',
      body: { ...dados, ...identificadores, chaveIdempotencia: `${status}-${identificadores.eventoId}` },
    });
    assert.equal(resposta.status, status);
  }

  const invalida = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    { method: 'POST', body: { ...dados, eventoId: 1, ingressoTipoId: 10, cpf: '11111111111' } },
  );
  assert.equal(invalida.status, 400);
  assert.equal(prisma.compras.length, 0);

  const precoEnviado = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    {
      method: 'POST',
      body: {
        ...dados,
        eventoId: 1,
        ingressoTipoId: 10,
        preco: 0,
        chaveIdempotencia: 'preco-nao-confiavel',
      },
    },
  );
  assert.equal(precoEnviado.status, 400);
});

test('falha na criação pública desfaz cliente, compra e estoque', async () => {
  const prisma = new PrismaFake();
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma },
  );
  prisma.vendaIngresso.create = async () => {
    throw new Error('Falha simulada ao criar ingresso.');
  };

  const resposta = await requisitar(
    aplicacao,
    '/v1/publico/estabelecimentos/casa-um/compras',
    {
      method: 'POST',
      body: {
        eventoId: 1,
        ingressoTipoId: 10,
        quantidade: 1,
        nome: 'Cliente rollback',
        cpf: '529.982.247-25',
        email: 'rollback@exemplo.com',
        chaveIdempotencia: 'compra-rollback',
      },
    },
  );

  assert.equal(resposta.status, 500);
  assert.equal(prisma.clientes.length, 0);
  assert.equal(prisma.compras.length, 0);
  assert.equal(prisma.vendas.length, 0);
  assert.equal(prisma.lotes.find((lote) => lote.id === 10).quantidadeDisponivel, 7);
});

test('rotas administrativas continuam exigindo JWT', async () => {
  const aplicacao = criarAplicacao(
    { frontendUrl: 'http://localhost:5173' },
    { prisma: new PrismaFake() },
  );

  const resposta = await requisitar(aplicacao, '/v1/eventos');

  assert.equal(resposta.status, 401);
});
