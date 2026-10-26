import { useEffect, useState, type FormEvent } from 'react'
import { Banknote, Check, CreditCard, Ticket, Wallet, X } from 'lucide-react'
import { listarEventos, listarTiposIngresso, venderIngresso } from '../servicos/index'
import type { Evento, FormaPagamento, RespostaVenda, TipoIngresso } from '../tipos'

const pagamentos: { valor: FormaPagamento; nome: string; icone: typeof Wallet }[] = [
  { valor: 'PIX', nome: 'Pix', icone: Wallet },
  { valor: 'DINHEIRO', nome: 'Dinheiro', icone: Banknote },
  { valor: 'CARTAO_DEBITO', nome: 'Débito', icone: CreditCard },
  { valor: 'CARTAO_CREDITO', nome: 'Crédito', icone: CreditCard },
]
const formatarMoeda = (valor: string | number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
const mascararCpf = (valor: string) => valor.replace(/\D/g, '').slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2')
const cpfValido = (valor: string) => !valor || valor.replace(/\D/g, '').length === 11

function Pdv() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [tipos, setTipos] = useState<TipoIngresso[]>([])
  const [eventoId, setEventoId] = useState(0)
  const [tipoId, setTipoId] = useState(0)
  const [quantidade, setQuantidade] = useState(1)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX')
  const [cpf, setCpf] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [confirmacao, setConfirmacao] = useState<RespostaVenda | null>(null)
  const evento = eventos.find((item) => item.id === eventoId)
  const tipo = tipos.find((item) => item.id === tipoId)
  useEffect(() => { listarEventos().then((resposta) => { setEventos(resposta.dados); setEventoId(resposta.dados[0]?.id ?? 0) }).catch((falha: Error) => setErro(falha.message)).finally(() => setCarregando(false)) }, [])
  const carregarTipos = (idEvento: number, selecionarPrimeiro = true) => listarTiposIngresso(idEvento).then((dados) => {
    setTipos(dados)
    if (selecionarPrimeiro) setTipoId(dados.find((item) => !item.esgotado)?.id ?? 0)
  })
  useEffect(() => { if (eventoId) carregarTipos(eventoId).catch((falha: Error) => setErro(falha.message)) }, [eventoId])
  const finalizarVenda = async (eventoFormulario: FormEvent) => {
    eventoFormulario.preventDefault()
    if (!tipo || tipo.esgotado || quantidade < 1 || quantidade > 20 || quantidade > tipo.quantidadeRestante || !cpfValido(cpf)) return setErro('Confira o lote, a quantidade e o CPF informado.')
    setEnviando(true)
    setErro('')
    try {
      const resposta = await venderIngresso({ eventoId, ingressoTipoId: tipoId, quantidade, formaPagamento, ...(cpf ? { cpf: cpf.replace(/\D/g, ''), nomeCliente: nomeCliente.trim() } : {}) })
      setConfirmacao(resposta)
      setTipoId(0)
      setQuantidade(1)
      setCpf('')
      setNomeCliente('')
      await carregarTipos(eventoId, false)
    } catch (falha) {
      const erroVenda = falha as Error
      setErro(erroVenda.message)
    } finally {
      setEnviando(false)
    }
  }
  const copiar = (codigo: string) => navigator.clipboard.writeText(codigo)
  const copiarTodos = () => confirmacao && copiar(confirmacao.vendas.map((venda) => venda.codigoIngresso).join(', '))
  if (carregando) return <p className="eventos-lista-vazia">Carregando PDV...</p>
  return <section>
    <div className="titulo-secao"><div><span className="sobretitulo"><span className="ponto-ao-vivo" /> OPERAÇÃO DE VENDAS</span><h1>PDV</h1><p>Venda ingressos no balcão com rapidez e controle.</p></div></div>
    {erro && <div className="mensagem-erro" role="alert">{erro}<button onClick={() => setErro('')}><X size={14} /></button></div>}
    {confirmacao && <div className="pdv-confirmacao" role="status">
      <Check className="pdv-confirmacao-icone" size={18} aria-hidden="true" />
      <div className="pdv-confirmacao-conteudo">
        <div className="pdv-confirmacao-cabecalho">
          <strong>Venda confirmada</strong>
          <span className="pdv-confirmacao-valor">{formatarMoeda(confirmacao.valorTotal)}</span>
          <small>Pagamento: {pagamentos.find((item) => item.valor === confirmacao.formaPagamento)?.nome}</small>
        </div>
        <div className="pdv-confirmacao-codigos">
          <span className="pdv-confirmacao-rotulo">Código da venda</span>
          <div className="lista-codigos">
            {confirmacao.vendas.map((venda) => <div className="pdv-codigo-venda" key={venda.id}><code>{venda.codigoIngresso}</code><button type="button" onClick={() => copiar(venda.codigoIngresso)} aria-label={`Copiar código ${venda.codigoIngresso}`}>Copiar código</button></div>)}
          </div>
          {confirmacao.vendas.length > 1 && <button className="botao-secundario pdv-copiar-todos" type="button" onClick={copiarTodos}>Copiar todos</button>}
        </div>
      </div>
      <button className="pdv-confirmacao-fechar" type="button" onClick={() => setConfirmacao(null)} aria-label="Fechar confirmação"><X size={17} /></button>
    </div>}
    <div className="pdv-layout"><section className="painel pdv-catalogo"><div className="pdv-cabecalho-catalogo"><div><span className="rotulo-painel">CATÁLOGO</span><h2>Ingressos disponíveis</h2></div><select className="pdv-seletor-evento" value={eventoId} onChange={(e) => setEventoId(Number(e.target.value))}>{eventos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div><div className="pdv-grade-ingressos">{tipos.map((item) => <article className={`pdv-ingresso ${item.esgotado ? 'indisponivel' : ''}`} key={item.id}><span className="pdv-ingresso-icone coral"><Ticket size={18} /></span><div className="pdv-ingresso-detalhe"><span>{item.esgotado ? 'Esgotado' : `${item.quantidadeRestante} disponíveis`}</span><h3>{item.nome}</h3></div><strong className="pdv-ingresso-valor">{formatarMoeda(item.preco)}</strong><button className="botao-secundario" disabled={item.esgotado} onClick={() => setTipoId(item.id)}>{tipoId === item.id ? 'Selecionado' : 'Escolher'}</button></article>)}</div></section><form className="painel pdv-carrinho" onSubmit={finalizarVenda}><div className="pdv-cabecalho-carrinho"><div><span className="rotulo-painel">VENDA ATUAL</span><h2>{evento?.nome ?? 'Venda'}</h2></div></div>{tipo && <div className="pdv-itens-carrinho"><div className="pdv-item-carrinho"><span className="pdv-mini-icone coral"><Ticket size={14} /></span><span className="pdv-item-nome"><strong>{tipo.nome}</strong><small>{formatarMoeda(tipo.preco)} por ingresso</small></span><strong className="pdv-item-total">{formatarMoeda(Number(tipo.preco) * quantidade)}</strong></div></div>}<div className="pdv-dados-venda"><label className="pdv-campo">Quantidade<input type="number" min="1" max={Math.min(20, tipo?.quantidadeRestante ?? 20)} value={quantidade} onChange={(e) => setQuantidade(Math.min(20, Number(e.target.value)))} required /></label><label className="pdv-campo">CPF (opcional)<input value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} placeholder="000.000.000-00" /></label><label className="pdv-campo">Nome do cliente<input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome completo" /></label><fieldset className="pdv-pagamento"><legend>Forma de pagamento</legend><div>{pagamentos.map(({ valor, nome, icone: Icone }) => <button type="button" key={valor} className={formaPagamento === valor ? 'selecionado' : ''} onClick={() => setFormaPagamento(valor)}><Icone size={15} />{nome}</button>)}</div></fieldset></div><div className="pdv-totais"><span>Total <strong>{formatarMoeda(tipo ? Number(tipo.preco) * quantidade : 0)}</strong></span></div><button className="botao-primario pdv-finalizar" type="submit" disabled={enviando || !tipo || tipo.esgotado}>{enviando ? 'Finalizando...' : <><Check size={16} /> Finalizar venda</>}</button></form></div>
  </section>
}
export default Pdv
