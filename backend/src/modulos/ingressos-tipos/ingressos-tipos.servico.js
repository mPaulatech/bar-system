import { Prisma } from '@prisma/client';
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

function comQuantidadeRestante(tipo) {
  return {
    ...tipo,
    quantidadeRestante: tipo.quantidadeDisponivel,
    esgotado: tipo.quantidadeDisponivel === 0,
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
  return comQuantidadeRestante(tipo);
}

export async function listarIngressosTipos(prisma, estabelecimentoId, eventoId) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  const tipos = await prisma.ingressoTipo.findMany({
    where: { estabelecimentoId, eventoId },
    select: camposTipo,
    orderBy: { id: 'asc' },
  });
  return tipos.map((tipo) => comQuantidadeRestante(tipo));
}

export async function obterIngressoTipo(prisma, estabelecimentoId, eventoId, id) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  const tipo = await obterTipo(prisma, estabelecimentoId, eventoId, id);
  return comQuantidadeRestante(tipo);
}

export async function atualizarIngressoTipo(prisma, estabelecimentoId, eventoId, id, dados) {
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    try {
      const atualizado = await prisma.$transaction(async (transacao) => {
        const evento = await obterEvento(transacao, estabelecimentoId, eventoId);
        if (evento.status === 'ENCERRADO') {
          throw erroHttp(409, 'Não é possível editar tipo de ingresso em evento encerrado.');
        }

        const tipo = await obterTipo(transacao, estabelecimentoId, eventoId, id);

        if (dados.quantidadeDisponivel !== undefined) {
          const vendidos = await transacao.vendaIngresso.count({
            where: {
              estabelecimentoId,
              eventoId,
              ingressoTipoId: tipo.id,
              statusVenda: 'CONFIRMADA',
            },
          });

          if (dados.quantidadeDisponivel < vendidos) {
            throw erroHttp(
              409,
              `A quantidade disponível não pode ser menor que a quantidade vendida (${vendidos}).`,
            );
          }
        }

        return transacao.ingressoTipo.update({
          where: { id: tipo.id },
          data: dados,
          select: camposTipo,
        });
      }, {
        // A contagem e a alteração precisam observar a mesma versão do lote.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
      return comQuantidadeRestante(atualizado);
    } catch (erro) {
      // O PostgreSQL pode abortar a transação quando uma venda concorrente
      // altera o mesmo lote; repetir evita transformar o conflito transitório
      // em erro para o usuário e revalida a quantidade vendida.
      if (erro?.code !== 'P2034' || tentativa === 4) throw erro;
    }
  }
}

export async function excluirIngressoTipo(prisma, estabelecimentoId, eventoId, id) {
  await obterEvento(prisma, estabelecimentoId, eventoId);
  await obterTipo(prisma, estabelecimentoId, eventoId, id);
  const vendidos = await prisma.vendaIngresso.count({
    where: {
      estabelecimentoId,
      eventoId,
      ingressoTipoId: id,
      statusVenda: 'CONFIRMADA',
    },
  });
  if (vendidos > 0) {
    throw erroHttp(409, 'Não é possível excluir tipo de ingresso que já foi vendido.');
  }

  await prisma.ingressoTipo.delete({ where: { id } });
  return { id, excluido: true };
}
