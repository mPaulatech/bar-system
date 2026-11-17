export type StatusEvento = 'RASCUNHO' | 'ATIVO' | 'ENCERRADO'
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO'

export type Evento = {
  id: number
  estabelecimentoId?: number
  nome: string
  generoMusical: string
  atracoes: string | null
  dataHora: string
  duracaoHoras: number
  status: StatusEvento
  esgotado: boolean
}

export type RespostaEventos = {
  dados: Evento[]
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export type TipoIngresso = {
  id: number
  eventoId: number
  nome: string
  preco: string
  quantidadeDisponivel: number
  quantidadeRestante: number
  esgotado: boolean
}

export type DadosEvento = {
  nome: string
  generoMusical: string
  atracoes?: string | null
  dataHora: string
  duracaoHoras?: number
  status?: StatusEvento
}

export type DadosTipoIngresso = {
  nome: string
  preco: number
  quantidadeDisponivel: number
}

export type DadosVenda = {
  eventoId: number
  ingressoTipoId: number
  quantidade: number
  formaPagamento: FormaPagamento
  cpf: string
  nomeCliente: string
  emailCliente: string
}

export type ClienteParaVenda = {
  id: number
  nome: string
  cpf: string
  email: string
}

export type Venda = {
  id: number
  codigoIngresso: string
  valorPago: string
  eventoId: number
  ingressoTipoId: number
}

export type RespostaVenda = {
  vendas: Venda[]
  quantidade: number
  valorTotal: string
  formaPagamento: FormaPagamento
}

export type EstabelecimentoPublico = {
  identificadorPublico: string
  nomeFantasia: string
}

export type EventoPublico = {
  id: number
  nome: string
  generoMusical: string
  atracoes: string | null
  dataHora: string
  duracaoHoras: number
}

export type LoteIngressoPublico = {
  id: number
  nome: string
  preco: string
  quantidadeDisponivel: number
}

export type DadosCompraPublica = {
  eventoId: number
  ingressoTipoId: number
  quantidade: number
  nome: string
  cpf: string
  email: string
  chaveIdempotencia: string
  pagamentoSimulado: 'APROVADO' | 'RECUSADO'
  consentimentoMarketing: boolean
}

export type IngressoCompraPublica = {
  id: number
  valorPago: string
  formaPagamento: FormaPagamento | null
  codigoIngresso: string
  statusVenda: 'CONFIRMADA' | 'ESTORNADA'
  statusCheckin: 'PENDENTE' | 'UTILIZADO'
  criadoEm: string
  estornadaEm: string | null
  compra: {
    id: number
    origem: 'PUBLICA' | 'PDV'
    statusPagamento: 'PENDENTE' | 'APROVADO' | 'RECUSADO'
  }
  evento: {
    id: number
    nome: string
    dataHora: string
    status: StatusEvento
  }
  ingressoTipo: {
    id: number
    nome: string
    preco: string
  }
  cliente: {
    id: number
    nome: string
    cpf: string
    email: string
  }
  vendedor: {
    id: number
    nome: string
  } | null
}

export type RespostaCompraPublica = {
  compraId: number
  vendas: IngressoCompraPublica[]
  quantidade: number
  valorTotal: string
  statusPagamento: 'PENDENTE' | 'APROVADO' | 'RECUSADO'
  emailTransacionalSimulado: boolean
}

export type UsuarioAutenticado = {
  id: number
  nome: string
  perfil: 'GESTOR' | 'FUNCIONARIO'
}

export type Estabelecimento = {
  id: number
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  emailContato: string
  apiKeyPrefixo: string | null
  criadoEm: string
  atualizadoEm: string
}

export type DadosEstabelecimento = Pick<Estabelecimento, 'nomeFantasia' | 'razaoSocial'>

export type ResumoConsumoEvento = {
  evento: Pick<Evento, 'id' | 'nome' | 'dataHora'>
  faturamentoBar: string
  presentesCheckin: number
  ticketMedioGeral: string | null
}

export type ResultadoImportacaoConsumo = {
  total: number
  criadas: number
  repetidas: number
  resultados: {
    idTransacaoExterna: string
    situacao: 'IMPORTADA' | 'JA_EXISTIA'
    venda: {
      id: number
      idTransacaoExterna: string
      valorTotal: string
      dataHoraTransacao: string
      eventoId: number | null
      clienteId: number | null
      itens: unknown
      criadoEm: string
    }
  }[]
}

export type ResultadoCheckin = 'AUTORIZADO' | 'JA_UTILIZADO' | 'ESTORNADO' | 'EVENTO_INCORRETO' | 'EVENTO_INATIVO' | 'INGRESSO_INVALIDO'

export type ItemCheckin = {
  id: number
  codigoIngresso: string
  evento: { id: number; nome: string }
  ingressoTipo: { nome: string }
  clienteNome: string | null
  checkinEm: string | null
  checkinPorNome: string | null
}

export type RespostaListaCheckin = {
  dados: ItemCheckin[]
  pagina: number
  limite: number
  total: number
  totalPaginas: number
}

export type RespostaCheckin = {
  resultado: 'AUTORIZADO'
  mensagem: string
  ingresso: ItemCheckin
}
