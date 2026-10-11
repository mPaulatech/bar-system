import { useEffect, useState } from 'react'
import {
  Banknote,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  Wallet,
} from 'lucide-react'
import { buscarIngressosDisponiveis } from '../mocks/ingressos.js'

type IngressoDisponivel = {
  id: string
  evento: string
  nome: string
  lote: string
  valor: number
  disponiveis: number
  cor: string
}

type ItemCarrinho = {
  ingresso: IngressoDisponivel
  quantidade: number
}

const formatarMoeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

function Pdv() {
  const [ingressos, setIngressos] = useState<IngressoDisponivel[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [eventoSelecionado, setEventoSelecionado] = useState('')
  const [busca, setBusca] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    let cancelado = false
    buscarIngressosDisponiveis().then((dados: IngressoDisponivel[]) => {
      if (cancelado) return
      setIngressos(dados)
      setEventoSelecionado(dados[0]?.evento ?? '')
    })
    return () => {
      cancelado = true
    }
  }, [])

  const eventos = [...new Set(ingressos.map((ingresso) => ingresso.evento))]
  const ingressosFiltrados = ingressos.filter((ingresso) => {
    const correspondeEvento = ingresso.evento === eventoSelecionado
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    const correspondeBusca = `${ingresso.nome} ${ingresso.lote}`
      .toLocaleLowerCase('pt-BR')
      .includes(termo)
    return correspondeEvento && correspondeBusca
  })
  const quantidadeTotal = carrinho.reduce((total, item) => total + item.quantidade, 0)
  const valorTotal = carrinho.reduce(
    (total, item) => total + item.ingresso.valor * item.quantidade,
    0,
  )

  const alterarQuantidade = (ingresso: IngressoDisponivel, variacao: number) => {
    setCarrinho((itensAtuais) => {
      const itemAtual = itensAtuais.find((item) => item.ingresso.id === ingresso.id)
      const quantidadeAtual = itemAtual?.quantidade ?? 0
      const novaQuantidade = Math.min(ingresso.disponiveis, quantidadeAtual + variacao)
      if (novaQuantidade <= 0) {
        return itensAtuais.filter((item) => item.ingresso.id !== ingresso.id)
      }
      if (itemAtual) {
        return itensAtuais.map((item) =>
          item.ingresso.id === ingresso.id ? { ...item, quantidade: novaQuantidade } : item,
        )
      }
      return [...itensAtuais, { ingresso, quantidade: novaQuantidade }]
    })
  }

  const finalizarVenda = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!carrinho.length || !nomeCliente.trim()) return
    setMensagem(`Venda simulada para ${nomeCliente.trim()} · ${formatarMoeda(valorTotal)} via ${formaPagamento}.`)
    setCarrinho([])
    setNomeCliente('')
  }

  return (
    <>
      <section className="titulo-secao">
        <div>
          <span className="sobretitulo"><span className="ponto-ao-vivo" /> OPERAÇÃO DE VENDAS</span>
          <h1>PDV</h1>
          <p>Venda ingressos no balcão com rapidez e controle de disponibilidade.</p>
        </div>
        <div className="pdv-status"><span className="pdv-status-ponto" /> Caixa aberto <span>·</span> Backstage Rock Bar</div>
      </section>

      {mensagem && <div className="pdv-confirmacao" role="status"><Check size={16} />{mensagem}<button onClick={() => setMensagem('')} aria-label="Fechar confirmação">×</button></div>}

      <section className="pdv-resumo" aria-label="Resumo do caixa">
        <div><span className="pdv-resumo-icone coral"><CircleDollarSign size={17} /></span><span><small>Vendas no caixa hoje</small><strong>R$ 2.840,00</strong></span></div>
        <div><span className="pdv-resumo-icone menta"><Ticket size={17} /></span><span><small>Ingressos vendidos</small><strong>36 unidades</strong></span></div>
        <div><span className="pdv-resumo-icone ouro"><Wallet size={17} /></span><span><small>Última venda</small><strong>há 4 minutos</strong></span></div>
      </section>

      <div className="pdv-layout">
        <section className="painel pdv-catalogo">
          <div className="pdv-cabecalho-catalogo">
            <div><span className="rotulo-painel">CATÁLOGO</span><h2>Ingressos disponíveis</h2></div>
            <label className="pdv-seletor-evento">Evento<select value={eventoSelecionado} onChange={(evento) => setEventoSelecionado(evento.target.value)} aria-label="Selecionar evento">{eventos.map((evento) => <option key={evento} value={evento}>{evento}</option>)}</select><ChevronDown size={14} /></label>
          </div>

          <label className="campo-busca pdv-busca"><Search size={15} /><input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar categoria ou lote" aria-label="Buscar categoria ou lote" /></label>

          <div className="pdv-grade-ingressos">
            {ingressosFiltrados.map((ingresso) => {
              const noCarrinho = carrinho.find((item) => item.ingresso.id === ingresso.id)?.quantidade ?? 0
              const esgotado = ingresso.disponiveis === 0
              return <article className={`pdv-ingresso ${esgotado ? 'indisponivel' : ''}`} key={ingresso.id}>
                <div className={`pdv-ingresso-icone ${ingresso.cor}`}><Ticket size={18} /></div>
                <div className="pdv-ingresso-detalhe"><span>{ingresso.lote}</span><h3>{ingresso.nome}</h3><small>{esgotado ? 'Esgotado' : `${ingresso.disponiveis} disponíveis`}</small></div>
                <strong className="pdv-ingresso-valor">{formatarMoeda(ingresso.valor)}</strong>
                <div className="pdv-controle-quantidade">
                  {noCarrinho > 0 && <button onClick={() => alterarQuantidade(ingresso, -1)} aria-label={`Remover uma unidade de ${ingresso.nome}`}><Minus size={14} /></button>}
                  {noCarrinho > 0 && <span>{noCarrinho}</span>}
                  <button disabled={esgotado || noCarrinho >= ingresso.disponiveis} onClick={() => alterarQuantidade(ingresso, 1)} aria-label={`Adicionar ${ingresso.nome}`}><Plus size={15} /></button>
                </div>
              </article>
            })}
            {ingressosFiltrados.length === 0 && <div className="pdv-vazio">Nenhum ingresso encontrado para este evento.</div>}
          </div>
          <p className="pdv-nota">Disponibilidade atualizada conforme as vendas do evento.</p>
        </section>

        <form className="painel pdv-carrinho" onSubmit={finalizarVenda}>
          <div className="pdv-cabecalho-carrinho"><div><span className="rotulo-painel">VENDA ATUAL</span><h2>Carrinho</h2></div><span className="pdv-contador-carrinho">{quantidadeTotal}</span></div>

          {carrinho.length ? <div className="pdv-itens-carrinho">{carrinho.map((item) => <div className="pdv-item-carrinho" key={item.ingresso.id}>
            <span className={`pdv-mini-icone ${item.ingresso.cor}`}><Ticket size={14} /></span>
            <span className="pdv-item-nome"><strong>{item.ingresso.nome}</strong><small>{item.quantidade} × {formatarMoeda(item.ingresso.valor)}</small></span>
            <strong className="pdv-item-total">{formatarMoeda(item.quantidade * item.ingresso.valor)}</strong>
            <button type="button" className="pdv-remover-item" onClick={() => alterarQuantidade(item.ingresso, -item.quantidade)} aria-label={`Remover ${item.ingresso.nome} do carrinho`}><Trash2 size={14} /></button>
          </div>)}</div> : <div className="pdv-carrinho-vazio"><span><ShoppingBag size={19} /></span><strong>Seu carrinho está vazio</strong><small>Adicione ingressos para iniciar a venda.</small></div>}

          <div className="pdv-dados-venda">
            <label className="pdv-campo">Nome do cliente<input value={nomeCliente} onChange={(evento) => setNomeCliente(evento.target.value)} placeholder="Nome completo" maxLength={80} required /></label>
            <fieldset className="pdv-pagamento"><legend>Forma de pagamento</legend><div>
              {[
                { nome: 'Pix', icone: Wallet },
                { nome: 'Dinheiro', icone: Banknote },
                { nome: 'Cartão', icone: CreditCard },
              ].map(({ nome, icone: Icone }) => <button type="button" key={nome} className={formaPagamento === nome ? 'selecionado' : ''} aria-pressed={formaPagamento === nome} onClick={() => setFormaPagamento(nome)}><Icone size={15} />{nome}</button>)}
            </div></fieldset>
          </div>

          <div className="pdv-totais"><span>Subtotal <strong>{quantidadeTotal} {quantidadeTotal === 1 ? 'ingresso' : 'ingressos'}</strong></span><span>Total <strong>{formatarMoeda(valorTotal)}</strong></span></div>
          <button className="botao-primario pdv-finalizar" type="submit" disabled={!carrinho.length || !nomeCliente.trim()}><Check size={16} /> Finalizar venda</button>
          <p className="pdv-simulacao">Modo de demonstração · a venda não será enviada à API.</p>
        </form>
      </div>
    </>
  )
}

export default Pdv