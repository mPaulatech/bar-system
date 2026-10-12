import { randomInt } from 'node:crypto';
import { erroHttp } from '../../utilitarios/erro-http.js';

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const selecaoVenda = {
  id: true,
  valorPago: true,
  codigoIngresso: true,
  statusVenda: true,
  statusCheckin: true,
  criadoEm: true,
  estornadaEm: true,
  evento: { select: { id: true, nome: true, dataHora: true, status: true } },
  ingressoTipo: { select: { id: true, nome: true, preco: true } },
  cliente: { select: { id: true, nome: true, cpf: true } },
  vendedor: { select: { id: true, nome: true } },
};

function gerarCodigo() {
  return Array.from({ length: 8 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join('');
}

async function obterCliente(transacao, estabelecimentoId, dados) {
  if (!dados.clienteId && !dados.cpf) return null;

  if (dados.clienteId) {
    const cliente = await transacao.cliente.findFirst({
      where: { id: dados.clienteId, estabelecimentoId },
    });
    if (!cliente) throw erroHttp(404, 'Cliente não encontrado.');
    return cliente;
  }

  const cpf = dados.cpf;
  const existente = await transacao.cliente.findFirst({
    where: { estabelecimentoId, cpf },
  });
  if (existente) return existente;

  try {
    return await transacao.cliente.create({
      data: { estabelecimentoId, cpf, nome: dados.nomeCliente ?? `Cliente ${cpf}` },
    });
  } catch (erro) {
    if (erro?.code !== 'P2002') throw erro;
    return transacao.cliente.findFirst({ where: { estabelecimentoId, cpf } });
  }
}

async function criarComCodigoDisponivel(transacao, dados, tentativas = 5) {
  for (let tentativa = 0; tentativa < tentativas; tentativa += 1) {
    try {
      return await transacao.vendaIngresso.create({
        data: { ...dados, codigoIngresso: gerarCodigo() },
        select: selecaoVenda,
      });
    } catch (erro) {
      if (erro?.code !== 'P2002' || tentativa === tentativas - 1) throw erro;
    }
  }
  throw new Error('Não foi possível gerar código de ingresso.');
}

export async function criarVendaIngresso(prisma, estabelecimentoId, usuarioVendedorId, dados) {
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    try {
      return await prisma.$transaction(async (transacao) => {
        const evento = await transacao.evento.findFirst({
          where: { id: dados.eventoId, estabelecimentoId },
          select: { id: true, status: true },
        });
        if (!evento) throw erroHttp(404, 'Evento não encontrado.');
        if (evento.status === 'ENCERRADO') {
          throw erroHttp(409, 'Não é possível vender ingresso para evento encerrado.');
        }

        const tipo = await transacao.ingressoTipo.findFirst({
          where: {
            id: dados.ingressoTipoId,
            eventoId: dados.eventoId,
            estabelecimentoId,
          },
          select: { id: true, preco: true },
        });
        if (!tipo) throw erroHttp(404, 'Tipo de ingresso não encontrado.');

        // O update condicional é atômico no banco: em concorrência, só uma venda
        // consegue transformar o último saldo positivo em zero.
        const estoque = await transacao.ingressoTipo.updateMany({
          where: {
            id: tipo.id,
            estabelecimentoId,
            quantidadeDisponivel: { gt: 0 },
          },
          data: { quantidadeDisponivel: { decrement: 1 } },
        });
        if (estoque.count !== 1) throw erroHttp(409, 'Ingressos esgotados');

        const cliente = await obterCliente(transacao, estabelecimentoId, dados);
        return criarComCodigoDisponivel(transacao, {
          estabelecimentoId,
          eventoId: evento.id,
          ingressoTipoId: tipo.id,
          clienteId: cliente?.id,
          usuarioVendedorId,
          valorPago: tipo.preco,
        });
      });
    } catch (erro) {
      if (erro?.code === 'P2002' && tentativa < 4) continue;
      throw erro;
    }
  }
  throw new Error('Não foi possível concluir a venda.');
}

export async function obterVendaIngresso(prisma, estabelecimentoId, id) {
  const venda = await prisma.vendaIngresso.findFirst({
    where: { id, estabelecimentoId },
    select: selecaoVenda,
  });
  if (!venda) throw erroHttp(404, 'Venda de ingresso não encontrada.');
  return venda;
}

export async function listarVendasIngressos(prisma, estabelecimentoId, filtros) {
  const where = {
    estabelecimentoId,
    ...(filtros.eventoId ? { eventoId: filtros.eventoId } : {}),
    ...(filtros.vendedorId ? { usuarioVendedorId: filtros.vendedorId } : {}),
    ...(filtros.dataInicio || filtros.dataFim ? {
      criadoEm: {
        ...(filtros.dataInicio ? { gte: filtros.dataInicio } : {}),
        ...(filtros.dataFim ? { lte: filtros.dataFim } : {}),
      },
    } : {}),
  };
  const [total, dados] = await Promise.all([
    prisma.vendaIngresso.count({ where }),
    prisma.vendaIngresso.findMany({
      where,
      select: selecaoVenda,
      orderBy: { criadoEm: 'desc' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);
  return {
    dados,
    pagina: filtros.pagina,
    limite: filtros.limite,
    total,
    totalPaginas: Math.ceil(total / filtros.limite),
  };
}

export async function estornarVendaIngresso(prisma, estabelecimentoId, id) {
  return prisma.$transaction(async (transacao) => {
    const venda = await transacao.vendaIngresso.findFirst({
      where: { id, estabelecimentoId },
      select: { id: true, ingressoTipoId: true },
    });
    if (!venda) throw erroHttp(404, 'Venda de ingresso não encontrada.');
    const atualizada = await transacao.vendaIngresso.updateMany({
      where: {
        id: venda.id,
        estabelecimentoId,
        statusVenda: 'CONFIRMADA',
        statusCheckin: 'PENDENTE',
      },
      data: { statusVenda: 'ESTORNADA', estornadaEm: new Date() },
    });
    if (atualizada.count !== 1) {
      const estado = await transacao.vendaIngresso.findFirst({
        where: { id: venda.id, estabelecimentoId },
        select: { statusVenda: true, statusCheckin: true },
      });
      if (estado?.statusVenda === 'ESTORNADA') throw erroHttp(409, 'Venda já estornada.');
      throw erroHttp(409, 'Não é possível estornar ingresso já utilizado.');
    }

    await transacao.ingressoTipo.update({
      where: { id: venda.ingressoTipoId },
      data: { quantidadeDisponivel: { increment: 1 } },
    });
    return transacao.vendaIngresso.findFirst({
      where: { id: venda.id, estabelecimentoId },
      select: selecaoVenda,
    });
  });
}
