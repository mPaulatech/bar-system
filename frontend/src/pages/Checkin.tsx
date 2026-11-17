import { useEffect, useState, type FormEvent } from 'react'
import { CheckCircle2, CircleAlert, LogIn, Users, UserRoundX } from 'lucide-react'
import { listarAusentes, listarEventos, listarPresentes, realizarCheckin } from '../servicos/index'
import type { Evento, ItemCheckin, ResultadoCheckin } from '../tipos'

const mensagens: Record<Exclude<ResultadoCheckin, 'AUTORIZADO'>, string> = {
  JA_UTILIZADO: 'Este ingresso já foi utilizado.',
  ESTORNADO: 'Ingresso estornado não pode realizar check-in.',
  EVENTO_INCORRETO: 'O ingresso pertence a outro evento.',
  EVENTO_INATIVO: 'O evento selecionado não está ativo.',
  INGRESSO_INVALIDO: 'Ingresso inválido.',
}

function Checkin() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoId, setEventoId] = useState(0)
  const [codigo, setCodigo] = useState('')
  const [presentes, setPresentes] = useState<ItemCheckin[]>([])
  const [ausentes, setAusentes] = useState<ItemCheckin[]>([])
  const [resultado, setResultado] = useState<ItemCheckin | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [tipoResultado, setTipoResultado] = useState<ResultadoCheckin | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const carregarListas = (id: number) => {
    if (!id) return Promise.resolve()
    return Promise.all([listarPresentes(id), listarAusentes(id)])
      .then(([listaPresentes, listaAusentes]) => {
        setPresentes(listaPresentes.dados)
        setAusentes(listaAusentes.dados)
      })
  }

  useEffect(() => {
    listarEventos({ status: 'ATIVO', limite: 100 })
      .then((resposta) => {
        const primeiro = resposta.dados[0]?.id ?? 0
        setEventos(resposta.dados)
        setEventoId(primeiro)
        return carregarListas(primeiro)
      })
      .finally(() => setCarregando(false))
  }, [])

  const selecionarEvento = (id: number) => {
    setEventoId(id)
    setResultado(null)
    setMensagem('')
    carregarListas(id).catch((erro: Error) => setMensagem(erro.message))
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!eventoId || codigo.trim().length !== 8) {
      setTipoResultado('INGRESSO_INVALIDO')
      setMensagem(mensagens.INGRESSO_INVALIDO)
      return
    }
    setEnviando(true)
    setResultado(null)
    setMensagem('')
    try {
      const resposta = await realizarCheckin(eventoId, codigo)
      setTipoResultado(resposta.resultado)
      setMensagem(resposta.mensagem)
      setResultado(resposta.ingresso)
      setCodigo('')
      await carregarListas(eventoId)
    } catch (erro) {
      const falha = erro as Error & { detalhes?: { resultado?: ResultadoCheckin } }
      const resultadoFalha = falha.detalhes?.resultado ?? 'INGRESSO_INVALIDO'
      setTipoResultado(resultadoFalha)
      setMensagem(resultadoFalha === 'AUTORIZADO' ? 'Check-in autorizado.' : mensagens[resultadoFalha])
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <p className="eventos-lista-vazia">Carregando portaria...</p>
  return <section className="checkin-pagina">
    <div className="titulo-secao">
      <div><span className="sobretitulo"><span className="ponto-ao-vivo" /> PORTARIA</span><h1>Check-in</h1><p>Valide os ingressos e acompanhe a entrada do público.</p></div>
    </div>
    <section className="painel checkin-validacao">
      <div className="cabecalho-eventos"><div><span className="rotulo-painel">VALIDAÇÃO</span><h2>Autorizar entrada</h2></div><select className="pdv-seletor-evento" value={eventoId} onChange={(evento) => selecionarEvento(Number(evento.target.value))}><option value={0}>Selecione um evento</option>{eventos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
      <form className="checkin-formulario" onSubmit={enviar}>
        <label className="campo-modal">Código do ingresso<input autoFocus maxLength={8} value={codigo} onChange={(evento) => setCodigo(evento.target.value.toUpperCase())} placeholder="Ex.: X3QFHM87" /></label>
        <button className="botao-primario" type="submit" disabled={enviando || !eventoId}>{enviando ? 'Validando...' : 'Realizar check-in'}<LogIn size={17} /></button>
      </form>
      {mensagem && <div className={`checkin-resultado ${tipoResultado === 'AUTORIZADO' ? 'autorizado' : 'recusado'}`} role="status">{tipoResultado === 'AUTORIZADO' ? <CheckCircle2 size={22} /> : <CircleAlert size={22} />}<div><strong>{mensagem}</strong>{resultado && <small>{resultado.clienteNome || 'Ingresso válido'} · {resultado.ingressoTipo.nome}</small>}</div></div>}
    </section>
    <div className="checkin-listas">
      <section className="painel"><div className="cabecalho-eventos"><div><span className="rotulo-painel">ENTRADAS CONFIRMADAS</span><h2><Users size={18} /> Presentes ({presentes.length})</h2></div></div>{presentes.length === 0 ? <p className="eventos-lista-vazia">Nenhum ingresso utilizado.</p> : <div className="checkin-lista">{presentes.map((item) => <div className="checkin-linha" key={item.id}><CheckCircle2 size={17} /><div><strong>{item.clienteNome || 'Cliente não identificado'}</strong><small>{item.codigoIngresso} · {item.ingressoTipo.nome}</small></div><time>{item.checkinEm ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date(item.checkinEm)) : ''}</time></div>)}</div>}</section>
      <section className="painel"><div className="cabecalho-eventos"><div><span className="rotulo-painel">ENTRADAS PENDENTES</span><h2><UserRoundX size={18} /> Ausentes ({ausentes.length})</h2></div></div>{ausentes.length === 0 ? <p className="eventos-lista-vazia">Nenhum ingresso ausente.</p> : <div className="checkin-lista">{ausentes.map((item) => <div className="checkin-linha ausente" key={item.id}><UserRoundX size={17} /><div><strong>{item.clienteNome || 'Cliente não identificado'}</strong><small>{item.codigoIngresso} · {item.ingressoTipo.nome}</small></div></div>)}</div>}</section>
    </div>
  </section>
}

export default Checkin
