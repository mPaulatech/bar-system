import { erroHttp } from '../../utilitarios/erro-http.js';

const camposTipo = {
  id: true,
  estabelecimentoId: true,
  eventoId: true,
  nome: true,
  preco: true,
  quantidadeDisponivel: true,
  criadoEm: true,
  atualizadoEm: true,
};

async function obterEvento(prisma, estabelecimentoId, eventoId) {
  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, estabelecimentoId },
    select: { id: true, status: true },
  });
  if (!evento) throw erroHttp(404, 'Evento não encontrado.');
  return evento;
}

async function obterTipo(prisma, estabelecimentoId, eventoId, id) {
  const tipo = await prisma.ingressoTipo.findFirst({
    where: { id, eventoId, estabelecimentoId },
    select: camposTipo,
  });
  if (!tipo) throw erroHttp(404, 'Tipo de ingresso não encontrado.');
  return tipo;
}

async function contarVendidos(prisma, estabelecimentoId, eventoId, ingressoTipoId) {
  return prisma.vendaIngresso.count({
    where: {
      estabelecimentoId,
      eventoId,
      ingressoTipoId,
      statusVenda: 'CONFIRMADA',
    },
  });
}

function comQuantidadeRestante(tipo, vendidos) {
  return {
    ...tipo,
    quantidadeRestante: Math.max(tipo.quantidadeDisponivel - vendidos, 0),
  };
}

export async function criarIngressoTipo(prisma, estabelecimentoId, eventoId, dados) {
  const evento = await obterEvento(prisma, estabelecimentoId, eventoId);
  if (evento.status === 'ENCERRADO') {
    throw erroHttp(409, 'Não é possível criar tipo de ingresso em evento encerrado.');
  }

  const tipo = await prisma.ingressoTipo.create({
    data: { ...dados, eventoId, estabelecimentoId },
    select: camposTipo,
  });
  return comQuantidadeRestante(tipo, 0);
}

export async function listarIngressosTipos(prisma, estabelecimentoId, eventoId) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  const tipos = await prisma.ingressoTipo.findMany({
    where: { estabelecimentoId, eventoId },
    select: camposTipo,
    orderBy: { id: 'asc' },
  });
  return Promise.all(tipos.map(async (tipo) => (
    comQuantidadeRestante(
      tipo,
      await contarVendidos(prisma, estabelecimentoId, eventoId, tipo.id),
    )
  )));
}

export async function obterIngressoTipo(prisma, estabelecimentoId, eventoId, id) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  const tipo = await obterTipo(prisma, estabelecimentoId, eventoId, id);
  return comQuantidadeRestante(
    tipo,
    await contarVendidos(prisma, estabelecimentoId, eventoId, id),
  );
}

export async function atualizarIngressoTipo(prisma, estabelecimentoId, eventoId, id, dados) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  const tipo = await obterTipo(prisma, estabelecimentoId, eventoId, id);
  const vendidos = await contarVendidos(prisma, estabelecimentoId, eventoId, id);

  if (
    dados.quantidadeDisponivel !== undefined
    && dados.quantidadeDisponivel < vendidos
  ) {
    throw erroHttp(409, 'A quantidade disponível não pode ser menor que a quantidade já vendida.');
  }

  const atualizado = await prisma.ingressoTipo.update({
    where: { id: tipo.id },
    data: dados,
    select: camposTipo,
  });
  return comQuantidadeRestante(atualizado, vendidos);
}

export async function excluirIngressoTipo(prisma, estabelecimentoId, eventoId, id) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  await obterTipo(prisma, estabelecimentoId, eventoId, id);
  const vendidos = await contarVendidos(prisma, estabelecimentoId, eventoId, id);
  if (vendidos > 0) {
    throw erroHttp(409, 'Não é possível excluir tipo de ingresso que já foi vendido.');
  }

  await prisma.ingressoTipo.delete({ where: { id } });
  return { id, excluido: true };
}
