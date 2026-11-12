import { randomInt } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { erroHttp } from '../../utilitarios/erro-http.js';

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const selecaoVenda = {
  id: true,
  valorPago: true,
  formaPagamento: true,
  codigoIngresso: true,
  statusVenda: true,
  statusCheckin: true,
  criadoEm: true,
  estornadaEm: true,
  compra: { select: { id: true, origem: true, statusPagamento: true } },
  evento: { select: { id: true, nome: true, dataHora: true, status: true } },
  ingressoTipo: { select: { id: true, nome: true, preco: true } },
  cliente: { select: { id: true, nome: true, cpf: true, email: true } },
  vendedor: { select: { id: true, nome: true } },
};

function gerarCodigo() {
  return Array.from({ length: 8 }, () => ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]).join('');
}

async function obterCliente(transacao, estabelecimentoId, dados) {
  const cpf = dados.cpf;
  const existente = await transacao.cliente.findFirst({
    where: { estabelecimentoId, cpf },
  });
  if (existente) {
    if (existente.nome !== dados.nomeCliente || existente.email !== dados.emailCliente) {
      throw erroHttp(409, 'Os dados enviados são diferentes do cadastro existente para este CPF.');
    }
    if (dados.consentimentoMarketing && !existente.consentimentoMarketing) {
      return transacao.cliente.update({
        where: { id: existente.id },
        data: { consentimentoMarketing: true },
      });
    }
    return existente;
  }

  try {
    return await transacao.cliente.create({
      data: {
        estabelecimentoId,
        cpf,
        nome: dados.nomeCliente,
        email: dados.emailCliente,
        consentimentoMarketing: dados.consentimentoMarketing ?? false,
      },
    });
  } catch (erro) {
    if (erro?.code !== 'P2002') throw erro;
    const cliente = await transacao.cliente.findFirst({ where: { estabelecimentoId, cpf } });
    if (!cliente) throw erroHttp(409, 'Não foi possível reutilizar o cliente informado.');
    if (cliente.nome !== dados.nomeCliente || cliente.email !== dados.emailCliente) {
      throw erroHttp(409, 'Os dados enviados são diferentes do cadastro existente para este CPF.');
    }
    return cliente;
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

async function obterCompraIdempotente(transacao, estabelecimentoId, chaveIdempotencia) {
  if (!chaveIdempotencia) return null;
  return transacao.compra.findFirst({
    where: { estabelecimentoId, chaveIdempotencia },
    select: {
      id: true,
      estabelecimentoId: true,
      cliente: { select: { id: true, cpf: true, nome: true, email: true } },
      statusPagamento: true,
      valorTotal: true,
      vendasIngressos: {
        select: { eventoId: true, ingressoTipoId: true },
      },
    },
  });
}

function dadosDaCompraCorrespondem(compra, estabelecimentoId, dados) {
  const vendas = compra.vendasIngressos ?? [];
  return compra.estabelecimentoId === estabelecimentoId
    && compra.cliente?.cpf === dados.cpf
    && compra.cliente?.nome === dados.nomeCliente
    && compra.cliente?.email === dados.emailCliente
    && vendas.length === dados.quantidade
    && vendas.every((venda) => (
      venda.eventoId === dados.eventoId
      && venda.ingressoTipoId === dados.ingressoTipoId
    ));
}

async function obterVendasDaCompra(transacao, estabelecimentoId, compraId) {
  return transacao.vendaIngresso.findMany({
    where: { estabelecimentoId, compraId },
    select: selecaoVenda,
    orderBy: { id: 'asc' },
  });
}

function resultadoDaCompra(compra, vendas, dados) {
  return {
    compraId: compra.id,
    vendas,
    quantidade: vendas.length,
    valorTotal: compra.valorTotal,
    ...(dados.formaPagamento ? { formaPagamento: dados.formaPagamento } : {}),
    statusPagamento: compra.statusPagamento,
    emailTransacionalSimulado: true,
  };
}

async function reutilizarCompraIdempotente(transacao, estabelecimentoId, compra, dados) {
  if (!dadosDaCompraCorrespondem(compra, estabelecimentoId, dados)) {
    throw erroHttp(409, 'A chave de idempotência já foi utilizada com dados diferentes.');
  }
  const vendasExistentes = await obterVendasDaCompra(
    transacao,
    estabelecimentoId,
    compra.id,
  );
  if (dados.consentimentoMarketing && compra.cliente?.id) {
    await transacao.cliente.update({
      where: { id: compra.cliente.id },
      data: { consentimentoMarketing: true },
    });
  }
  return resultadoDaCompra(compra, vendasExistentes, dados);
}

async function criarCompraIngresso(
  prisma,
  estabelecimentoId,
  dados,
  { origem, statusPagamento, usuarioVendedorId = null, exigirEventoAtivo = false },
) {
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    try {
      return await prisma.$transaction(async (transacao) => {
        const compraExistente = await obterCompraIdempotente(
          transacao,
          estabelecimentoId,
          dados.chaveIdempotencia,
        );
        if (compraExistente) {
          return reutilizarCompraIdempotente(
            transacao,
            estabelecimentoId,
            compraExistente,
            dados,
          );
        }

        const evento = await transacao.evento.findFirst({
          where: { id: dados.eventoId, estabelecimentoId },
          select: { id: true, status: true, dataHora: true, duracaoHoras: true },
        });
        if (!evento) throw erroHttp(404, 'Evento não encontrado.');
        if (evento.status === 'ENCERRADO' || (exigirEventoAtivo && evento.status !== 'ATIVO')) {
          throw erroHttp(409, 'Não é possível vender ingresso para evento encerrado.');
        }
        if (
          exigirEventoAtivo
          && new Date(evento.dataHora).getTime()
            + evento.duracaoHoras * 60 * 60 * 1000 < Date.now()
        ) {
          throw erroHttp(409, 'Não é possível comprar ingresso para evento encerrado.');
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

        // A condição e o decremento acontecem juntos no banco, evitando venda
        // parcial ou estoque negativo quando várias vendas chegam ao mesmo tempo.
        const estoque = await transacao.ingressoTipo.updateMany({
          where: {
            id: tipo.id,
            estabelecimentoId,
            quantidadeDisponivel: { gte: dados.quantidade },
          },
          data: { quantidadeDisponivel: { decrement: dados.quantidade } },
        });
        if (estoque.count !== 1) {
          const saldo = await transacao.ingressoTipo.findFirst({
            where: { id: tipo.id, estabelecimentoId },
            select: { quantidadeDisponivel: true },
          });
          throw erroHttp(409, `Ingressos insuficientes. Restam ${saldo?.quantidadeDisponivel ?? 0} ingresso(s).`);
        }

        const cliente = await obterCliente(transacao, estabelecimentoId, dados);
        const compra = await transacao.compra.create({
          data: {
            estabelecimentoId,
            clienteId: cliente.id,
            origem,
            statusPagamento,
            chaveIdempotencia: dados.chaveIdempotencia,
            valorTotal: new Prisma.Decimal(tipo.preco).mul(dados.quantidade),
          },
          select: { id: true },
        });
        const vendas = [];
        for (let indice = 0; indice < dados.quantidade; indice += 1) {
          vendas.push(await criarComCodigoDisponivel(transacao, {
            estabelecimentoId,
            eventoId: evento.id,
            ingressoTipoId: tipo.id,
            compraId: compra.id,
            clienteId: cliente.id,
            usuarioVendedorId,
            valorPago: tipo.preco,
            ...(dados.formaPagamento ? { formaPagamento: dados.formaPagamento } : {}),
          }));
        }
        return resultadoDaCompra(
          { ...compra, statusPagamento, valorTotal: new Prisma.Decimal(tipo.preco).mul(dados.quantidade) },
          vendas,
          dados,
        );
      });
    } catch (erro) {
      if (erro?.code === 'P2002' && tentativa < 4) continue;
      throw erro;
    }
  }
  throw new Error('Não foi possível concluir a venda.');
}

export async function criarVendaIngresso(prisma, estabelecimentoId, usuarioVendedorId, dados) {
  return criarCompraIngresso(prisma, estabelecimentoId, dados, {
    origem: 'PDV',
    statusPagamento: 'APROVADO',
    usuarioVendedorId,
  });
}

/**
 * Cria uma compra pública com cliente, ingressos e estoque dentro da mesma transação.
 * @param {object} prisma Cliente Prisma.
 * @param {number} estabelecimentoId Estabelecimento identificado pela URL pública.
 * @param {object} dados Dados validados da compra pública.
 * @returns {Promise<object>} Compra criada ou compra já existente pela idempotência.
 */
export async function criarCompraPublica(prisma, estabelecimentoId, dados) {
  if (dados.pagamentoSimulado === 'RECUSADO') {
    throw erroHttp(402, 'O pagamento simulado foi recusado. Nenhum ingresso foi criado.');
  }

  return criarCompraIngresso(prisma, estabelecimentoId, {
    ...dados,
    nomeCliente: dados.nome,
    emailCliente: dados.email,
    consentimentoMarketing: dados.consentimentoMarketing,
  }, {
    origem: 'PUBLICA',
    statusPagamento: 'APROVADO',
    exigirEventoAtivo: true,
  });
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

    const estoque = await transacao.ingressoTipo.updateMany({
      where: { id: venda.ingressoTipoId, estabelecimentoId },
      data: { quantidadeDisponivel: { increment: 1 } },
    });
    if (estoque.count !== 1) {
      throw erroHttp(409, 'Não foi possível devolver o ingresso ao estoque.');
    }

    return transacao.vendaIngresso.findFirst({
      where: { id: venda.id, estabelecimentoId },
      select: selecaoVenda,
    });
  });
}
