import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Headphones, LoaderCircle, Minus, Plus, Ticket } from 'lucide-react'
import { criarCompraPublica, listarEventosPublicos, listarLotesPublicos, obterEstabelecimentoPublico } from '../servicos'
import type { EstabelecimentoPublico, EventoPublico, LoteIngressoPublico, RespostaCompraPublica } from '../tipos'

type PropriedadesPublico = {
  identificadorPublico: string
}

function decodificarIdentificador(identificadorPublico: string) {
  try {
    const identificador = decodeURIComponent(identificadorPublico)
    return /^[A-Za-z0-9_-]+$/.test(identificador) ? identificador : ''
  } catch {
    return ''
  }
}

function formatarData(dataHora: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(dataHora))
}

function formatarPreco(preco: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(preco))
}

function mascararCpf(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function cpfValido(valor: string) {
  const cpf = valor.replace(/\D/g, '')
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false
  let soma = 0
  for (let indice = 0; indice < 9; indice += 1) soma += Number(cpf[indice]) * (10 - indice)
  let digito = (soma * 10) % 11
  if (digito === 10) digito = 0
  if (digito !== Number(cpf[9])) return false
  soma = 0
  for (let indice = 0; indice < 10; indice += 1) soma += Number(cpf[indice]) * (11 - indice)
  digito = (soma * 10) % 11
  if (digito === 10) digito = 0
  return digito === Number(cpf[10])
}

function emailValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim())
}

function Publico({ identificadorPublico }: PropriedadesPublico) {
  const [estabelecimento, setEstabelecimento] = useState<EstabelecimentoPublico | null>(null)
  const [eventos, setEventos] = useState<EventoPublico[]>([])
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoPublico | null>(null)
  const [lotes, setLotes] = useState<LoteIngressoPublico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoLotes, setCarregandoLotes] = useState(false)
  const [erro, setErro] = useState('')
  const [erroLotes, setErroLotes] = useState('')
  const [loteSelecionado, setLoteSelecionado] = useState<LoteIngressoPublico | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [consentimentoMarketing, setConsentimentoMarketing] = useState(false)
  const [pagamentoSimulado, setPagamentoSimulado] = useState<'APROVADO' | 'RECUSADO'>('APROVADO')
  const [revisandoPedido, setRevisandoPedido] = useState(false)
  const [processandoPagamento, setProcessandoPagamento] = useState(false)
  const [respostaCompra, setRespostaCompra] = useState<RespostaCompraPublica | null>(null)
  const [chaveIdempotencia] = useState(() => crypto.randomUUID())
  const identificadorDecodificado = decodificarIdentificador(identificadorPublico)
  const identificadorInvalido = !identificadorDecodificado
  const mensagemErro = erro || (identificadorInvalido ? 'O identificador público informado é inválido.' : '')
  const carregandoAtual = !identificadorInvalido && carregando

  useEffect(() => {
    if (identificadorInvalido) return
    Promise.all([
      obterEstabelecimentoPublico(identificadorDecodificado),
      listarEventosPublicos(identificadorDecodificado),
    ])
      .then(([dadosEstabelecimento, dadosEventos]) => {
        setEstabelecimento(dadosEstabelecimento)
        setEventos(dadosEventos)
      })
      .catch((falha: Error) => setErro(falha.message))
      .finally(() => setCarregando(false))
  }, [identificadorDecodificado, identificadorInvalido])

  function selecionarEvento(evento: EventoPublico) {
    setEventoSelecionado(evento)
    setLotes([])
    setLoteSelecionado(null)
    setQuantidade(1)
    setRevisandoPedido(false)
    setRespostaCompra(null)
    setErroLotes('')
    setCarregandoLotes(true)
    listarLotesPublicos(identificadorDecodificado, evento.id)
      .then(setLotes)
      .catch((falha: Error) => setErroLotes(falha.message))
      .finally(() => setCarregandoLotes(false))
  }

  function selecionarLote(lote: LoteIngressoPublico) {
    setLoteSelecionado(lote)
    setQuantidade(1)
    setRevisandoPedido(false)
    setRespostaCompra(null)
    setErro('')
  }

  function ajustarQuantidade(valor: number) {
    if (!loteSelecionado) return
    setQuantidade(Math.max(1, Math.min(loteSelecionado.quantidadeDisponivel, valor || 1)))
    setRevisandoPedido(false)
  }

  function revisarPedido(eventoFormulario: FormEvent<HTMLFormElement>) {
    eventoFormulario.preventDefault()
    if (!eventoSelecionado || !loteSelecionado) return setErro('Selecione um lote disponível para continuar.')
    if (quantidade < 1 || quantidade > loteSelecionado.quantidadeDisponivel) {
      return setErro('Informe uma quantidade entre 1 e o estoque disponível.')
    }
    if (!nome.trim()) return setErro('Informe seu nome completo.')
    if (!cpfValido(cpf)) return setErro('Informe um CPF válido.')
    if (!emailValido(email)) return setErro('Informe um e-mail válido.')
    setErro('')
    setRevisandoPedido(true)
  }

  async function confirmarPagamento() {
    if (!eventoSelecionado || !loteSelecionado || processandoPagamento) return
    setErro('')
    setProcessandoPagamento(true)
    try {
      const resposta = await criarCompraPublica(identificadorDecodificado, {
        eventoId: eventoSelecionado.id,
        ingressoTipoId: loteSelecionado.id,
        quantidade,
        nome: nome.trim(),
        cpf,
        email: email.trim(),
        chaveIdempotencia,
        pagamentoSimulado,
        consentimentoMarketing,
      })
      setRespostaCompra(resposta)
    } catch (falha) {
      setErro((falha as Error).message)
    } finally {
      setProcessandoPagamento(false)
    }
  }

  const valorTotal = loteSelecionado ? Number(loteSelecionado.preco) * quantidade : 0

  return (
    <main className="publico-pagina">
      <div className="publico-cabecalho">
        <span className="marca-simbolo"><Headphones size={27} /></span>
        <span className="marca-texto"><strong>BACKSTAGE</strong><span>GESTÃO DE EVENTOS</span></span>
      </div>
      <section className="painel publico-painel">
        {carregandoAtual && <div className="publico-estado" role="status"><LoaderCircle className="girando" size={23} /><span>Carregando os dados do estabelecimento...</span></div>}
        {!carregandoAtual && mensagemErro && <p className="mensagem-erro" role="alert">{mensagemErro}</p>}
        {!carregandoAtual && !mensagemErro && estabelecimento && (
          <div className="publico-conteudo">
            <span className="sobretitulo">ESTABELECIMENTO</span>
            <h1>{estabelecimento.nomeFantasia}</h1>
            <section className="publico-secao" aria-labelledby="eventos-titulo">
              <div className="publico-secao-cabecalho">
                <span className="sobretitulo">PROGRAMAÇÃO</span>
                <h2 id="eventos-titulo">Escolha seu evento</h2>
              </div>
              {eventos.length === 0 && <p className="publico-vazio">Nenhum evento disponível no momento.</p>}
              <div className="publico-eventos">
                {eventos.map((evento) => (
                  <button
                    className={`publico-evento ${eventoSelecionado?.id === evento.id ? 'selecionado' : ''}`}
                    key={evento.id}
                    type="button"
                    onClick={() => selecionarEvento(evento)}
                  >
                    <span className="publico-evento-genero">{evento.generoMusical}</span>
                    <strong>{evento.nome}</strong>
                    <span className="publico-evento-detalhe"><CalendarDays size={14} />{formatarData(evento.dataHora)}</span>
                    <span className="publico-evento-detalhe"><Clock3 size={14} />{evento.duracaoHoras} horas de duração</span>
                    {evento.atracoes && <span className="publico-evento-atracoes">{evento.atracoes}</span>}
                  </button>
                ))}
              </div>
            </section>
            {eventoSelecionado && (
              <section className="publico-secao" aria-labelledby="lotes-titulo">
                <div className="publico-secao-cabecalho">
                  <span className="sobretitulo">INGRESSOS</span>
                  <h2 id="lotes-titulo">Lotes disponíveis</h2>
                </div>
                {carregandoLotes && <div className="publico-estado menor" role="status"><LoaderCircle className="girando" size={18} /><span>Carregando lotes...</span></div>}
                {!carregandoLotes && erroLotes && <p className="mensagem-erro" role="alert">{erroLotes}</p>}
                {!carregandoLotes && !erroLotes && lotes.length === 0 && <p className="publico-vazio">Nenhum lote disponível para este evento.</p>}
                {!carregandoLotes && !erroLotes && lotes.length > 0 && (
                  <div className="publico-lotes">
                    {lotes.map((lote) => (
                      <button
                        className={`publico-lote ${loteSelecionado?.id === lote.id ? 'selecionado' : ''}`}
                        key={lote.id}
                        type="button"
                        onClick={() => selecionarLote(lote)}
                      >
                        <span className="publico-lote-icone"><Ticket size={17} /></span>
                        <div>
                          <strong>{lote.nome}</strong>
                          <span>{lote.quantidadeDisponivel} disponíveis</span>
                        </div>
                        <b>{formatarPreco(lote.preco)}</b>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
            {respostaCompra && eventoSelecionado && loteSelecionado ? (
              <section className="publico-confirmacao" aria-live="polite">
                <CheckCircle2 size={34} />
                <span className="sobretitulo">COMPRA CONFIRMADA</span>
                <h2>Seu pedido foi aprovado</h2>
                <p className="publico-aviso-simulacao">Pagamento e envio de e-mail simulados para fins acadêmicos. Nenhuma mensagem foi enviada ao endereço informado.</p>
                <div className="publico-confirmacao-resumo">
                  <p><span>Evento</span><strong>{eventoSelecionado.nome}</strong></p>
                  <p><span>Lote</span><strong>{loteSelecionado.nome}</strong></p>
                  <p><span>Quantidade</span><strong>{respostaCompra.quantidade}</strong></p>
                  <p><span>Total</span><strong>{formatarPreco(respostaCompra.valorTotal)}</strong></p>
                  <p><span>Compra</span><strong>#{respostaCompra.compraId}</strong></p>
                  <p><span>Pagamento</span><strong>{respostaCompra.statusPagamento}</strong></p>
                </div>
                <div className="publico-codigos">
                  <span className="sobretitulo">CÓDIGOS DOS INGRESSOS</span>
                  {respostaCompra.vendas.map((venda) => <strong key={venda.id}>{venda.codigoIngresso}</strong>)}
                </div>
                <p className="publico-email-simulado">Envio transacional simulado: concluído.</p>
              </section>
            ) : loteSelecionado && eventoSelecionado && (
              <form className="publico-secao publico-formulario" onSubmit={revisarPedido}>
                <div className="publico-secao-cabecalho">
                  <span className="sobretitulo">IDENTIFICAÇÃO</span>
                  <h2>Dados do comprador</h2>
                </div>
                <div className="publico-campos">
                  <label className="campo-modal">
                    Nome completo
                    <input value={nome} onChange={(evento) => { setNome(evento.target.value); setRevisandoPedido(false) }} placeholder="Seu nome completo" required />
                  </label>
                  <label className="campo-modal">
                    CPF
                    <input value={cpf} onChange={(evento) => { setCpf(mascararCpf(evento.target.value)); setRevisandoPedido(false) }} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} required />
                  </label>
                  <label className="campo-modal">
                    E-mail
                    <input value={email} onChange={(evento) => { setEmail(evento.target.value); setRevisandoPedido(false) }} placeholder="voce@exemplo.com" type="email" required />
                  </label>
                  <label className="publico-consentimento">
                    <input type="checkbox" checked={consentimentoMarketing} onChange={(evento) => setConsentimentoMarketing(evento.target.checked)} />
                    <span>Quero receber novidades e ofertas deste estabelecimento.</span>
                  </label>
                </div>
                <div className="publico-resumo">
                  <div className="publico-resumo-cabecalho">
                    <span className="sobretitulo">RESUMO DO PEDIDO</span>
                    <strong>{loteSelecionado.nome}</strong>
                  </div>
                  <div className="publico-quantidade">
                    <span>Quantidade</span>
                    <div className="publico-controle-quantidade" aria-label="Quantidade de ingressos">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        onClick={() => ajustarQuantidade(quantidade - 1)}
                        disabled={quantidade <= 1}
                      >
                        <Minus size={16} strokeWidth={2.5} />
                      </button>
                      <span aria-live="polite">{quantidade}</span>
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        onClick={() => ajustarQuantidade(quantidade + 1)}
                        disabled={quantidade >= loteSelecionado.quantidadeDisponivel}
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                    <small>máx. {loteSelecionado.quantidadeDisponivel}</small>
                  </div>
                  <div className="publico-resumo-linha"><span>Preço unitário</span><strong>{formatarPreco(loteSelecionado.preco)}</strong></div>
                  <div className="publico-resumo-linha total"><span>Total</span><strong>{formatarPreco(String(valorTotal))}</strong></div>
                </div>
                {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
                <button className="botao-primario publico-continuar" type="submit">Continuar para revisão</button>
                {revisandoPedido && (
                  <div className="publico-revisao" role="status">
                    <span className="sobretitulo">PEDIDO PRONTO PARA A PRÓXIMA ETAPA</span>
                    <p><strong>{eventoSelecionado.nome}</strong> · {loteSelecionado.nome} · {quantidade} ingresso(s)</p>
                    <p>{nome.trim()} · {cpf} · {email.trim()}</p>
                    <strong>{formatarPreco(String(valorTotal))}</strong>
                    <p className="publico-aviso-simulacao">Esta é uma simulação acadêmica de pagamento.</p>
                    <label className="campo-modal">
                      Resultado da simulação
                      <select value={pagamentoSimulado} onChange={(evento) => setPagamentoSimulado(evento.target.value as 'APROVADO' | 'RECUSADO')}>
                        <option value="APROVADO">Aprovado</option>
                        <option value="RECUSADO">Recusado (teste de falha)</option>
                      </select>
                    </label>
                    <button className="botao-primario publico-continuar" type="button" onClick={confirmarPagamento} disabled={processandoPagamento}>
                      {processandoPagamento ? 'Processando simulação...' : 'Confirmar pagamento simulado'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

export default Publico
