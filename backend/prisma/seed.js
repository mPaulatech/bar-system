import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Atualiza ou cria um evento, pois o schema não possui uma chave única para o nome.
async function obterOuCriarEvento(dados) {
  const eventoExistente = await prisma.evento.findFirst({
    where: {
      estabelecimentoId: dados.estabelecimentoId,
      nome: dados.nome,
    },
  });

  if (eventoExistente) {
    return prisma.evento.update({
      where: { id: eventoExistente.id },
      data: dados,
    });
  }

  return prisma.evento.create({ data: dados });
}

// Atualiza ou cria um tipo de ingresso dentro de um evento.
async function obterOuCriarIngressoTipo(dados) {
  const ingressoExistente = await prisma.ingressoTipo.findFirst({
    where: {
      estabelecimentoId: dados.estabelecimentoId,
      eventoId: dados.eventoId,
      nome: dados.nome,
    },
  });

  if (ingressoExistente) {
    return prisma.ingressoTipo.update({
      where: { id: ingressoExistente.id },
      data: dados,
    });
  }

  return prisma.ingressoTipo.create({ data: dados });
}

async function executarSeed() {
  console.log('Iniciando seed idempotente: registros existentes serão atualizados.');

  const estabelecimento = await prisma.estabelecimento.upsert({
    where: { cnpj: '12.345.678/0001-90' },
    update: {
      nomeFantasia: 'Dona Bier',
      razaoSocial: 'Dona Bier Eventos Ltda.',
      emailContato: 'contato@donabier.example',
    },
    create: {
      nomeFantasia: 'Dona Bier',
      razaoSocial: 'Dona Bier Eventos Ltda.',
      cnpj: '12.345.678/0001-90',
      emailContato: 'contato@donabier.example',
    },
  });

  const senhaGestor = await bcrypt.hash('Gestor@123456', 10);
  const senhaFuncionario = await bcrypt.hash('Funcionario@123456', 10);

  const gestor = await prisma.usuario.upsert({
    where: { email: 'gestor@donabier.example' },
    update: {
      nome: 'Marina Gestora',
      estabelecimentoId: estabelecimento.id,
      senhaHash: senhaGestor,
      perfil: 'GESTOR',
      ativo: true,
    },
    create: {
      nome: 'Marina Gestora',
      email: 'gestor@donabier.example',
      estabelecimentoId: estabelecimento.id,
      senhaHash: senhaGestor,
      perfil: 'GESTOR',
    },
  });

  const funcionario = await prisma.usuario.upsert({
    where: { email: 'funcionario@donabier.example' },
    update: {
      nome: 'Carlos Funcionário',
      estabelecimentoId: estabelecimento.id,
      senhaHash: senhaFuncionario,
      perfil: 'FUNCIONARIO',
      ativo: true,
    },
    create: {
      nome: 'Carlos Funcionário',
      email: 'funcionario@donabier.example',
      estabelecimentoId: estabelecimento.id,
      senhaHash: senhaFuncionario,
      perfil: 'FUNCIONARIO',
    },
  });

  const clientes = await Promise.all([
    prisma.cliente.upsert({
      where: {
        estabelecimentoId_cpf: {
          estabelecimentoId: estabelecimento.id,
          cpf: '111.111.111-11',
        },
      },
      update: {
        nome: 'Ana Souza',
        email: 'ana.souza@example.com',
        telefone: '(12) 99999-1111',
      },
      create: {
        estabelecimentoId: estabelecimento.id,
        nome: 'Ana Souza',
        cpf: '111.111.111-11',
        email: 'ana.souza@example.com',
        telefone: '(12) 99999-1111',
      },
    }),
    prisma.cliente.upsert({
      where: {
        estabelecimentoId_cpf: {
          estabelecimentoId: estabelecimento.id,
          cpf: '222.222.222-22',
        },
      },
      update: {
        nome: 'Bruno Lima',
        email: 'bruno.lima@example.com',
        telefone: '(12) 99999-2222',
      },
      create: {
        estabelecimentoId: estabelecimento.id,
        nome: 'Bruno Lima',
        cpf: '222.222.222-22',
        email: 'bruno.lima@example.com',
        telefone: '(12) 99999-2222',
      },
    }),
    prisma.cliente.upsert({
      where: {
        estabelecimentoId_cpf: {
          estabelecimentoId: estabelecimento.id,
          cpf: '333.333.333-33',
        },
      },
      update: {
        nome: 'Carla Mendes',
        email: 'carla.mendes@example.com',
        telefone: '(12) 99999-3333',
      },
      create: {
        estabelecimentoId: estabelecimento.id,
        nome: 'Carla Mendes',
        cpf: '333.333.333-33',
        email: 'carla.mendes@example.com',
        telefone: '(12) 99999-3333',
      },
    }),
  ]);

  const eventoAtivo = await obterOuCriarEvento({
    estabelecimentoId: estabelecimento.id,
    nome: 'Sexta do Rock',
    generoMusical: 'Rock',
    atracoes: 'Banda Horizonte',
    dataHora: new Date('2026-11-20T21:00:00-03:00'),
    duracaoHoras: 8,
    status: 'ATIVO',
  });

  const eventoEncerrado = await obterOuCriarEvento({
    estabelecimentoId: estabelecimento.id,
    nome: 'Festival de Verão',
    generoMusical: 'Pop',
    atracoes: 'DJ Sol e convidados',
    dataHora: new Date('2026-01-17T20:00:00-03:00'),
    duracaoHoras: 8,
    status: 'ENCERRADO',
  });

  const ingressoAtivoPista = await obterOuCriarIngressoTipo({
    estabelecimentoId: estabelecimento.id,
    eventoId: eventoAtivo.id,
    nome: 'Pista',
    preco: '45.00',
    quantidadeDisponivel: 497,
  });
  const ingressoAtivoVip = await obterOuCriarIngressoTipo({
    estabelecimentoId: estabelecimento.id,
    eventoId: eventoAtivo.id,
    nome: 'Área VIP',
    preco: '90.00',
    quantidadeDisponivel: 198,
  });
  const ingressoEncerrado = await obterOuCriarIngressoTipo({
    estabelecimentoId: estabelecimento.id,
    eventoId: eventoEncerrado.id,
    nome: 'Pista',
    preco: '35.00',
    quantidadeDisponivel: 0,
  });

  await prisma.vendaIngresso.upsert({
    where: { codigoIngresso: 'A7K3M5Z8' },
    update: {
      eventoId: eventoAtivo.id,
      ingressoTipoId: ingressoAtivoPista.id,
      clienteId: clientes[0].id,
      usuarioVendedorId: gestor.id,
      valorPago: '45.00',
      statusVenda: 'CONFIRMADA',
      statusCheckin: 'PENDENTE',
    },
    create: {
      estabelecimentoId: estabelecimento.id,
      eventoId: eventoAtivo.id,
      ingressoTipoId: ingressoAtivoPista.id,
      clienteId: clientes[0].id,
      usuarioVendedorId: gestor.id,
      codigoIngresso: 'A7K3M5Z8',
      valorPago: '45.00',
    },
  });

  await prisma.vendaIngresso.upsert({
    where: { codigoIngresso: 'B4N6P9X2' },
    update: {
      eventoId: eventoAtivo.id,
      ingressoTipoId: ingressoAtivoVip.id,
      clienteId: clientes[1].id,
      usuarioVendedorId: funcionario.id,
      valorPago: '90.00',
      statusVenda: 'CONFIRMADA',
      statusCheckin: 'PENDENTE',
    },
    create: {
      estabelecimentoId: estabelecimento.id,
      eventoId: eventoAtivo.id,
      ingressoTipoId: ingressoAtivoVip.id,
      clienteId: clientes[1].id,
      usuarioVendedorId: funcionario.id,
      codigoIngresso: 'B4N6P9X2',
      valorPago: '90.00',
    },
  });

  await prisma.vendaIngresso.upsert({
    where: { codigoIngresso: 'C5R8T3Y7' },
    update: {
      eventoId: eventoEncerrado.id,
      ingressoTipoId: ingressoEncerrado.id,
      clienteId: clientes[2].id,
      usuarioVendedorId: gestor.id,
      valorPago: '35.00',
      statusVenda: 'CONFIRMADA',
      statusCheckin: 'UTILIZADO',
      checkinPorId: funcionario.id,
      checkinEm: new Date('2026-01-17T21:10:00-03:00'),
    },
    create: {
      estabelecimentoId: estabelecimento.id,
      eventoId: eventoEncerrado.id,
      ingressoTipoId: ingressoEncerrado.id,
      clienteId: clientes[2].id,
      usuarioVendedorId: gestor.id,
      codigoIngresso: 'C5R8T3Y7',
      valorPago: '35.00',
      statusCheckin: 'UTILIZADO',
      checkinPorId: funcionario.id,
      checkinEm: new Date('2026-01-17T21:10:00-03:00'),
    },
  });

  await prisma.vendaConsumoApi.upsert({
    where: {
      estabelecimentoId_idTransacaoExterna: {
        estabelecimentoId: estabelecimento.id,
        idTransacaoExterna: 'SEED-CONSUMO-001',
      },
    },
    update: {
      eventoId: eventoAtivo.id,
      clienteId: clientes[0].id,
      valorTotal: '72.50',
      dataHoraTransacao: new Date('2026-11-20T22:30:00-03:00'),
      itens: [{ nome: 'Chopp', quantidade: 2 }, { nome: 'Porção', quantidade: 1 }],
      payloadOriginal: { origem: 'seed', valor: 72.5 },
    },
    create: {
      estabelecimentoId: estabelecimento.id,
      eventoId: eventoAtivo.id,
      clienteId: clientes[0].id,
      idTransacaoExterna: 'SEED-CONSUMO-001',
      valorTotal: '72.50',
      dataHoraTransacao: new Date('2026-11-20T22:30:00-03:00'),
      itens: [{ nome: 'Chopp', quantidade: 2 }, { nome: 'Porção', quantidade: 1 }],
      payloadOriginal: { origem: 'seed', valor: 72.5 },
    },
  });

  console.log(`Seed concluído para o estabelecimento "${estabelecimento.nomeFantasia}".`);
  console.log(`Usuários: ${gestor.email} e ${funcionario.email}.`);
  console.log('Senhas de teste: Gestor@123456 e Funcionario@123456.');
}

executarSeed()
  .catch((erro) => {
    console.error('Falha ao executar o seed:', erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
