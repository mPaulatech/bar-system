import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Check, LoaderCircle, Save } from 'lucide-react'
import { atualizarEstabelecimento, obterEstabelecimento } from '../servicos'
import type { Estabelecimento } from '../tipos'

type DadosFormulario = {
  nomeFantasia: string
  razaoSocial: string
}

const formularioVazio: DadosFormulario = { nomeFantasia: '', razaoSocial: '' }

function PaginaEstabelecimento() {
  const [dados, setDados] = useState<Estabelecimento | null>(null)
  const [formulario, setFormulario] = useState(formularioVazio)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    obterEstabelecimento()
      .then((estabelecimento) => {
        setDados(estabelecimento)
        setFormulario({ nomeFantasia: estabelecimento.nomeFantasia, razaoSocial: estabelecimento.razaoSocial })
      })
      .catch((falha: Error) => setErro(falha.message))
      .finally(() => setCarregando(false))
  }, [])

  const alterarCampo = (campo: keyof DadosFormulario, valor: string) => {
    setFormulario((atual) => ({ ...atual, [campo]: valor }))
    setErro('')
    setSucesso('')
  }

  const salvar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!formulario.nomeFantasia.trim() || !formulario.razaoSocial.trim()) {
      setErro('Preencha o nome fantasia e a razão social.')
      setSucesso('')
      return
    }

    setSalvando(true)
    setErro('')
    setSucesso('')
    atualizarEstabelecimento({ nomeFantasia: formulario.nomeFantasia.trim(), razaoSocial: formulario.razaoSocial.trim() })
      .then((estabelecimento) => {
        setDados(estabelecimento)
        setFormulario({ nomeFantasia: estabelecimento.nomeFantasia, razaoSocial: estabelecimento.razaoSocial })
        setSucesso('Dados do estabelecimento atualizados com sucesso.')
      })
      .catch((falha: Error) => setErro(falha.message))
      .finally(() => setSalvando(false))
  }

  return (
    <section className="estabelecimento-pagina">
      <div className="titulo-secao">
        <div>
          <div className="sobretitulo"><span className="ponto-ao-vivo" /> CONFIGURAÇÕES</div>
          <h1>Meu estabelecimento</h1>
          <p>Consulte e mantenha atualizados os dados cadastrais da sua casa.</p>
        </div>
      </div>
      {carregando && <div className="painel estado-estabelecimento" role="status"><LoaderCircle className="girando" size={18} /><span>Carregando os dados do estabelecimento...</span></div>}
      {!carregando && <div className="painel painel-estabelecimento">
        <div className="cabecalho-painel">
          <div className="icone-painel"><Building2 size={18} /></div>
          <div><h2>Dados cadastrais</h2><p>Altere somente os campos permitidos para edição.</p></div>
        </div>
        {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
        {sucesso && <p className="mensagem-sucesso" role="status"><Check size={14} /> {sucesso}</p>}
        <form className="formulario-estabelecimento" onSubmit={salvar}>
          <label className="campo-modal">Nome fantasia<input type="text" value={formulario.nomeFantasia} onChange={(evento) => alterarCampo('nomeFantasia', evento.target.value)} minLength={2} required /></label>
          <label className="campo-modal">Razão social<input type="text" value={formulario.razaoSocial} onChange={(evento) => alterarCampo('razaoSocial', evento.target.value)} minLength={2} required /></label>
          <div className="dados-somente-leitura">
            <div className="campo-leitura"><span>CNPJ</span><strong>{dados?.cnpj || 'Não informado'}</strong></div>
            <div className="campo-leitura"><span>E-mail de contato</span><strong>{dados?.emailContato || 'Não informado'}</strong></div>
            <p>O CNPJ e o e-mail de contato não podem ser alterados nesta tela.</p>
          </div>
          <div className="acoes-estabelecimento"><button className="botao-primario" type="submit" disabled={salvando}>{salvando ? <><LoaderCircle className="girando" size={14} /> Salvando...</> : <><Save size={14} /> Salvar alterações</>}</button></div>
        </form>
      </div>}
    </section>
  )
}

export default PaginaEstabelecimento
