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
  clienteId?: number
  cpf?: string
  nomeCliente?: string
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

export type ApiKeyEstabelecimento = {
  apiKey: string
  apiKeyPrefixo: string
}
