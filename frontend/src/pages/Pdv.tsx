import { useEffect, useState, type FormEvent } from 'react'
import { Banknote, Check, CreditCard, Ticket, Wallet, X } from 'lucide-react'
import { listarEventos, listarTiposIngresso, obterClienteParaVenda, venderIngresso } from '../servicos/index'
import type { Evento, FormaPagamento, RespostaVenda, TipoIngresso } from '../tipos'

const pagamentos: { valor: FormaPagamento; nome: string; icone: typeof Wallet }[] = [
  { valor: 'PIX', nome: 'Pix', icone: Wallet },
  { valor: 'DINHEIRO', nome: 'Dinheiro', icone: Banknote },
  { valor: 'CARTAO_DEBITO', nome: 'Débito', icone: CreditCard },
  { valor: 'CARTAO_CREDITO', nome: 'Crédito', icone: CreditCard },
]
const formatarMoeda = (valor: string | number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
const mascararCpf = (valor: string) => valor.replace(/\D/g, '').slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2')
const cpfValido = (valor: string) => {
  const cpfNormalizado = valor.replace(/\D/g, '')
  if (!/^\d{11}$/.test(cpfNormalizado) || /^(\d)\1{10}$/.test(cpfNormalizado)) return false
  let soma = 0
  for (let indice = 0; indice < 9; indice += 1) soma += Number(cpfNormalizado[indice]) * (10 - indice)
  let digito = (soma * 10) % 11
  if (digito === 10) digito = 0
  if (digito !== Number(cpfNormalizado[9])) return false
  soma = 0
  for (let indice = 0; indice < 10; indice += 1) soma += Number(cpfNormalizado[indice]) * (11 - indice)
  digito = (soma * 10) % 11
  if (digito === 10) digito = 0
  return digito === Number(cpfNormalizado[10])
}
const emailValido = (valor: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())
const mensagemClienteNaoEncontrado = 'Cliente não encontrado. Informe nome e e-mail para cadastrá-lo nesta venda.'

function Pdv() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [tipos, setTipos] = useState<TipoIngresso[]>([])
  const [eventoId, setEventoId] = useState(0)
  const [tipoId, setTipoId] = useState(0)
  const [quantidade, setQuantidade] = useState(1)
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX')
  const [cpf, setCpf] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [consultandoCliente, setConsultandoCliente] = useState(false)
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
  const consultarCliente = async () => {
    const cpfNormalizado = cpf.replace(/\D/g, '')
    if (cpfNormalizado.length !== 11) return
    setConsultandoCliente(true)
    try {
      const cliente = await obterClienteParaVenda(cpfNormalizado)
      setNomeCliente(cliente.nome)
      setEmailCliente(cliente.email)
      setClienteEncontrado(true)
      setErro('')
    } catch (falha) {
      const erroConsulta = falha as Error & { status?: number }
      if (erroConsulta.status === 404) {
        setNomeCliente('')
        setEmailCliente('')
        setClienteEncontrado(false)
        setErro(mensagemClienteNaoEncontrado)
      } else {
        setErro(erroConsulta.message)
      }
    } finally {
      setConsultandoCliente(false)
    }
  }
  const finalizarVenda = async (eventoFormulario: FormEvent) => {
    eventoFormulario.preventDefault()
    if (!tipo || tipo.esgotado || quantidade < 1 || quantidade > 20 || quantidade > tipo.quantidadeRestante) return setErro('Confira o lote e a quantidade informada.')
    if (!cpfValido(cpf)) return setErro('Informe um CPF válido.')
    if (!nomeCliente.trim()) return setErro('Informe o nome completo do cliente.')
    if (!emailValido(emailCliente)) return setErro('Informe um e-mail válido.')
    setEnviando(true)
    setErro('')
    try {
      const resposta = await venderIngresso({ eventoId, ingressoTipoId: tipoId, quantidade, formaPagamento, cpf: cpf.replace(/\D/g, ''), nomeCliente: nomeCliente.trim(), emailCliente: emailCliente.trim().toLowerCase() })
      setConfirmacao(resposta)
      setTipoId(0)
      setQuantidade(1)
      setCpf('')
      setNomeCliente('')
      setEmailCliente('')
      setClienteEncontrado(false)
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
  const quantidadeMaxima = Math.min(20, tipo?.quantidadeRestante ?? 20)
  const ajustarQuantidade = (valor: number) => setQuantidade(Math.max(1, Math.min(quantidadeMaxima, valor)))
  if (carregando) return <p className="eventos-lista-vazia">Carregando venda de ingressos...</p>
  return <section className="pdv-pagina">
    {erro && erro !== mensagemClienteNaoEncontrado && <div className="mensagem-erro" role="alert">{erro}<button onClick={() => setErro('')}><X size={20} /></button></div>}
    {confirmacao && <div className="pdv-confirmacao" role="status">
      <Check className="pdv-confirmacao-icone" size={23} aria-hidden="true" />
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
      <button className="pdv-confirmacao-fechar" type="button" onClick={() => setConfirmacao(null)} aria-label="Fechar confirmação"><X size={22} /></button>
    </div>}
    <div className="pdv-layout"><section className="painel pdv-catalogo"><div className="pdv-cabecalho-catalogo"><div><span className="rotulo-painel">CATÁLOGO</span><h2>Ingressos disponíveis</h2></div><select className="pdv-seletor-evento" value={eventoId} onChange={(e) => setEventoId(Number(e.target.value))}>{eventos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div><div className="pdv-grade-ingressos">{tipos.map((item) => { const selecionado = tipoId === item.id; const selecionarLote = () => { if (!item.esgotado) setTipoId(item.id) }; return <article className={`pdv-ingresso ${item.esgotado ? 'indisponivel' : ''} ${selecionado ? 'selecionado' : ''}`} key={item.id} role="button" tabIndex={item.esgotado ? -1 : 0} aria-current={selecionado ? 'true' : undefined} aria-disabled={item.esgotado} aria-label={`${item.nome}, ${item.esgotado ? 'esgotado' : `${item.quantidadeRestante} disponíveis`}`} onClick={selecionarLote} onKeyDown={(eventoTeclado) => { if (eventoTeclado.key === 'Enter' || eventoTeclado.key === ' ') { eventoTeclado.preventDefault(); selecionarLote() } }}><span className="pdv-ingresso-icone coral"><Ticket size={23} /></span><div className="pdv-ingresso-detalhe"><span>{item.esgotado ? 'Esgotado' : selecionado ? 'Lote selecionado' : `${item.quantidadeRestante} disponíveis`}</span><h3>{item.nome}</h3></div><strong className="pdv-ingresso-valor">{formatarMoeda(item.preco)}</strong></article> })}</div></section><form className="painel pdv-carrinho" onSubmit={finalizarVenda}><div className="pdv-cabecalho-carrinho"><div><span className="rotulo-painel">VENDA ATUAL</span><h2>{evento?.nome ?? 'Venda'}</h2></div></div>{tipo && <div className="pdv-itens-carrinho"><div className="pdv-item-carrinho"><span className="pdv-mini-icone coral"><Ticket size={20} /></span><span className="pdv-item-nome"><strong>{tipo.nome}</strong><small>{formatarMoeda(tipo.preco)} por ingresso</small></span><strong className="pdv-item-total">{formatarMoeda(Number(tipo.preco) * quantidade)}</strong></div></div>}<div className="pdv-dados-venda"><label className="pdv-campo">Quantidade<div className="pdv-controle-quantidade"><button type="button" onClick={() => ajustarQuantidade(quantidade - 1)} disabled={quantidade <= 1} aria-label="Diminuir quantidade">−</button><input type="number" min="1" max={quantidadeMaxima} value={quantidade} onChange={(e) => ajustarQuantidade(Number(e.target.value))} required /><button type="button" onClick={() => ajustarQuantidade(quantidade + 1)} disabled={quantidade >= quantidadeMaxima} aria-label="Aumentar quantidade">+</button></div></label><label className="pdv-campo">CPF<input value={cpf} onChange={(e) => setCpf(mascararCpf(e.target.value))} onBlur={() => { if (cpfValido(cpf)) void consultarCliente() }} placeholder="000.000.000-00" required /></label><label className="pdv-campo">Nome do cliente<input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Nome completo" required /></label><label className="pdv-campo">E-mail do cliente<input type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} placeholder="cliente@exemplo.com" required /></label>{consultandoCliente && <small>Consultando cliente...</small>}{erro === mensagemClienteNaoEncontrado && <p className="pdv-mensagem-cliente pdv-mensagem-cliente-aviso" role="status">{mensagemClienteNaoEncontrado}</p>}{clienteEncontrado && <p className="pdv-mensagem-cliente pdv-mensagem-cliente-sucesso" role="status"><Check size={14} /> Cliente encontrado. Dados preenchidos automaticamente.</p>}<fieldset className="pdv-pagamento"><legend>Forma de pagamento</legend><div>{pagamentos.map(({ valor, nome, icone: Icone }) => <button type="button" key={valor} className={formaPagamento === valor ? 'selecionado' : ''} onClick={() => setFormaPagamento(valor)}><Icone size={20} />{nome}</button>)}</div></fieldset></div><div className="pdv-totais"><span>Total <strong>{formatarMoeda(tipo ? Number(tipo.preco) * quantidade : 0)}</strong></span></div><button className="botao-primario pdv-finalizar" type="submit" disabled={enviando || consultandoCliente || !tipo || tipo.esgotado}>{enviando ? 'Finalizando...' : <><Check size={20} /> Finalizar venda</>}</button></form></div>
  </section>
}
export default Pdv
