import { useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Building2, CalendarDays, Headphones, LogIn, LogOut, ShoppingCart } from 'lucide-react'
import Checkin from './pages/Checkin'
import PaginaEstabelecimento from './pages/Estabelecimento'
import Eventos from './pages/Eventos'
import Pdv from './pages/Pdv'
import Publico from './pages/Publico'
import { cadastrarCasa, entrar } from './servicos/index'
import { entrar as entrarSessao, sair, type AppDispatch, type RootState } from './store'
import './App.css'

type PropriedadesAcesso = {
  cadastro?: boolean
  mensagemSucesso?: string
  aoCadastrar?: () => void
  aoIniciarEnvio?: () => void
}

function Acesso({ cadastro = false, mensagemSucesso = '', aoCadastrar, aoIniciarEnvio }: PropriedadesAcesso) {
  const dispatch = useDispatch<AppDispatch>()
  const [dados, setDados] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const alterar = (campo: string, valor: string) => setDados({ ...dados, [campo]: valor })
  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    setErro('')
    aoIniciarEnvio?.()
    if (cadastro && dados.senhaGestor !== dados.confirmarSenha) return setErro('As senhas não conferem.')
    const camposObrigatorios = cadastro ? ['nomeFantasia', 'razaoSocial', 'cnpj', 'emailContato', 'nomeGestor', 'emailGestor', 'senhaGestor'] : ['email', 'senha']
    if (camposObrigatorios.some((campo) => !dados[campo]?.trim())) return setErro('Preencha todos os campos obrigatórios.')
    const acao = cadastro ? cadastrarCasa(dados).then(() => { aoCadastrar?.() }) : entrar(dados.email, dados.senha).then((resposta) => { dispatch(entrarSessao(resposta)); window.history.pushState({}, '', '/eventos'); window.dispatchEvent(new PopStateEvent('popstate')) })
    acao.catch((falha: Error) => setErro(falha.message))
  }
  const campo = (nome: string, rotulo: string, tipo = 'text', opcional = false) => <label className="campo-modal">{rotulo}{opcional && ' (opcional)'}<input type={tipo} value={dados[nome] ?? ''} onChange={(e) => alterar(nome, e.target.value)} /></label>
  return <main className={`acesso${cadastro ? ' acesso-cadastro' : ''}`}>
    {!cadastro && <aside className="acesso-apresentacao">
      <div className="marca"><span className="marca-simbolo"><Headphones size={27} /></span><span className="marca-texto"><strong>BACKSTAGE</strong><span>GESTÃO DE EVENTOS</span></span></div>
    </aside>}
    <div className="painel acesso-painel">
      {cadastro && <div className="marca"><span className="marca-simbolo"><Headphones size={27} /></span><span className="marca-texto"><strong>BACKSTAGE</strong><span>GESTÃO DE EVENTOS</span></span></div>}
      <div className="acesso-cabecalho"><h1>{cadastro ? 'Cadastre sua casa' : 'Entrar'}</h1><p>{cadastro ? 'Crie o acesso da sua casa de shows.' : 'Acesse o painel de gestão da sua casa.'}</p></div>
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}{mensagemSucesso && <p className="mensagem-sucesso" role="status">{mensagemSucesso}</p>}
      <form className="acesso-formulario" onSubmit={enviar}>{cadastro ? <>{campo('nomeFantasia', 'Nome fantasia *')}{campo('razaoSocial', 'Razão social *')}{campo('cnpj', 'CNPJ *')}{campo('emailContato', 'E-mail de contato *', 'email')}{campo('nomeGestor', 'Nome do gestor *')}{campo('cpfGestor', 'CPF do gestor', 'text', true)}{campo('emailGestor', 'E-mail do gestor *', 'email')}{campo('senhaGestor', 'Senha *', 'password')}{campo('confirmarSenha', 'Confirmar senha *', 'password')}</> : <>{campo('email', 'E-mail', 'email')}{campo('senha', 'Senha', 'password')}</>}<button className="botao-primario acesso-submit" type="submit">{cadastro ? 'Cadastrar casa' : 'Entrar'}</button></form>
      <button className="botao-secundario acesso-link" type="button" onClick={() => { aoIniciarEnvio?.(); window.history.pushState({}, '', cadastro ? '/login' : '/cadastro'); window.dispatchEvent(new PopStateEvent('popstate')) }}>{cadastro ? 'Já tenho uma conta' : 'Cadastrar uma casa'}</button>
    </div>
  </main>
}

function App() {
  const caminho = window.location.pathname
  const [rota, setRota] = useState(caminho)
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const sessao = useSelector((estado: RootState) => estado.autenticacao)
  const dispatch = useDispatch<AppDispatch>()
  window.onpopstate = () => setRota(window.location.pathname)
  if (rota === '/login') return <Acesso mensagemSucesso={mensagemSucesso} aoIniciarEnvio={() => setMensagemSucesso('')} />
  if (rota === '/cadastro') return <Acesso cadastro aoIniciarEnvio={() => setMensagemSucesso('')} aoCadastrar={() => { setMensagemSucesso('Cadastro realizado com sucesso. Você já pode entrar com o e-mail do gestor.'); window.history.pushState({}, '', '/login'); setRota('/login') }} />
  const partesRotaPublica = rota.split('/')
  if (partesRotaPublica[1] === 'publico') return <Publico identificadorPublico={partesRotaPublica.length === 3 ? partesRotaPublica[2] : ''} />
  if (!sessao.token) { window.history.replaceState({}, '', '/login'); return <Acesso aoIniciarEnvio={() => setMensagemSucesso('')} /> }
  const pdv = rota === '/pdv'
  const checkin = rota === '/checkin'
  const estabelecimento = rota === '/estabelecimento'
  const navegar = (destino: string) => { window.history.pushState({}, '', destino); setRota(destino) }
  const tituloPagina = pdv ? 'Venda de ingressos' : checkin ? 'Check-in' : estabelecimento ? 'Estabelecimento' : 'Eventos'
  return <div className="aplicativo"><aside className="barra-lateral"><div className="marca"><span className="marca-simbolo"><Headphones size={27} /></span><span className="marca-texto"><strong>BACKSTAGE</strong><span>GESTÃO DE EVENTOS</span></span></div><div className="barra-contexto">OPERACIONAL</div><nav className="navegacao"><button className={`item-menu${!pdv && !checkin && !estabelecimento ? ' ativo' : ''}`} onClick={() => navegar('/eventos')}><CalendarDays size={23} /><span>Eventos</span></button><button className={`item-menu${pdv ? ' ativo' : ''}`} onClick={() => navegar('/pdv')}><ShoppingCart size={23} /><span>Venda de ingressos</span></button><button className={`item-menu${checkin ? ' ativo' : ''}`} onClick={() => navegar('/checkin')}><LogIn size={23} /><span>Check-in</span></button>{sessao.usuario?.perfil === 'GESTOR' && <button className={`item-menu${estabelecimento ? ' ativo' : ''}`} onClick={() => navegar('/estabelecimento')}><Building2 size={23} /><span>Estabelecimento</span></button>}</nav><div className="usuario-lateral"><span className="avatar-cabecalho">{sessao.usuario?.nome?.slice(0, 1).toUpperCase()}</span><div><strong>{sessao.usuario?.nome}</strong><small>{sessao.usuario?.perfil === 'GESTOR' ? 'Gestor' : 'Funcionário'}</small></div></div><button className="item-menu sair-menu" onClick={() => { dispatch(sair()); setMensagemSucesso(''); navegar('/login') }}><LogOut size={23} /><span>Sair</span></button></aside><main className="conteudo-principal"><header className="cabecalho"><span className="cabecalho-marca">Backstage <b>/</b> <strong>{tituloPagina}</strong></span><div className="cabecalho-usuario"><span>{sessao.usuario?.nome}</span><i>{sessao.usuario?.nome?.slice(0, 1).toUpperCase()}</i></div></header><div className="area-conteudo">{pdv ? <Pdv /> : checkin ? <Checkin /> : estabelecimento ? <PaginaEstabelecimento /> : <Eventos />}</div></main></div>
}
export default App
