import type { ClienteParaVenda, DadosCompraPublica, DadosEstabelecimento, DadosEvento, DadosTipoIngresso, DadosVenda, Estabelecimento, EstabelecimentoPublico, Evento, EventoPublico, LoteIngressoPublico, RespostaCheckin, RespostaCompraPublica, RespostaEventos, RespostaListaCheckin, RespostaVenda, ResultadoImportacaoConsumo, ResumoConsumoEvento, TipoIngresso, UsuarioAutenticado } from '../tipos'

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
    ;(erro as Error & { detalhes?: unknown }).detalhes = (corpo as { detalhes?: unknown }).detalhes
    throw erro
  }
  return corpo
}

async function requisicaoPublica<T>(rota: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response
  try {
    resposta = await fetch(`${enderecoApi}${rota}`, {
      ...opcoes,
      headers: {
        'Content-Type': 'application/json',
        ...opcoes.headers,
      },
    })
  } catch {
    throw new Error('Não foi possível conectar à API. Verifique se o backend está em execução.')
  }

  const tipoConteudo = resposta.headers.get('content-type') ?? ''
  if (!tipoConteudo.toLowerCase().includes('application/json')) {
    const erro = new Error(
      `A API retornou um formato inesperado (${tipoConteudo || 'sem Content-Type'}). Verifique se o backend está em execução.`,
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
    const erro = new Error(corpo.mensagem ?? 'Não foi possível concluir a operação.') as Error & { status?: number }
    erro.status = resposta.status
    throw erro
  }
  return corpo
}

export function obterEstabelecimentoPublico(identificadorPublico: string): Promise<EstabelecimentoPublico> {
  return requisicaoPublica<EstabelecimentoPublico>(`/publico/estabelecimentos/${encodeURIComponent(identificadorPublico)}`)
}

export function listarEventosPublicos(identificadorPublico: string): Promise<EventoPublico[]> {
  return requisicaoPublica<EventoPublico[]>(`/publico/estabelecimentos/${encodeURIComponent(identificadorPublico)}/eventos`)
}

export function listarLotesPublicos(identificadorPublico: string, eventoId: number): Promise<LoteIngressoPublico[]> {
  return requisicaoPublica<LoteIngressoPublico[]>(
    `/publico/estabelecimentos/${encodeURIComponent(identificadorPublico)}/eventos/${eventoId}/lotes`,
  )
}

export function criarCompraPublica(
  identificadorPublico: string,
  dados: DadosCompraPublica,
): Promise<RespostaCompraPublica> {
  return requisicaoPublica<RespostaCompraPublica>(
    `/publico/estabelecimentos/${encodeURIComponent(identificadorPublico)}/compras`,
    { method: 'POST', body: JSON.stringify(dados) },
  )
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

/**
 * Gera uma chave para autenticar o sistema de consumo externo.
 * @returns A chave completa e o prefixo para identificação.
 */
export function gerarApiKeyEstabelecimento(): Promise<{ apiKey: string; apiKeyPrefixo: string }> {
  return requisicaoApi('/estabelecimento/api-key', { method: 'POST' })
}

/**
 * Envia um arquivo de vendas do bar para importação pelo gestor.
 * @param arquivo Arquivo CSV ou JSON com até 1 MB.
 * @returns Resultado das vendas importadas ou já existentes.
 */
export async function importarVendasConsumo(arquivo: File): Promise<ResultadoImportacaoConsumo> {
  if (arquivo.size > 1024 * 1024) {
    throw new Error('O arquivo deve ter no máximo 1 MB.')
  }

  const nomeArquivo = arquivo.name.toLowerCase()
  const tipoConteudo = nomeArquivo.endsWith('.csv') || arquivo.type === 'text/csv'
    ? 'text/csv'
    : nomeArquivo.endsWith('.json') || arquivo.type === 'application/json'
      ? 'application/json'
      : null

  if (!tipoConteudo) {
    throw new Error('Selecione um arquivo CSV ou JSON.')
  }

  return requisicaoApi<ResultadoImportacaoConsumo>('/vendas-consumo/importacao', {
    method: 'POST',
    headers: { 'Content-Type': tipoConteudo },
    body: await arquivo.text(),
  })
}

/**
 * Consulta o resumo do consumo e dos check-ins de um evento.
 * @param eventoId Identificador do evento selecionado.
 * @returns Indicadores de faturamento do bar e ticket médio.
 */
export function obterResumoConsumoEvento(eventoId: number): Promise<ResumoConsumoEvento> {
  return requisicaoApi<ResumoConsumoEvento>(`/eventos/${eventoId}/consumo/resumo`)
}

export function realizarCheckin(eventoId: number, codigoIngresso: string): Promise<RespostaCheckin> {
  return requisicaoApi<RespostaCheckin>('/checkin', {
    method: 'POST',
    body: JSON.stringify({ eventoId, codigoIngresso }),
  })
}

export function listarPresentes(eventoId: number, pagina = 1, limite = 20): Promise<RespostaListaCheckin> {
  return requisicaoApi<RespostaListaCheckin>(`/checkin/presentes?eventoId=${eventoId}&pagina=${pagina}&limite=${limite}`)
}

export function listarAusentes(eventoId: number, pagina = 1, limite = 20): Promise<RespostaListaCheckin> {
  return requisicaoApi<RespostaListaCheckin>(`/checkin/ausentes?eventoId=${eventoId}&pagina=${pagina}&limite=${limite}`)
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
