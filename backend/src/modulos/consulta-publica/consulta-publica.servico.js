import { erroHttp } from '../../utilitarios/erro-http.js';
import { criarCompraPublica as criarCompraPublicaIngresso } from '../vendas-ingressos/vendas-ingressos.servico.js';

const camposEstabelecimento = {
  identificadorPublico: true,
  nomeFantasia: true,
};

const camposEvento = {
  id: true,
  nome: true,
  generoMusical: true,
  atracoes: true,
  dataHora: true,
  duracaoHoras: true,
};

const camposLote = {
  id: true,
  nome: true,
  preco: true,
  quantidadeDisponivel: true,
};

async function obterEstabelecimentoPorIdentificador(prisma, identificadorPublico) {
  const estabelecimento = await prisma.estabelecimento.findUnique({
    where: { identificadorPublico },
    select: { id: true, ...camposEstabelecimento },
  });
  if (!estabelecimento) throw erroHttp(404, 'Estabelecimento não encontrado.');
  return estabelecimento;
}

function eventoAindaDisponivel(evento) {
  return new Date(evento.dataHora).getTime()
    + evento.duracaoHoras * 60 * 60 * 1000 >= Date.now();
}

export async function obterEstabelecimentoPublico(prisma, identificadorPublico) {
  const estabelecimento = await obterEstabelecimentoPorIdentificador(prisma, identificadorPublico);
  return {
    identificadorPublico: estabelecimento.identificadorPublico,
    nomeFantasia: estabelecimento.nomeFantasia,
  };
}

export async function listarEventosPublicos(prisma, identificadorPublico) {
  const estabelecimento = await obterEstabelecimentoPorIdentificador(prisma, identificadorPublico);
  const eventos = await prisma.evento.findMany({
    where: {
      estabelecimentoId: estabelecimento.id,
      status: 'ATIVO',
      ingressosTipos: {
        some: {
          estabelecimentoId: estabelecimento.id,
          quantidadeDisponivel: { gt: 0 },
        },
      },
    },
    select: {
      ...camposEvento,
      ingressosTipos: {
        where: {
          estabelecimentoId: estabelecimento.id,
          quantidadeDisponivel: { gt: 0 },
        },
        select: { id: true },
      },
    },
    orderBy: { dataHora: 'asc' },
  });

  return eventos
    .filter(eventoAindaDisponivel)
    .map(({ ingressosTipos, ...evento }) => evento);
}

export async function listarLotesPublicos(prisma, identificadorPublico, eventoId) {
  const estabelecimento = await obterEstabelecimentoPorIdentificador(prisma, identificadorPublico);
  const evento = await prisma.evento.findFirst({
    where: {
      id: eventoId,
      estabelecimentoId: estabelecimento.id,
      status: 'ATIVO',
    },
    select: { id: true, dataHora: true, duracaoHoras: true },
  });

  if (!evento || !eventoAindaDisponivel(evento)) {
    throw erroHttp(404, 'Evento não encontrado.');
  }

  return prisma.ingressoTipo.findMany({
    where: {
      estabelecimentoId: estabelecimento.id,
      eventoId: evento.id,
      quantidadeDisponivel: { gt: 0 },
    },
    select: camposLote,
    orderBy: { id: 'asc' },
  });
}

/**
 * Cria uma compra pública no estabelecimento identificado pela URL.
 * @param {object} prisma Cliente Prisma.
 * @param {string} identificadorPublico Identificador público do estabelecimento.
 * @param {object} dados Dados validados da compra.
 * @returns {Promise<object>} Compra criada ou recuperada por idempotência.
 */
export async function criarCompraPublica(prisma, identificadorPublico, dados) {
  const estabelecimento = await obterEstabelecimentoPorIdentificador(prisma, identificadorPublico);
  return criarCompraPublicaIngresso(prisma, estabelecimento.id, dados);
}
