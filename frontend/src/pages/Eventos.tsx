import { useEffect, useState } from 'react'
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Music2,
  Search,
  TicketCheck,
} from 'lucide-react'
import { buscarEventos } from '../mocks/eventos.js'
import type { EventoMock, StatusEvento } from '../mocks/eventos.js'

type FiltroEvento = 'Todos' | StatusEvento

const filtros: { nome: string; valor: FiltroEvento }[] = [
  { nome: 'Todos', valor: 'Todos' },
  { nome: 'Em venda', valor: 'Ativo' },
  { nome: 'Esgotados', valor: 'Esgotado' },
  { nome: 'Agendados', valor: 'Agendado' },
]

function Eventos() {
  const [eventos, setEventos] = useState<EventoMock[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<FiltroEvento>('Todos')

  useEffect(() => {
    let cancelado = false
    buscarEventos()
      .then((dados) => {
        if (!cancelado) setEventos(dados)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const eventosFiltrados = eventos.filter((evento) => {
    const correspondeFiltro = filtro === 'Todos' || evento.status === filtro
    const correspondeBusca = `${evento.nome} ${evento.descricao} ${evento.local}`
      .toLocaleLowerCase('pt-BR')
      .includes(termo)
    return correspondeFiltro && correspondeBusca
  })
  const totalVendidos = eventos.reduce((total, evento) => total + evento.vendidos, 0)
  const eventosAtivos = eventos.filter((evento) => evento.status === 'Ativo').length

  const estatisticas = [
    { rotulo: 'Eventos cadastrados', valor: String(eventos.length).padStart(2, '0'), icone: CalendarDays, cor: 'coral', detalhe: 'no calendário' },
    { rotulo: 'Ingressos vendidos', valor: totalVendidos.toLocaleString('pt-BR'), icone: TicketCheck, cor: 'menta', detalhe: 'em todos os eventos' },
    { rotulo: 'Eventos em venda', valor: String(eventosAtivos).padStart(2, '0'), icone: Activity, cor: 'ouro', detalhe: 'com lotes ativos' },
  ]

  return (
    <>
      <section className="titulo-secao">
        <div>
          <span className="sobretitulo"><span className="ponto-ao-vivo" /> AGENDA DE SHOWS</span>
          <h1>Eventos</h1>
          <p>Organize a programação e acompanhe as vendas de cada evento.</p>
        </div>
      </section>

      <section className="grade-estatisticas eventos-estatisticas" aria-label="Resumo dos eventos">
        {estatisticas.map(({ rotulo, valor, icone: Icone, cor, detalhe }) => <article className={`cartao-estatistica ${cor}`} key={rotulo}>
          <div className="estatistica-topo"><span>{rotulo}</span><span className="icone-estatistica"><Icone size={17} /></span></div>
          <strong className="valor-estatistica">{carregando ? <span className="esqueleto numero-esqueleto" /> : valor}</strong>
          <div className="estatistica-rodape"><span>{detalhe}</span></div>
        </article>)}
      </section>

      <section className="painel painel-eventos">
        <div className="cabecalho-eventos">
          <div><span className="rotulo-painel">PROGRAMAÇÃO</span><h2>Eventos</h2></div>
          <label className="campo-busca eventos-busca"><Search size={15} /><input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar evento ou local" aria-label="Buscar evento ou local" /></label>
        </div>

        <div className="barra-abas-tabela" role="tablist" aria-label="Filtrar eventos por status">
          {filtros.map((aba) => <button key={aba.valor} role="tab" aria-selected={filtro === aba.valor} className={filtro === aba.valor ? 'aba-tabela-ativa' : ''} onClick={() => setFiltro(aba.valor)}>
            {aba.nome}<span>{eventos.filter((evento) => aba.valor === 'Todos' || evento.status === aba.valor).length}</span>{filtro === aba.valor && <i />}
          </button>)}
        </div>

        <div className="eventos-lista" role="list">
          {carregando ? <p className="eventos-lista-vazia">Carregando eventos...</p> : eventosFiltrados.map((evento) => {
            const percentualVendido = Math.min((evento.vendidos / evento.capacidade) * 100, 100)
            const nomeStatus = evento.status === 'Ativo' ? 'Em venda' : evento.status
            return <a className="evento-lista-link" href={`/eventos/${evento.id}/ingressos`} key={evento.id} aria-label={`Ver ingressos de ${evento.nome}`}>
              <span className="evento-celula"><span className="evento-icone"><Music2 size={16} /></span><span><strong>{evento.nome}</strong><small>{evento.descricao} · {evento.local}</small></span></span>
              <span className="evento-data-celula"><CalendarDays size={15} /><span><small>DATA</small><strong>{evento.data}</strong></span></span>
              <span className="evento-vendas-celula"><span className="evento-rotulo-vendas">INGRESSOS</span><span className="vendas-celula"><span className="barra-progresso"><i style={{ width: `${percentualVendido}%` }} /></span><span>{evento.vendidos}<small> / {evento.capacidade}</small></span></span></span>
              <span className="evento-estado-link"><span className={`etiqueta-status ${evento.status.toLowerCase()}`}><i />{nomeStatus}</span><ChevronRight size={17} /></span>
            </a>
          })}
          {!carregando && eventosFiltrados.length === 0 && <p className="eventos-lista-vazia">Nenhum evento encontrado para esse filtro.</p>}
        </div>

        <footer className="rodape-tabela"><span>Exibindo <strong>{eventosFiltrados.length}</strong> de <strong>{eventos.length}</strong> eventos</span><span className="eventos-rodape-ajuda">Selecione um evento para ver seus ingressos</span></footer>
      </section>

      <footer className="rodape-pagina"><span>BACKSTAGE <i>·</i> CENTRAL DE OPERAÇÕES</span><span>Agenda de eventos</span></footer>
    </>
  )
}

export default Eventos