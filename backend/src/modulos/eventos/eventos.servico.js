import { erroHttp } from '../../utilitarios/erro-http.js';

const camposEvento = {
  id: true,
  estabelecimentoId: true,
  nome: true,
  generoMusical: true,
  atracoes: true,
  dataHora: true,
  duracaoHoras: true,
  status: true,
  criadoEm: true,
  atualizadoEm: true,
};

function filtroBase(estabelecimentoId, filtros = {}) {
  const where = { estabelecimentoId };
  if (filtros.status) where.status = filtros.status;
  if (filtros.generoMusical) {
    where.generoMusical = { contains: filtros.generoMusical, mode: 'insensitive' };
  }
  if (filtros.dataInicio || filtros.dataFim) {
    where.dataHora = {
      ...(filtros.dataInicio ? { gte: filtros.dataInicio } : {}),
      ...(filtros.dataFim ? { lte: filtros.dataFim } : {}),
    };
  }
  return where;
}

export function criarEvento(prisma, estabelecimentoId, dados) {
  return prisma.evento.create({
    data: { ...dados, estabelecimentoId },
    select: camposEvento,
  });
}

export async function listarEventos(prisma, estabelecimentoId, filtros) {
  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 20;
  const where = filtroBase(estabelecimentoId, filtros);
  const [total, dados] = await Promise.all([
    prisma.evento.count({ where }),
    prisma.evento.findMany({
      where,
      select: camposEvento,
      orderBy: { dataHora: 'asc' },
      skip: (pagina - 1) * limite,
      take: limite,
    }),
  ]);
  return { dados, pagina, limite, total, totalPaginas: Math.ceil(total / limite) };
}

export async function listarEventosAtivos(prisma, estabelecimentoId) {
  const eventos = await prisma.evento.findMany({
    where: { estabelecimentoId, status: 'ATIVO' },
    select: camposEvento,
    orderBy: { dataHora: 'asc' },
  });
  const agora = Date.now();
  return eventos.filter((evento) => (
    new Date(evento.dataHora).getTime() + evento.duracaoHoras * 60 * 60 * 1000 >= agora
  ));
}

export async function obterEvento(prisma, estabelecimentoId, id) {
  const evento = await prisma.evento.findFirst({
    where: { id, estabelecimentoId },
    select: camposEvento,
  });
  if (!evento) throw erroHttp(404, 'Evento não encontrado.');
  return evento;
}

export async function atualizarEvento(prisma, estabelecimentoId, id, dados) {
  await obterEvento(prisma, estabelecimentoId, id);
  return prisma.evento.update({
    where: { id },
    data: dados,
    select: camposEvento,
  });
}

export async function excluirEvento(prisma, estabelecimentoId, id) {
  await obterEvento(prisma, estabelecimentoId, id);
  const vendas = await prisma.vendaIngresso.count({
    where: { estabelecimentoId, eventoId: id },
  });
  if (vendas > 0) {
    return prisma.evento.update({
      where: { id },
      data: { status: 'ENCERRADO' },
      select: camposEvento,
    });
  }
  await prisma.evento.delete({ where: { id } });
  return { id, excluido: true };
}
