const LIMITE_INATIVIDADE_DIAS = 60;
const LIMITE_OCUPACAO_PERCENTUAL = 40;
const EDICOES_ANALISADAS = 3;
const MILISSEGUNDOS_DIA = 24 * 60 * 60 * 1000;

function chaveGenero(generoMusical) {
  return generoMusical.trim().toLocaleLowerCase('pt-BR');
}

function percentualFormatado(valor) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(valor);
}

export async function calcularRecomendacoes(prisma, estabelecimentoId, agora = new Date()) {
  const [clientes, ultimasComprasIngressos, ultimasComprasConsumo, eventos] = await Promise.all([
    prisma.cliente.findMany({
      where: { estabelecimentoId },
      select: { id: true, nome: true, criadoEm: true },
    }),
    prisma.vendaIngresso.groupBy({
      by: ['clienteId'],
      where: { estabelecimentoId, clienteId: { not: null }, statusVenda: 'CONFIRMADA' },
      _max: { criadoEm: true },
    }),
    prisma.vendaConsumoApi.groupBy({
      by: ['clienteId'],
      where: { estabelecimentoId, clienteId: { not: null } },
      _max: { dataHoraTransacao: true },
    }),
    prisma.evento.findMany({
      where: {
        estabelecimentoId,
        status: 'ENCERRADO',
        dataHora: { lt: agora },
        capacidade: { gt: 0 },
      },
      select: { id: true, generoMusical: true, capacidade: true, dataHora: true },
      orderBy: { dataHora: 'desc' },
    }),
  ]);

  const ultimaAtividadePorCliente = new Map();
  for (const compra of ultimasComprasIngressos) {
    if (compra._max.criadoEm) {
      ultimaAtividadePorCliente.set(compra.clienteId, compra._max.criadoEm);
    }
  }
  for (const compra of ultimasComprasConsumo) {
    const dataConsumo = compra._max.dataHoraTransacao;
    const dataAtual = ultimaAtividadePorCliente.get(compra.clienteId);
    if (dataConsumo && (!dataAtual || dataConsumo > dataAtual)) {
      ultimaAtividadePorCliente.set(compra.clienteId, dataConsumo);
    }
  }

  const clientesInativos = clientes.flatMap((cliente) => {
    const ultimaAtividade = ultimaAtividadePorCliente.get(cliente.id) ?? cliente.criadoEm;
    const milissegundosInativo = agora.getTime() - ultimaAtividade.getTime();
    if (milissegundosInativo <= LIMITE_INATIVIDADE_DIAS * MILISSEGUNDOS_DIA) return [];

    const diasInativo = Math.ceil(milissegundosInativo / MILISSEGUNDOS_DIA);
    const semCompras = !ultimaAtividadePorCliente.has(cliente.id);
    return [{
      clienteId: cliente.id,
      nome: cliente.nome,
      diasInativo,
      mensagem: semCompras
        ? `Cliente ${cliente.nome} está sem compras registradas há ${diasInativo} dias desde o cadastro, considere contato.`
        : `Cliente ${cliente.nome} inativo há ${diasInativo} dias, considere contato.`,
    }];
  });

  const vendasPorEvento = eventos.length
    ? await prisma.vendaIngresso.groupBy({
      by: ['eventoId'],
      where: {
        estabelecimentoId,
        eventoId: { in: eventos.map((evento) => evento.id) },
        statusVenda: 'CONFIRMADA',
      },
      _count: { _all: true },
    })
    : [];
  const ingressosVendidosPorEvento = new Map(
    vendasPorEvento.map((venda) => [venda.eventoId, venda._count._all]),
  );
  const eventosPorGenero = new Map();

  for (const evento of eventos) {
    const chave = chaveGenero(evento.generoMusical);
    const edicoes = eventosPorGenero.get(chave) ?? [];
    if (edicoes.length < EDICOES_ANALISADAS) {
      edicoes.push(evento);
      eventosPorGenero.set(chave, edicoes);
    }
  }

  const tiposEventoBaixaAdesao = [...eventosPorGenero.values()]
    .filter((edicoes) => edicoes.length >= 2)
    .flatMap((edicoes) => {
      const ocupacaoMedia = edicoes.reduce((total, evento) => (
        total + ((ingressosVendidosPorEvento.get(evento.id) ?? 0) / evento.capacidade) * 100
      ), 0) / edicoes.length;
      if (ocupacaoMedia >= LIMITE_OCUPACAO_PERCENTUAL) return [];

      const generoMusical = edicoes[0].generoMusical.trim();
      const ocupacaoFormatada = percentualFormatado(ocupacaoMedia);
      return [{
        generoMusical,
        ocupacaoMediaPercentual: Math.round(ocupacaoMedia * 10) / 10,
        edicoesAnalisadas: edicoes.length,
        mensagem: `Tipo de evento ${generoMusical} com baixa adesão (${ocupacaoFormatada}% de ocupação), avalie o formato.`,
      }];
    });

  return { clientesInativos, tiposEventoBaixaAdesao };
}
