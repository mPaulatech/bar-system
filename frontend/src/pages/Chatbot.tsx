import { useState, type FormEvent } from 'react'
import { LoaderCircle, MessageCircle, Send } from 'lucide-react'
import { enviarMensagemChatbot } from '../servicos'

type Mensagem = { autor: 'Você' | 'Dona Bier'; texto: string }

export default function Chatbot() {
  const [mensagem, setMensagem] = useState('')
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const texto = mensagem.trim()
    if (!texto || carregando) return
    setMensagem('')
    setErro('')
    setMensagens((atuais) => [...atuais, { autor: 'Você', texto }])
    setCarregando(true)
    try {
      const resposta = await enviarMensagemChatbot(texto)
      setMensagens((atuais) => [...atuais, { autor: 'Dona Bier', texto: resposta.resposta }])
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível obter uma sugestão.')
    } finally {
      setCarregando(false)
    }
  }

  return <section className="chatbot-pagina">
    <div className="titulo-secao">
      <div><div className="sobretitulo"><MessageCircle size={13} /> SUGESTÕES DO CARDÁPIO</div><h1>Assistente Dona Bier</h1><p>Peça uma sugestão usando os itens disponíveis no cardápio.</p></div>
    </div>
    <div className="painel chatbot-painel">
      <div className="chatbot-mensagens" aria-live="polite">
        {mensagens.length === 0 && <div className="chatbot-vazio"><MessageCircle size={24} /><span>Como posso ajudar a escolher?</span><small>Experimente: “Quero algo leve para acompanhar uma cerveja”.</small></div>}
        {mensagens.map((item, indice) => <div className={`chatbot-mensagem chatbot-mensagem-${item.autor === 'Você' ? 'usuario' : 'assistente'}`} key={`${item.autor}-${indice}`}><small>{item.autor}</small><p>{item.texto}</p></div>)}
        {carregando && <div className="chatbot-carregando"><LoaderCircle size={14} /> Consultando o cardápio...</div>}
      </div>
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      <form className="chatbot-formulario" onSubmit={enviar}><input aria-label="Mensagem para o chatbot" value={mensagem} onChange={(evento) => setMensagem(evento.target.value)} placeholder="Digite sua preferência..." maxLength={2000} /><button className="botao-primario" type="submit" disabled={carregando || !mensagem.trim()}><Send size={14} /> Enviar</button></form>
    </div>
  </section>
}
