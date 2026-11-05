import { Prisma } from '@prisma/client';
import { erroHttp } from '../../utilitarios/erro-http.js';

const selecaoVendaConsumo = {
  id: true,
  idTransacaoExterna: true,
  valorTotal: true,
  dataHoraTransacao: true,
  eventoId: true,
  clienteId: true,
  itens: true,
  criadoEm: true,
};

function formatarVendaConsumo(venda) {
  return { ...venda, valorTotal: new Prisma.Decimal(venda.valorTotal).toFixed(2) };
}

async function identificarEvento(transacao, estabelecimentoId, dados) {
  if (dados.eventoId) {
    const evento = await transacao.evento.findFirst({
      where: { id: dados.eventoId, estabelecimentoId },
      select: { id: true },
    });
    if (!evento) throw erroHttp(404, 'Evento não encontrado.');
    return evento.id;
  }

  const horario = dados.dataHoraTransacao;
  const eventosPossiveis = await transacao.evento.findMany({
    where: {
      estabelecimentoId,
      dataHora: {
        gte: new Date(horario.getTime() - 72 * 60 * 60 * 1000),
        lte: horario,
      },
    },
    select: { id: true, dataHora: true, duracaoHoras: true },
  });
  const eventosCorrespondentes = eventosPossiveis.filter((evento) => {
    const inicio = new Date(evento.dataHora).getTime();
    const fim = inicio + evento.duracaoHoras * 60 * 60 * 1000;
    return horario.getTime() >= inicio && horario.getTime() < fim;
  });
  return eventosCorrespondentes.length === 1 ? eventosCorrespondentes[0].id : null;
}

/**
 * Registra uma venda externa, sem exigir cliente, e associa evento manual ou automaticamente.
 * @param {import('@prisma/client').PrismaClient} prisma Acesso ao banco.
 * @param {number} estabelecimentoId Estabelecimento identificado pela API Key.
 * @param {object} dados Dados validados da venda externa.
 * @returns {Promise<object>} Venda registrada ou já recebida anteriormente.
 */
export async function receberVendaConsumo(prisma, estabelecimentoId, dados) {
  try {
    return await prisma.$transaction(async (transacao) => {
      if (dados.clienteId) {
        const cliente = await transacao.cliente.findFirst({
          where: { id: dados.clienteId, estabelecimentoId },
          select: { id: true },
        });
        if (!cliente) throw erroHttp(404, 'Cliente não encontrado.');
      }

      const eventoId = await identificarEvento(transacao, estabelecimentoId, dados);
      const venda = await transacao.vendaConsumoApi.create({
        data: {
          estabelecimentoId,
          eventoId,
          clienteId: dados.clienteId ?? null,
          idTransacaoExterna: dados.idTransacaoExterna,
          valorTotal: new Prisma.Decimal(dados.valorTotal),
          dataHoraTransacao: dados.dataHoraTransacao,
          itens: dados.itens,
          payloadOriginal: {
            idTransacaoExterna: dados.idTransacaoExterna,
            valorTotal: String(dados.valorTotal),
            dataHoraTransacao: dados.dataHoraTransacao.toISOString(),
            ...(dados.eventoId ? { eventoId: dados.eventoId } : {}),
            ...(dados.clienteId ? { clienteId: dados.clienteId } : {}),
            ...(dados.itens === undefined ? {} : { itens: dados.itens }),
          },
        },
        select: selecaoVendaConsumo,
      });
      return { venda: formatarVendaConsumo(venda), criada: true };
    });
  } catch (erro) {
    if (erro?.code !== 'P2002') throw erro;
    const vendaExistente = await prisma.vendaConsumoApi.findUnique({
      where: {
        estabelecimentoId_idTransacaoExterna: {
          estabelecimentoId,
          idTransacaoExterna: dados.idTransacaoExterna,
        },
      },
      select: selecaoVendaConsumo,
    });
    if (!vendaExistente) throw erro;
    return { venda: formatarVendaConsumo(vendaExistente), criada: false };
  }
}

/**
 * Calcula faturamento de consumo e ticket médio dos presentes em um evento.
 * @param {import('@prisma/client').PrismaClient} prisma Acesso ao banco.
 * @param {number} estabelecimentoId Estabelecimento autenticado.
 * @param {number} eventoId Evento consultado.
 * @returns {Promise<object>} Faturamento, presentes e ticket médio do evento.
 */
export async function obterResumoConsumoEvento(prisma, estabelecimentoId, eventoId) {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, estabelecimentoId },
    select: { id: true, nome: true, dataHora: true },
  });
  if (!evento) throw erroHttp(404, 'Evento não encontrado.');

  const [consumo, presentes] = await Promise.all([
    prisma.vendaConsumoApi.aggregate({
      where: { estabelecimentoId, eventoId },
      _sum: { valorTotal: true },
    }),
    prisma.vendaIngresso.count({
      where: {
        estabelecimentoId,
        eventoId,
        statusVenda: 'CONFIRMADA',
        statusCheckin: 'UTILIZADO',
      },
    }),
  ]);
  const faturamento = consumo._sum.valorTotal ?? new Prisma.Decimal(0);
  const ticketMedio = presentes > 0
    ? faturamento.div(presentes).toDecimalPlaces(2).toFixed(2)
    : null;

  return {
    evento,
    faturamentoBar: faturamento.toFixed(2),
    presentesCheckin: presentes,
    ticketMedioGeral: ticketMedio,
  };
}
