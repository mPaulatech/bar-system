import { erroHttp } from '../../utilitarios/erro-http.js';

const selecaoCheckin = {
  id: true,
  codigoIngresso: true,
  statusCheckin: true,
  checkinEm: true,
  evento: { select: { id: true, nome: true } },
  ingressoTipo: { select: { nome: true } },
  cliente: { select: { nome: true } },
  checkinPor: { select: { nome: true } },
};

function falhaCheckin(status, resultado, mensagem) {
  return erroHttp(status, mensagem, { resultado });
}

function respostaLista(dados, pagina, limite, total) {
  return {
    dados: dados.map((venda) => ({
      id: venda.id,
      codigoIngresso: venda.codigoIngresso,
      evento: venda.evento,
      ingressoTipo: venda.ingressoTipo,
      clienteNome: venda.cliente?.nome ?? null,
      checkinEm: venda.checkinEm,
      checkinPorNome: venda.checkinPor?.nome ?? null,
    })),
    pagina,
    limite,
    total,
    totalPaginas: Math.ceil(total / limite),
  };
}

async function obterEventoSelecionado(transacao, estabelecimentoId, eventoId) {
  const evento = await transacao.evento.findFirst({
    where: { id: eventoId, estabelecimentoId },
    select: { id: true, nome: true, status: true },
  });
  if (!evento) {
    throw falhaCheckin(404, 'EVENTO_INCORRETO', 'Evento não encontrado neste estabelecimento.');
  }
  if (evento.status !== 'ATIVO') {
    throw falhaCheckin(409, 'EVENTO_INATIVO', 'O evento selecionado não está ativo.');
  }
  return evento;
}

export async function realizarCheckin(prisma, estabelecimentoId, usuarioId, dados) {
  return prisma.$transaction(async (transacao) => {
    const evento = await obterEventoSelecionado(
      transacao,
      estabelecimentoId,
      dados.eventoId,
    );
    const ingresso = await transacao.vendaIngresso.findFirst({
      where: { codigoIngresso: dados.codigoIngresso, estabelecimentoId },
      select: {
        id: true,
        eventoId: true,
        statusVenda: true,
        statusCheckin: true,
      },
    });

    if (!ingresso) {
      throw falhaCheckin(404, 'INGRESSO_INVALIDO', 'Ingresso inválido.');
    }
    if (ingresso.eventoId !== evento.id) {
      throw falhaCheckin(409, 'EVENTO_INCORRETO', 'O ingresso pertence a outro evento.');
    }
    if (ingresso.statusVenda === 'ESTORNADA') {
      throw falhaCheckin(409, 'ESTORNADO', 'Ingresso estornado não pode realizar check-in.');
    }
    if (ingresso.statusCheckin === 'UTILIZADO') {
      throw falhaCheckin(409, 'JA_UTILIZADO', 'Este ingresso já foi utilizado.');
    }

    const atualizado = await transacao.vendaIngresso.updateMany({
      where: {
        id: ingresso.id,
        estabelecimentoId,
        eventoId: evento.id,
        statusVenda: 'CONFIRMADA',
        statusCheckin: 'PENDENTE',
      },
      data: {
        statusCheckin: 'UTILIZADO',
        checkinEm: new Date(),
        checkinPorId: usuarioId,
      },
    });
    if (atualizado.count !== 1) {
      const estadoAtual = await transacao.vendaIngresso.findFirst({
        where: { id: ingresso.id, estabelecimentoId },
        select: { statusVenda: true, statusCheckin: true },
      });
      if (estadoAtual?.statusCheckin === 'UTILIZADO') {
        throw falhaCheckin(409, 'JA_UTILIZADO', 'Este ingresso já foi utilizado.');
      }
      if (estadoAtual?.statusVenda === 'ESTORNADA') {
        throw falhaCheckin(409, 'ESTORNADO', 'Ingresso estornado não pode realizar check-in.');
      }
      throw falhaCheckin(409, 'INGRESSO_INVALIDO', 'Ingresso inválido.');
    }

    const resultado = await transacao.vendaIngresso.findFirst({
      where: { id: ingresso.id, estabelecimentoId },
      select: selecaoCheckin,
    });
    return {
      resultado: 'AUTORIZADO',
      mensagem: 'Check-in autorizado.',
      ingresso: {
        codigoIngresso: resultado.codigoIngresso,
        evento: resultado.evento,
        ingressoTipo: resultado.ingressoTipo,
        clienteNome: resultado.cliente?.nome ?? null,
        checkinEm: resultado.checkinEm,
        checkinPorNome: resultado.checkinPor?.nome ?? null,
      },
    };
  });
}

export async function listarPresentes(prisma, estabelecimentoId, filtros) {
  const where = {
    estabelecimentoId,
    eventoId: filtros.eventoId,
    statusVenda: 'CONFIRMADA',
    statusCheckin: 'UTILIZADO',
  };
  const [total, dados] = await Promise.all([
    prisma.vendaIngresso.count({ where }),
    prisma.vendaIngresso.findMany({
      where,
      select: selecaoCheckin,
      orderBy: { checkinEm: 'desc' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);
  return respostaLista(dados, filtros.pagina, filtros.limite, total);
}

export async function listarAusentes(prisma, estabelecimentoId, filtros) {
  const where = {
    estabelecimentoId,
    eventoId: filtros.eventoId,
    statusVenda: 'CONFIRMADA',
    statusCheckin: 'PENDENTE',
  };
  const [total, dados] = await Promise.all([
    prisma.vendaIngresso.count({ where }),
    prisma.vendaIngresso.findMany({
      where,
      select: selecaoCheckin,
      orderBy: { id: 'asc' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);
  return respostaLista(dados, filtros.pagina, filtros.limite, total);
}
