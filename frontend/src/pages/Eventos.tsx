import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSelector } from 'react-redux'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Music2, Pencil, Plus, RefreshCw, Ticket, X } from 'lucide-react'
import { atualizarEvento, atualizarTipoIngresso, criarEvento, criarTipoIngresso, listarEventos, listarTiposIngresso, obterResumoConsumoEvento } from '../servicos/index'
import type { DadosEvento, Evento, ResumoConsumoEvento, TipoIngresso } from '../tipos'
import type { RootState } from '../store'

const formatarData = (valor: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor))
const formatarMoeda = (valor: string) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))

function Eventos() {
  const perfil = useSelector((estado: RootState) => estado.autenticacao.usuario?.perfil)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [tipos, setTipos] = useState<TipoIngresso[]>([])
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null)
  const [resultadoConsumo, setResultadoConsumo] = useState<
    { eventoId: number; resumo: ResumoConsumoEvento }
    | { eventoId: number; erro: string }
    | null
  >(null)
  const [atualizacaoConsumo, setAtualizacaoConsumo] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [generoMusical, setGeneroMusical] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const requisicaoAtual = useRef(0)
  const [modalEvento, setModalEvento] = useState(false)
  const [modalLote, setModalLote] = useState(false)
  const [eventoEmEdicao, setEventoEmEdicao] = useState<number | null>(null)
  const [loteEmEdicao, setLoteEmEdicao] = useState<number | null>(null)
  const [formulario, setFormulario] = useState<DadosEvento>({ nome: '', generoMusical: '', atracoes: '', dataHora: '', duracaoHoras: 12, status: 'RASCUNHO' })
  const [lote, setLote] = useState({ nome: '', preco: '', quantidadeDisponivel: '' })
  const carregar = () => {
    const numeroRequisicao = ++requisicaoAtual.current
    setCarregando(true)
    listarEventos({
      pagina,
      limite: 20,
      nome: busca.trim(),
      status: status ? status as Evento['status'] : undefined,
      generoMusical: generoMusical.trim(),
      dataInicio: dataInicio ? `${dataInicio}T00:00:00.000Z` : undefined,
      dataFim: dataFim ? `${dataFim}T23:59:59.999Z` : undefined,
    })
      .then((resposta) => {
        if (numeroRequisicao !== requisicaoAtual.current) return
        setEventos(resposta.dados)
        setTotal(resposta.total)
        setTotalPaginas(resposta.totalPaginas)
      }).catch((falha: Error) => {
        if (numeroRequisicao === requisicaoAtual.current) setErro(falha.message)
      }).finally(() => {
        if (numeroRequisicao === requisicaoAtual.current) setCarregando(false)
      })
  }
  useEffect(carregar, [pagina, status, busca, generoMusical, dataInicio, dataFim])
  useEffect(() => {
    if (eventoSelecionado) listarTiposIngresso(eventoSelecionado.id).then(setTipos).catch((falha: Error) => setErro(falha.message))
  }, [eventoSelecionado])
  useEffect(() => {
    if (!eventoSelecionado || perfil !== 'GESTOR') return undefined

    let ativo = true
    obterResumoConsumoEvento(eventoSelecionado.id)
      .then((resumo) => {
        if (ativo) setResultadoConsumo({ eventoId: eventoSelecionado.id, resumo })
      })
      .catch((falha: Error) => {
        if (ativo) setResultadoConsumo({ eventoId: eventoSelecionado.id, erro: falha.message })
      })
    return () => { ativo = false }
  }, [eventoSelecionado, perfil, atualizacaoConsumo])
  const salvarEvento = (evento: FormEvent) => {
    evento.preventDefault()
    if (formulario.nome.trim().length < 2 || formulario.generoMusical.trim().length < 2 || !formulario.dataHora) return setErro('Preencha nome, gênero e data do evento.')
    const dados = { ...formulario, dataHora: new Date(formulario.dataHora).toISOString() }
    const operacao = eventoEmEdicao ? atualizarEvento(eventoEmEdicao, dados) : criarEvento(dados)
    operacao.then((atualizado) => {
      if (eventoEmEdicao && eventoSelecionado?.id === atualizado.id) setEventoSelecionado({ ...eventoSelecionado, ...atualizado })
      setModalEvento(false)
      setEventoEmEdicao(null)
      carregar()
    }).catch((falha: Error) => setErro(falha.message))
  }
  const salvarLote = (evento: FormEvent) => {
    evento.preventDefault()
    if (!eventoSelecionado || !lote.nome || Number(lote.preco) < 0 || !Number.isInteger(Number(lote.quantidadeDisponivel)) || Number(lote.quantidadeDisponivel) < 0) return setErro('Preencha corretamente os dados do lote.')
    const dados = { nome: lote.nome, preco: Number(lote.preco), quantidadeDisponivel: Number(lote.quantidadeDisponivel) }
    const operacao = loteEmEdicao ? atualizarTipoIngresso(eventoSelecionado.id, loteEmEdicao, dados) : criarTipoIngresso(eventoSelecionado.id, dados)
    operacao.then(() => { setModalLote(false); setLoteEmEdicao(null); listarTiposIngresso(eventoSelecionado.id).then(setTipos) }).catch((falha: Error) => setErro(falha.message))
  }
  const abrirEdicaoEvento = () => {
    if (!eventoSelecionado) return
    setEventoEmEdicao(eventoSelecionado.id)
    setFormulario({ nome: eventoSelecionado.nome, generoMusical: eventoSelecionado.generoMusical, atracoes: eventoSelecionado.atracoes, dataHora: new Date(eventoSelecionado.dataHora).toISOString().slice(0, 16), duracaoHoras: eventoSelecionado.duracaoHoras, status: eventoSelecionado.status })
    setModalEvento(true)
  }
  const abrirEdicaoLote = (tipo: TipoIngresso) => {
    setLoteEmEdicao(tipo.id)
    setLote({ nome: tipo.nome, preco: tipo.preco, quantidadeDisponivel: String(tipo.quantidadeDisponivel) })
    setModalLote(true)
  }
  const resultadoConsumoAtual = resultadoConsumo?.eventoId === eventoSelecionado?.id
    ? resultadoConsumo
    : null
  const carregandoConsumo = Boolean(
    eventoSelecionado && perfil === 'GESTOR' && !resultadoConsumoAtual,
  )
  return <section>
    <div className="titulo-secao"><div><span className="sobretitulo"><span className="ponto-ao-vivo" /> AGENDA DE SHOWS</span><h1>Eventos</h1><p>Organize a programação e acompanhe as vendas de cada evento.</p></div><button className="botao-primario" onClick={() => { setEventoEmEdicao(null); setFormulario({ nome: '', generoMusical: '', atracoes: '', dataHora: '', duracaoHoras: 12, status: 'RASCUNHO' }); setModalEvento(true) }}><Plus size={20} /> Novo evento</button></div>
    {erro && <div className="mensagem-erro" role="alert">{erro}<button onClick={() => setErro('')}><X size={20} /></button></div>}
    <section className="painel painel-eventos">
      <div className="cabecalho-eventos"><div><span className="rotulo-painel">PROGRAMAÇÃO</span><h2>Eventos</h2></div><div className="ferramentas-tabela"><input className="campo-filtro" value={busca} onChange={(evento) => { setBusca(evento.target.value); setPagina(1) }} placeholder="Buscar por nome" aria-label="Buscar por nome" /><select className="campo-filtro" value={status} onChange={(evento) => { setStatus(evento.target.value); setPagina(1) }} aria-label="Filtrar por situação"><option value="">Todos os status</option><option value="RASCUNHO">Rascunho</option><option value="ATIVO">Ativo</option><option value="ENCERRADO">Encerrado</option></select><input className="campo-filtro campo-filtro-genero" value={generoMusical} onChange={(evento) => { setGeneroMusical(evento.target.value); setPagina(1) }} placeholder="Gênero musical" aria-label="Filtrar por gênero musical" /><input className="campo-filtro campo-filtro-data" type="date" value={dataInicio} onChange={(evento) => { setDataInicio(evento.target.value); setPagina(1) }} aria-label="Data inicial" /><input className="campo-filtro campo-filtro-data" type="date" value={dataFim} onChange={(evento) => { setDataFim(evento.target.value); setPagina(1) }} aria-label="Data final" /></div></div>
      <div className="eventos-lista">{carregando ? <p className="eventos-lista-vazia">Carregando eventos...</p> : eventos.length === 0 ? <p className="eventos-lista-vazia">Nenhum evento encontrado.</p> : eventos.map((evento) => <button className={`evento-lista-link ${eventoSelecionado?.id === evento.id ? 'selecionado' : ''}`} key={evento.id} onClick={() => setEventoSelecionado(evento)}><span className="evento-celula"><span className="evento-icone"><Music2 size={20} /></span><span><strong>{evento.nome}</strong><small>{evento.generoMusical} · {evento.atracoes || 'Sem atrações'}</small></span></span><span className="evento-data-celula"><CalendarDays size={20} /><strong>{formatarData(evento.dataHora)}</strong></span><span className={`etiqueta-status ${evento.esgotado ? 'esgotado' : evento.status.toLowerCase()}`}><i />{evento.esgotado ? 'Esgotado' : evento.status}</span></button>)}</div>
      <footer className="rodape-tabela"><span>Exibindo <strong>{eventos.length}</strong> de <strong>{total}</strong> eventos</span><div className="paginacao"><button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}><ChevronLeft size={20} /></button><span>{pagina} de {totalPaginas}</span><button disabled={pagina >= totalPaginas} onClick={() => setPagina(pagina + 1)}><ChevronRight size={20} /></button></div></footer>
    </section>
    {eventoSelecionado && <section className="painel painel-lotes-detalhe"><div className="cabecalho-eventos cabecalho-lotes"><div><span className="rotulo-painel">LOTES DE INGRESSO</span><h2>{eventoSelecionado.nome}</h2></div><div className="acoes-lotes"><button className="botao-secundario" onClick={abrirEdicaoEvento}><Pencil size={20} /> Editar evento</button><button className="botao-primario" onClick={() => { setLoteEmEdicao(null); setLote({ nome: '', preco: '', quantidadeDisponivel: '' }); setModalLote(true) }}><Plus size={20} /> Novo lote</button></div></div>{tipos.length === 0 ? <p className="eventos-lista-vazia">Nenhum lote cadastrado.</p> : <div className="lista-lotes">{tipos.map((tipo) => <div className="linha-lote" key={tipo.id}><span className="lote-identificacao"><span className="lote-icone"><Ticket size={22} /></span><strong>{tipo.nome}</strong></span><span className="lote-preco">{formatarMoeda(tipo.preco)}</span><span className="lote-quantidade">{tipo.quantidadeRestante} disponíveis</span>{tipo.esgotado && <span className="etiqueta-status esgotado"> <i />Esgotado</span>}<button className="botao-icone lote-editar" onClick={() => abrirEdicaoLote(tipo)} aria-label={`Editar ${tipo.nome}`}><Pencil size={20} /></button></div>)}</div>}</section>}
    {eventoSelecionado && perfil === 'GESTOR' && <section className="painel painel-consumo-evento" aria-label="Resumo de consumo do evento">
      <div className="cabecalho-eventos">
        <div><span className="rotulo-painel">INTELIGÊNCIA DO EVENTO</span><h2>Consumo do bar</h2></div>
        <button className="botao-secundario" type="button" disabled={carregandoConsumo} onClick={() => {
          setResultadoConsumo(null)
          setAtualizacaoConsumo((atual) => atual + 1)
        }}><RefreshCw size={18} /> Atualizar</button>
      </div>
      {carregandoConsumo && <p className="eventos-lista-vazia" role="status">Carregando dados de consumo...</p>}
      {resultadoConsumoAtual && 'erro' in resultadoConsumoAtual && <p className="mensagem-erro" role="alert">{resultadoConsumoAtual.erro}</p>}
      {resultadoConsumoAtual && 'resumo' in resultadoConsumoAtual && <div className="consumo-indicadores">
        <article><span>Faturamento do bar</span><strong>{formatarMoeda(resultadoConsumoAtual.resumo.faturamentoBar)}</strong></article>
        <article><span>Presentes no check-in</span><strong>{resultadoConsumoAtual.resumo.presentesCheckin}</strong></article>
        <article><span>Ticket médio geral</span><strong>{resultadoConsumoAtual.resumo.ticketMedioGeral === null ? 'Sem check-ins' : formatarMoeda(resultadoConsumoAtual.resumo.ticketMedioGeral)}</strong></article>
      </div>}
      <p className="consumo-ajuda">O ticket médio divide o faturamento do bar pelos ingressos confirmados com check-in realizado.</p>
    </section>}
    {modalEvento && <div className="fundo-modal"><form className="modal-lote" onSubmit={salvarEvento}><div className="cabecalho-modal"><h2>{eventoEmEdicao ? 'Editar evento' : 'Novo evento'}</h2><button type="button" className="botao-icone" onClick={() => setModalEvento(false)}><X size={23} /></button></div><label className="campo-modal">Nome<input value={formulario.nome} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} required /></label><label className="campo-modal">Gênero musical<input value={formulario.generoMusical} onChange={(e) => setFormulario({ ...formulario, generoMusical: e.target.value })} required /></label><label className="campo-modal">Atrações<input value={formulario.atracoes ?? ''} onChange={(e) => setFormulario({ ...formulario, atracoes: e.target.value })} /></label><label className="campo-modal">Data e hora<input type="datetime-local" value={formulario.dataHora} onChange={(e) => setFormulario({ ...formulario, dataHora: e.target.value })} required /></label><label className="campo-modal">Duração em horas<input type="number" min="1" max="72" value={formulario.duracaoHoras} onChange={(e) => setFormulario({ ...formulario, duracaoHoras: Number(e.target.value) })} /></label><label className="campo-modal">Status<select value={formulario.status} onChange={(e) => setFormulario({ ...formulario, status: e.target.value as Evento['status'] })}><option value="RASCUNHO">Rascunho</option><option value="ATIVO">Ativo</option><option value="ENCERRADO">Encerrado</option></select></label><div className="acoes-modal"><button type="button" className="botao-secundario" onClick={() => setModalEvento(false)}>Cancelar</button><button className="botao-primario"><Check size={20} /> Salvar</button></div></form></div>}
    {modalLote && eventoSelecionado && <div className="fundo-modal"><form className="modal-lote" onSubmit={salvarLote}><div className="cabecalho-modal"><h2>{loteEmEdicao ? 'Editar lote' : 'Novo lote'}</h2><button type="button" className="botao-icone" onClick={() => setModalLote(false)}><X size={23} /></button></div><p className="resumo-modal">Evento: {eventoSelecionado.nome}</p><label className="campo-modal">Nome do lote<input value={lote.nome} onChange={(e) => setLote({ ...lote, nome: e.target.value })} required /></label><label className="campo-modal">Preço (R$)<input inputMode="decimal" value={lote.preco} onChange={(e) => setLote({ ...lote, preco: e.target.value.replace(',', '.') })} required /></label><label className="campo-modal">Quantidade disponível<input type="number" min="0" value={lote.quantidadeDisponivel} onChange={(e) => setLote({ ...lote, quantidadeDisponivel: e.target.value })} required /></label><div className="acoes-modal"><button type="button" className="botao-secundario" onClick={() => setModalLote(false)}>Cancelar</button><button className="botao-primario"><Check size={20} /> {loteEmEdicao ? 'Salvar lote' : 'Criar lote'}</button></div></form></div>}
  </section>
}
export default Eventos
