import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowDownToLine,
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clapperboard,
  Clock3,
  CreditCard,
  Ellipsis,
  Filter,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  Music2,
  Plus,
  Search,
  Settings2,
  Ticket,
  TicketCheck,
  UsersRound,
  X,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './store'
import {
  adicionarIngresso,
  finalizarCarregamento,
  setBusca,
  setFiltro,
  type FiltroIngresso,
  type Ingresso,
} from './store'
import './App.css'

const dadosDaSemana = [
  { dia: 'Seg', vendidos: 84, receita: 6720 },
  { dia: 'Ter', vendidos: 116, receita: 9280 },
  { dia: 'Qua', vendidos: 92, receita: 7360 },
  { dia: 'Qui', vendidos: 158, receita: 12640 },
  { dia: 'Sex', vendidos: 246, receita: 19680 },
  { dia: 'Sáb', vendidos: 318, receita: 25440 },
  { dia: 'Dom', vendidos: 184, receita: 14720 },
]

const dadosPorLote = [
  { nome: '1º lote', vendidos: 286 },
  { nome: '2º lote', vendidos: 214 },
  { nome: 'Porta', vendidos: 96 },
]

const distribuicao = [
  { nome: 'Pista', valor: 54, cor: '#f05a47' },
  { nome: 'Camarote', valor: 31, cor: '#e7b864' },
  { nome: 'Meia', valor: 15, cor: '#6ab7a5' },
]

const abas: { nome: string; valor: FiltroIngresso }[] = [
  { nome: 'Todos', valor: 'Todos' },
  { nome: 'Em venda', valor: 'Ativo' },
  { nome: 'Esgotados', valor: 'Esgotado' },
  { nome: 'Agendados', valor: 'Agendado' },
]

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor)

function ContadorAnimado({
  valor,
  formatar,
}: {
  valor: number
  formatar: (numero: number) => string
}) {
  const [numero, setNumero] = useState(0)

  useEffect(() => {
    let quadro = 0
    const inicio = performance.now()
    const duracao = 1050

    // requestAnimationFrame interpola o valor para o contador subir suavemente até a meta.
    const animar = (agora: number) => {
      const progresso = Math.min((agora - inicio) / duracao, 1)
      const curva = 1 - (1 - progresso) ** 4
      setNumero(Math.round(valor * curva))
      if (progresso < 1) quadro = requestAnimationFrame(animar)
    }

    quadro = requestAnimationFrame(animar)
    return () => cancelAnimationFrame(quadro)
  }, [valor])

  return <>{formatar(numero)}</>
}

function TooltipGrafico({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <motion.div
      className="grafico-tooltip"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      <span>{label}</span>
      {payload.map((item) => (
        <strong key={item.name} style={{ color: item.color }}>
          {item.name === 'receita' ? formatarMoeda(item.value) : `${item.value} ingressos`}
        </strong>
      ))}
    </motion.div>
  )
}

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const { ingressos, carregando, filtro, busca } = useSelector(
    (estado: RootState) => estado.ingressos,
  )
  const [menuRecolhido, setMenuRecolhido] = useState(false)
  const [abaGrafico, setAbaGrafico] = useState<'Vendas' | 'Receita'>('Vendas')
  const [modalAberto, setModalAberto] = useState(false)
  const [nomeEvento, setNomeEvento] = useState('')
  const [criandoLote, setCriandoLote] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [notificacao, setNotificacao] = useState('')
  const [pagina, setPagina] = useState(1)

  useEffect(() => {
    const temporizador = window.setTimeout(() => dispatch(finalizarCarregamento()), 1250)
    return () => window.clearTimeout(temporizador)
  }, [dispatch])

  useEffect(() => {
    if (!notificacao) return
    const temporizador = window.setTimeout(() => setNotificacao(''), 3600)
    return () => window.clearTimeout(temporizador)
  }, [notificacao])

  const ingressosFiltrados = ingressos.filter((ingresso) => {
    const combinaFiltro = filtro === 'Todos' || ingresso.status === filtro
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    const combinaBusca =
      !termo ||
      `${ingresso.evento} ${ingresso.lote} ${ingresso.local}`
        .toLocaleLowerCase('pt-BR')
        .includes(termo)
    return combinaFiltro && combinaBusca
  })

  const abrirNotificacao = (mensagem: string) => setNotificacao(mensagem)

  const exportarCsv = () => {
    setExportando(true)
    window.setTimeout(() => {
      const linhas = [
        ['Evento', 'Lote', 'Local', 'Vendidos', 'Capacidade', 'Valor', 'Status'],
        ...ingressosFiltrados.map((ingresso) => [
          ingresso.evento,
          ingresso.lote,
          ingresso.local,
          String(ingresso.vendidos),
          String(ingresso.capacidade),
          String(ingresso.valor),
          ingresso.status,
        ]),
      ]
      const csv = linhas.map((linha) => linha.map((campo) => `"${campo}"`).join(';')).join('\n')
      const arquivo = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = arquivo
      link.download = 'ingressos-backstage.csv'
      link.click()
      URL.revokeObjectURL(arquivo)
      setExportando(false)
      abrirNotificacao('Relatório exportado em CSV.')
    }, 650)
  }

  const criarLote = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!nomeEvento.trim()) return
    setCriandoLote(true)
    window.setTimeout(() => {
      const novoIngresso: Ingresso = {
        id: Date.now(),
        evento: nomeEvento.trim(),
        lote: 'Pré-venda',
        local: 'Backstage Rock Bar',
        vendidos: 0,
        capacidade: 250,
        valor: 45,
        status: 'Agendado',
        data: '17 out, 22h',
        novo: true,
      }
      dispatch(adicionarIngresso(novoIngresso))
      setNomeEvento('')
      setCriandoLote(false)
      setModalAberto(false)
      setPagina(1)
      abrirNotificacao('Novo lote adicionado à lista.')
    }, 720)
  }

  const navegarPara = (rotulo: string) => {
    if (rotulo !== 'Ingressos') abrirNotificacao(`${rotulo}: seção indisponível neste protótipo.`)
  }

  const estatisticas = [
    { rotulo: 'Receita bruta', valor: 42680, formato: formatarMoeda, icone: CircleDollarSign, variacao: '+18,6%', detalhe: 'vs. semana passada', cor: 'coral' },
    { rotulo: 'Ingressos vendidos', valor: 1284, formato: (numero: number) => numero.toLocaleString('pt-BR'), icone: TicketCheck, variacao: '+12,4%', detalhe: 'de 1.800 disponíveis', cor: 'menta' },
    { rotulo: 'Eventos ativos', valor: 6, formato: (numero: number) => String(numero).padStart(2, '0'), icone: Clapperboard, variacao: '2 nesta semana', detalhe: 'próximo: sexta, 22h', cor: 'ouro' },
    { rotulo: 'Check-ins hoje', valor: 342, formato: (numero: number) => numero.toLocaleString('pt-BR'), icone: UsersRound, variacao: '68% da capacidade', detalhe: 'BLACK SIGNAL · hoje', cor: 'azul' },
  ]

  const itensMenu = [
    { grupo: 'GERAL', itens: [{ nome: 'Visão geral', icone: LayoutDashboard }, { nome: 'Clientes', icone: UsersRound }] },
    { grupo: 'OPERAÇÃO', itens: [{ nome: 'Agenda de shows', icone: CalendarDays }, { nome: 'Bandas', icone: Music2 }, { nome: 'Ingressos', icone: Ticket }, { nome: 'Validação', icone: TicketCheck }, { nome: 'Promoções', icone: ArrowDownUp }] },
    { grupo: 'GESTÃO', itens: [{ nome: 'Financeiro', icone: CreditCard }, { nome: 'Relatórios', icone: Activity }, { nome: 'Configurações', icone: Settings2 }] },
  ]

  const mostrarEsqueleto = carregando

  return (
    <div className={`aplicativo ${menuRecolhido ? 'menu-recolhido' : ''}`}>
      <motion.aside className="barra-lateral" animate={{ width: menuRecolhido ? 78 : 248 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        <div className="marca">
          <div className="marca-simbolo"><Headphones size={21} strokeWidth={2.4} /></div>
          <AnimatePresence initial={false}>
            {!menuRecolhido && <motion.div className="marca-texto" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}><strong>BACKSTAGE</strong><span>ROCK BAR · GESTÃO</span></motion.div>}
          </AnimatePresence>
        </div>

        <button className="seletor-espaco" onClick={() => abrirNotificacao('Backstage Rock Bar selecionado.')}>
          <span className="avatar-bar">B</span>{!menuRecolhido && <><span>Backstage Rock Bar</span><ChevronDown size={14} /></>}
        </button>

        <nav className="navegacao" aria-label="Navegação principal">
          {itensMenu.map((grupo) => <div className="grupo-menu" key={grupo.grupo}>
            {!menuRecolhido && <span className="titulo-grupo">{grupo.grupo}</span>}
            {grupo.itens.map(({ nome, icone: Icone }) => <button className={`item-menu ${nome === 'Ingressos' ? 'ativo' : ''}`} key={nome} title={nome} aria-label={nome} aria-current={nome === 'Ingressos' ? 'page' : undefined} onClick={() => navegarPara(nome)}>
              <Icone size={18} strokeWidth={1.8} />{!menuRecolhido && <span>{nome}</span>}{!menuRecolhido && nome === 'Validação' && <span className="contador-menu">3</span>}
            </button>)}
          </div>)}
        </nav>

        <div className="rodape-menu">
          <button className="item-menu suporte" onClick={() => abrirNotificacao('Central de ajuda: suporte@backstage.bar')} title="Ajuda e suporte" aria-label="Ajuda e suporte"><LifeBuoy size={18} /><span>Ajuda e suporte</span></button>
          <div className="perfil-usuario"><div className="avatar-usuario">MP</div>{!menuRecolhido && <div className="perfil-detalhes"><strong>Maria Paula</strong><span>Administradora</span></div>}{!menuRecolhido && <Ellipsis size={18} className="perfil-opcoes" />}</div>
        </div>
      </motion.aside>

      <main className="conteudo-principal">
        <header className="cabecalho">
          <div className="caminho-pagina"><button className="botao-icone alternar-menu" aria-label={menuRecolhido ? 'Expandir menu' : 'Recolher menu'} onClick={() => setMenuRecolhido(!menuRecolhido)}>{menuRecolhido ? <Menu size={19} /> : <ChevronLeft size={19} />}</button><span>Operação</span><ChevronRight size={13} /><strong>Ingressos</strong></div>
          <div className="acoes-cabecalho"><span className="data-atual"><CalendarDays size={15} /> 10 out, 2026</span><button className="botao-icone notificacoes" aria-label="Notificações" onClick={() => abrirNotificacao('Você está em dia. Nenhuma notificação nova.')}><Bell size={18} /><i /></button><div className="avatar-usuario avatar-cabecalho">MP</div></div>
        </header>

        <div className="area-conteudo">
          <section className="titulo-secao">
            <div><span className="sobretitulo"><span className="ponto-ao-vivo" /> CENTRAL DE VENDAS</span><h1>Ingressos</h1><p>Acompanhe vendas, lotes e check-ins dos seus eventos.</p></div>
            <div className="acoes-titulo"><button className="botao-secundario" onClick={exportarCsv} disabled={exportando}>{exportando ? <span className="spinner" /> : <ArrowDownToLine size={16} />}Exportar</button><button className="botao-primario" onClick={() => setModalAberto(true)}><Plus size={17} /> Novo lote</button></div>
          </section>

          <motion.section className="grade-estatisticas" initial="oculto" animate="visivel" variants={{ visivel: { transition: { staggerChildren: 0.09 } } }}>
            {estatisticas.map(({ rotulo, valor, formato, icone: Icone, variacao, detalhe, cor }) => <motion.article className={`cartao-estatistica ${cor}`} key={rotulo} variants={{ oculto: { opacity: 0, y: 13 }, visivel: { opacity: 1, y: 0, transition: { duration: 0.4 } } }} whileHover={{ y: -3, transition: { duration: 0.18 } }}>
              <div className="estatistica-topo"><span>{rotulo}</span><span className="icone-estatistica"><Icone size={17} /></span></div>
              <strong className="valor-estatistica">{mostrarEsqueleto ? <span className="esqueleto numero-esqueleto" /> : <ContadorAnimado valor={valor} formatar={formato} />}</strong>
              <div className="estatistica-rodape"><span className="variacao"><ArrowUpRight size={13} /> {variacao}</span><span>{detalhe}</span></div>
            </motion.article>)}
          </motion.section>

          <section className="grade-graficos">
            <motion.article className="painel painel-vendas" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.45 }}>
              <div className="cabecalho-painel"><div><span className="rotulo-painel">DESEMPENHO</span><h2>Ritmo de vendas</h2><p>Movimento dos últimos 7 dias</p></div>
                <div className="seletor-abas" role="tablist" aria-label="Métrica do gráfico">{(['Vendas', 'Receita'] as const).map((aba) => <button key={aba} role="tab" aria-selected={abaGrafico === aba} className={abaGrafico === aba ? 'aba-selecionada' : ''} onClick={() => setAbaGrafico(aba)}>{aba}{abaGrafico === aba && <motion.span layoutId="aba-grafico-ativa" className="trilho-aba" />}</button>)}</div>
              </div>
              <div className="area-grafico-linha">{mostrarEsqueleto ? <div className="esqueleto esqueleto-grafico" /> : <ResponsiveContainer width="100%" height="100%"><LineChart data={dadosDaSemana} margin={{ top: 15, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#2b2d31" strokeDasharray="3 5" /><XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#85878d', fontSize: 11 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#777a81', fontSize: 10 }} tickFormatter={(valor: number) => abaGrafico === 'Receita' ? `${valor / 1000}k` : String(valor)} /><Tooltip content={<TooltipGrafico />} cursor={{ stroke: '#414248', strokeDasharray: '4 4' }} /><Line type="monotone" dataKey={abaGrafico === 'Vendas' ? 'vendidos' : 'receita'} name={abaGrafico === 'Vendas' ? 'ingressos' : 'receita'} stroke="#f05a47" strokeWidth={2.5} dot={{ r: 3, fill: '#f05a47', stroke: '#201f21', strokeWidth: 2 }} activeDot={{ r: 5, strokeWidth: 0 }} isAnimationActive animationDuration={950} />
              </LineChart></ResponsiveContainer>}</div>
              <div className="rodape-grafico"><span><i className="legenda-ponto coral" /> {abaGrafico === 'Vendas' ? 'Ingressos vendidos' : 'Receita bruta'}</span><span>Atualizado há 4 min</span></div>
            </motion.article>

            <motion.article className="painel painel-lotes" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.45 }}>
              <div className="cabecalho-painel"><div><span className="rotulo-painel">DISTRIBUIÇÃO</span><h2>Vendas por lote</h2><p>BLACK SIGNAL · 09 out</p></div><button className="botao-icone" aria-label="Mais opções" onClick={() => abrirNotificacao('Exibindo vendas por lote.')}><Ellipsis size={19} /></button></div>
              <div className="area-grafico-barras">{mostrarEsqueleto ? <div className="esqueleto esqueleto-grafico" /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={dadosPorLote} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#2b2d31" strokeDasharray="3 5" /><XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: '#85878d', fontSize: 10 }} dy={8} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#777a81', fontSize: 10 }} /><Tooltip content={<TooltipGrafico />} cursor={{ fill: '#ffffff08' }} /><Bar dataKey="vendidos" name="ingressos" radius={[4, 4, 0, 0]} maxBarSize={34} isAnimationActive animationDuration={1000}>{dadosPorLote.map((entrada, indice) => <Cell key={entrada.nome} fill={['#f05a47', '#e7b864', '#6ab7a5'][indice]} />)}</Bar>
              </BarChart></ResponsiveContainer>}</div>
              <div className="lotes-resumo"><span><i className="legenda-ponto coral" /> 1º lote <strong>286</strong></span><span><i className="legenda-ponto ouro" /> 2º lote <strong>214</strong></span><span><i className="legenda-ponto menta" /> Porta <strong>96</strong></span></div>
            </motion.article>

            <motion.article className="painel painel-categorias" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.45 }}>
              <div className="cabecalho-painel"><div><span className="rotulo-painel">PÚBLICO</span><h2>Perfil de compra</h2><p>Ingressos por categoria</p></div></div>
              <div className="categoria-conteudo"><div className="grafico-rosca">{mostrarEsqueleto ? <div className="esqueleto esqueleto-rosca" /> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribuicao} dataKey="valor" nameKey="nome" innerRadius="67%" outerRadius="91%" paddingAngle={4} stroke="none" isAnimationActive animationDuration={1050}>{distribuicao.map((categoria) => <Cell key={categoria.nome} fill={categoria.cor} />)}</Pie><Tooltip content={<TooltipGrafico />} /></PieChart></ResponsiveContainer>}<div className="rosca-centro"><strong>1.284</strong><span>ingressos</span></div></div>
                <div className="legenda-categorias">{distribuicao.map((categoria) => <div key={categoria.nome}><span><i className="legenda-ponto" style={{ background: categoria.cor }} />{categoria.nome}</span><strong>{categoria.valor}%</strong></div>)}</div>
              </div>
            </motion.article>
          </section>

          <section className="painel painel-eventos">
            <div className="cabecalho-eventos"><div><span className="rotulo-painel">ACOMPANHAMENTO</span><h2>Eventos e lotes</h2></div><div className="ferramentas-tabela"><label className="campo-busca"><Search size={15} /><input value={busca} onChange={(evento) => dispatch(setBusca(evento.target.value))} placeholder="Buscar evento ou lote" aria-label="Buscar evento ou lote" /></label><label className="botao-filtro"><Filter size={15} /><span>{filtro === 'Todos' ? 'Filtros' : filtro}</span><ChevronDown size={13} /><select value={filtro} aria-label="Filtrar por status" onChange={(evento) => { dispatch(setFiltro(evento.target.value as FiltroIngresso)); setPagina(1) }}><option value="Todos">Todos</option><option value="Ativo">Em venda</option><option value="Esgotado">Esgotados</option><option value="Agendado">Agendados</option></select></label></div></div>

            <div className="barra-abas-tabela" role="tablist" aria-label="Filtrar eventos por status">{abas.map((aba) => <button key={aba.valor} role="tab" aria-selected={filtro === aba.valor} className={filtro === aba.valor ? 'aba-tabela-ativa' : ''} onClick={() => { dispatch(setFiltro(aba.valor)); setPagina(1) }}>{aba.nome}<span>{ingressos.filter((ingresso) => aba.valor === 'Todos' || ingresso.status === aba.valor).length}</span>{filtro === aba.valor && <motion.i layoutId="aba-tabela-ativa" />}</button>)}<button className="ordenar-tabela" onClick={() => abrirNotificacao('Lista ordenada por data do evento.')}><ArrowDownUp size={14} /> Ordenar</button></div>

            <div className="envoltorio-tabela"><table><thead><tr><th>EVENTO / LOTE</th><th>DATA</th><th>VENDAS</th><th>VALOR</th><th>STATUS</th><th aria-label="Ações" /></tr></thead>
              {mostrarEsqueleto ? <tbody>{Array.from({ length: 5 }, (_, indice) => <tr className="linha-esqueleto" key={indice}><td><span className="esqueleto" /></td><td><span className="esqueleto" /></td><td><span className="esqueleto" /></td><td><span className="esqueleto" /></td><td><span className="esqueleto" /></td><td /></tr>)}</tbody> : <AnimatePresence mode="wait"><motion.tbody key={`${filtro}-${busca}-${pagina}`} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                {ingressosFiltrados.slice((pagina - 1) * 5, pagina * 5).map((ingresso) => <motion.tr key={ingresso.id} initial={ingresso.novo ? { backgroundColor: '#34443e' } : { opacity: 0, y: 6 }} animate={{ backgroundColor: '#1d1e21', opacity: 1, y: 0 }} transition={{ duration: ingresso.novo ? 1.6 : 0.25 }}>
                  <td><div className="evento-celula"><span className="evento-icone"><Music2 size={16} /></span><span><strong>{ingresso.evento}</strong><small>{ingresso.lote} · {ingresso.local}</small></span></div></td><td className="data-celula">{ingresso.data}</td><td><div className="vendas-celula"><div className="barra-progresso"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min((ingresso.vendidos / ingresso.capacidade) * 100, 100)}%` }} transition={{ duration: 1.1, delay: 0.2 }} /></div><span>{ingresso.vendidos}<small> / {ingresso.capacidade}</small></span></div></td><td className="valor-celula">{formatarMoeda(ingresso.valor)}</td><td><span className={`etiqueta-status ${ingresso.status.toLowerCase()}`}><i />{ingresso.status}</span></td><td><button className="botao-icone botao-linha" aria-label={`Mais opções para ${ingresso.evento}`} onClick={() => abrirNotificacao(`${ingresso.evento}: ${ingresso.vendidos} ingressos vendidos.`)}><Ellipsis size={18} /></button></td>
                </motion.tr>)}
                {ingressosFiltrados.length === 0 && <tr><td colSpan={6} className="estado-vazio">Nenhum evento encontrado para essa busca.</td></tr>}
              </motion.tbody></AnimatePresence>}
            </table></div>

            <footer className="rodape-tabela"><span>Mostrando <strong>{ingressosFiltrados.length ? (pagina - 1) * 5 + 1 : 0}–{Math.min(pagina * 5, ingressosFiltrados.length)}</strong> de <strong>{ingressosFiltrados.length}</strong> eventos</span><div className="paginacao"><button aria-label="Página anterior" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}><ChevronLeft size={16} /></button><span>{pagina}</span><button aria-label="Próxima página" disabled={pagina * 5 >= ingressosFiltrados.length} onClick={() => setPagina(pagina + 1)}><ChevronRight size={16} /></button></div></footer>
          </section>

          <footer className="rodape-pagina"><span>BACKSTAGE <i>·</i> CENTRAL DE OPERAÇÕES</span><span><Clock3 size={13} /> Sincronizado agora</span></footer>
        </div>
      </main>

      <AnimatePresence>{modalAberto && <motion.div className="fundo-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !criandoLote) setModalAberto(false) }}>
        <motion.form className="modal-lote" onSubmit={criarLote} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.2 }}>
          <div className="cabecalho-modal"><div><span className="rotulo-painel">NOVO CADASTRO</span><h2>Criar lote</h2></div><button type="button" className="botao-icone" aria-label="Fechar" onClick={() => setModalAberto(false)}><X size={19} /></button></div>
          <label className="campo-modal">Nome do evento<input autoFocus value={nomeEvento} onChange={(evento) => setNomeEvento(evento.target.value)} placeholder="Ex.: Noite de rock" required maxLength={60} /></label>
          <div className="resumo-modal"><Ticket size={17} /><span>Pré-venda · 250 ingressos · R$ 45,00</span></div>
          <div className="acoes-modal"><button type="button" className="botao-secundario" onClick={() => setModalAberto(false)} disabled={criandoLote}>Cancelar</button><button type="submit" className="botao-primario" disabled={criandoLote}>{criandoLote ? <><span className="spinner" /> Criando</> : <><Check size={16} /> Criar lote</>}</button></div>
        </motion.form>
      </motion.div>}</AnimatePresence>

      <AnimatePresence>{notificacao && <motion.div className="notificacao-toast" role="status" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.24 }}><span className="toast-icone"><Check size={15} /></span><span>{notificacao}</span><button aria-label="Fechar notificação" onClick={() => setNotificacao('')}><X size={15} /></button></motion.div>}</AnimatePresence>
    </div>
  )
}

export default App
