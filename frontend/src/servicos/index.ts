import type { ClienteParaVenda, DadosEstabelecimento, DadosEvento, DadosTipoIngresso, DadosVenda, Estabelecimento, Evento, RespostaEventos, RespostaVenda, TipoIngresso, UsuarioAutenticado } from '../tipos'

const enderecoApi = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1'

type EventoApi = Omit<Evento, 'esgotado'> & {
  esgotado?: boolean
  ingressosTipos?: { quantidadeDisponivel: number }[]
}

function normalizarEvento(evento: EventoApi): Evento {
  const lotes = evento.ingressosTipos ?? []
  return {
    ...evento,
    esgotado: evento.esgotado ?? (lotes.length > 0 && lotes.every((tipo) => tipo.quantidadeDisponivel === 0)),
  }
}

async function requisicaoApi<T>(rota: string, opcoes: RequestInit = {}): Promise<T> {
  const sessao = sessionStorage.getItem('sessao')
  const token = sessao ? (JSON.parse(sessao) as { token?: string }).token : undefined
  const resposta = await fetch(`${enderecoApi}${rota}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opcoes.headers,
    },
  })
  const tipoConteudo = resposta.headers.get('content-type') ?? ''
  if (!tipoConteudo.toLowerCase().includes('application/json')) {
    const erro = new Error(
      `A API retornou um formato inesperado (${tipoConteudo || 'sem Content-Type'}). Verifique se o backend está em execução e se a rota ${rota} está correta.`,
    ) as Error & { status?: number }
    erro.status = resposta.status
    throw erro
  }
  let corpo: T & { mensagem?: string }
  try {
    corpo = await resposta.json() as T & { mensagem?: string }
  } catch {
    const erro = new Error('A API informou conteúdo JSON inválido.') as Error & { status?: number }
    erro.status = resposta.status
    throw erro
  }
  if (!resposta.ok) {
    const erro = new Error(corpo.mensagem ?? 'NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.') as Error & { status?: number }
    erro.status = resposta.status
    throw erro
  }
  return corpo
}

export function listarEventos(filtros: { pagina?: number; limite?: number; nome?: string; status?: Evento['status']; generoMusical?: string; dataInicio?: string; dataFim?: string } = {}): Promise<RespostaEventos> {
  const parametros = new URLSearchParams()
  Object.entries(filtros).forEach(([chave, valor]) => { if (valor !== undefined && valor !== '') parametros.set(chave, String(valor)) })
  return requisicaoApi<RespostaEventos & { dados: EventoApi[] }>(`/eventos?${parametros.toString()}`).then((resposta) => ({ ...resposta, dados: resposta.dados.map(normalizarEvento) }))
}

export function criarEvento(dados: DadosEvento): Promise<Evento> {
  return requisicaoApi<EventoApi>('/eventos', { method: 'POST', body: JSON.stringify(dados) }).then(normalizarEvento)
}

export function atualizarEvento(id: number, dados: Partial<DadosEvento>): Promise<Evento> {
  return requisicaoApi<EventoApi>(`/eventos/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }).then(normalizarEvento)
}

export function listarTiposIngresso(eventoId: number): Promise<TipoIngresso[]> {
  return requisicaoApi<TipoIngresso[]>(`/eventos/${eventoId}/ingressos-tipos`)
}

export function criarTipoIngresso(eventoId: number, dados: DadosTipoIngresso): Promise<TipoIngresso> {
  return requisicaoApi<TipoIngresso>(`/eventos/${eventoId}/ingressos-tipos`, { method: 'POST', body: JSON.stringify(dados) })
}

export function atualizarTipoIngresso(eventoId: number, id: number, dados: Partial<DadosTipoIngresso>): Promise<TipoIngresso> {
  return requisicaoApi<TipoIngresso>(`/eventos/${eventoId}/ingressos-tipos/${id}`, { method: 'PATCH', body: JSON.stringify(dados) })
}

export function venderIngresso(dados: DadosVenda): Promise<RespostaVenda> {
  return requisicaoApi<RespostaVenda>('/vendas-ingressos', { method: 'POST', body: JSON.stringify(dados) })
}

export function obterClienteParaVenda(cpf: string): Promise<ClienteParaVenda> {
  return requisicaoApi<ClienteParaVenda>(`/clientes/cpf/${encodeURIComponent(cpf)}`)
}

export function obterEstabelecimento(): Promise<Estabelecimento> {
  return requisicaoApi<Estabelecimento>('/estabelecimento')
}

export function atualizarEstabelecimento(dados: DadosEstabelecimento): Promise<Estabelecimento> {
  return requisicaoApi<Estabelecimento>('/estabelecimento', {
    method: 'PATCH',
    body: JSON.stringify(dados),
  })
}

export function entrar(email: string, senha: string): Promise<{ token: string; usuario: UsuarioAutenticado }> {
  return requisicaoAutenticacao('/autenticacao/login', { email, senha })
}

export function cadastrarCasa(dados: Record<string, string>): Promise<{ estabelecimento: { id: number; nomeFantasia: string }; gestor: { id: number; email: string } }> {
  return requisicaoAutenticacao('/autenticacao/registro-estabelecimento', {
    nomeFantasia: dados.nomeFantasia,
    razaoSocial: dados.razaoSocial,
    cnpj: dados.cnpj,
    emailContato: dados.emailContato,
    nomeGestor: dados.nomeGestor,
    ...(dados.cpfGestor ? { cpfGestor: dados.cpfGestor } : {}),
    emailGestor: dados.emailGestor,
    senhaGestor: dados.senhaGestor,
  })
}

async function requisicaoAutenticacao<T>(rota: string, dados: Record<string, string>): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${enderecoApi}${rota}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    })
  } catch {
    throw new Error('NÃ£o foi possÃ­vel conectar Ã  API. Verifique se o backend estÃ¡ em execuÃ§Ã£o e se o frontend estÃ¡ em http://localhost:5563.')
  }

  const tipoConteudo = resposta.headers.get('content-type') ?? ''
  if (!tipoConteudo.toLowerCase().includes('application/json')) {
    throw new Error(
      `A API de autenticação retornou um formato inesperado (${tipoConteudo || 'sem Content-Type'}).`,
    )
  }
  let corpo: { mensagem?: string } & T
  try {
    corpo = await resposta.json()
  } catch {
    throw new Error('A API de autenticação informou conteúdo JSON inválido.')
  }
  if (!resposta.ok) throw new Error(corpo.mensagem ?? 'NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.')
  return corpo
}
