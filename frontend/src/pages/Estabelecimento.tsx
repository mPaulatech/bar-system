import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Building2, Check, Clipboard, FileUp, KeyRound, LoaderCircle, Save, X } from 'lucide-react'
import { atualizarEstabelecimento, gerarApiKeyEstabelecimento, importarVendasConsumo, obterEstabelecimento } from '../servicos'
import type { Estabelecimento, ResultadoImportacaoConsumo } from '../tipos'

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
  const [apiKey, setApiKey] = useState('')
  const [apiKeyPrefixo, setApiKeyPrefixo] = useState<string | null>(null)
  const [gerandoApiKey, setGerandoApiKey] = useState(false)
  const [copiada, setCopiada] = useState(false)
  const [arquivoImportacao, setArquivoImportacao] = useState<File | null>(null)
  const [importando, setImportando] = useState(false)
  const [erroImportacao, setErroImportacao] = useState('')
  const [resultadoImportacao, setResultadoImportacao] = useState<ResultadoImportacaoConsumo | null>(null)
  const campoArquivoRef = useRef<HTMLInputElement>(null)

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

  const gerarChave = async () => {
    if (dados?.apiKeyPrefixo && !window.confirm('Gerar uma nova chave invalida a chave atual e interrompe a integração que a utiliza. Deseja continuar?')) return
    setGerandoApiKey(true)
    setErro('')
    setSucesso('')
    setApiKey('')
    setCopiada(false)
    try {
      const resultado = await gerarApiKeyEstabelecimento()
      setApiKey(resultado.apiKey)
      setApiKeyPrefixo(resultado.apiKeyPrefixo)
      setDados((atual) => atual ? { ...atual, apiKeyPrefixo: resultado.apiKeyPrefixo } : atual)
      setSucesso('Chave gerada. Copie e guarde-a agora; ela não será exibida novamente.')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível gerar a chave de integração.')
    } finally {
      setGerandoApiKey(false)
    }
  }

  const copiarApiKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setCopiada(true)
    } catch {
      setErro('Não foi possível copiar a chave. Selecione e copie o valor exibido.')
    }
  }

  const enviarImportacao = async () => {
    if (!arquivoImportacao) return
    setImportando(true)
    setErroImportacao('')
    setResultadoImportacao(null)
    try {
      setResultadoImportacao(await importarVendasConsumo(arquivoImportacao))
      setArquivoImportacao(null)
      if (campoArquivoRef.current) campoArquivoRef.current.value = ''
    } catch (falha) {
      setErroImportacao(falha instanceof Error ? falha.message : 'Não foi possível importar o arquivo.')
    } finally {
      setImportando(false)
    }
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
      {carregando && <div className="painel estado-estabelecimento" role="status"><LoaderCircle className="girando" size={23} /><span>Carregando os dados do estabelecimento...</span></div>}
      {!carregando && <div className="painel painel-estabelecimento">
        <div className="cabecalho-painel">
          <div className="icone-painel"><Building2 size={23} /></div>
          <div><h2>Dados cadastrais</h2><p>Altere somente os campos permitidos para edição.</p></div>
        </div>
        {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
        {sucesso && <p className="mensagem-sucesso" role="status"><Check size={20} /> {sucesso}</p>}
        <form className="formulario-estabelecimento" onSubmit={salvar}>
          <label className="campo-modal">Nome fantasia<input type="text" value={formulario.nomeFantasia} onChange={(evento) => alterarCampo('nomeFantasia', evento.target.value)} minLength={2} required /></label>
          <label className="campo-modal">Razão social<input type="text" value={formulario.razaoSocial} onChange={(evento) => alterarCampo('razaoSocial', evento.target.value)} minLength={2} required /></label>
          <div className="dados-somente-leitura">
            <div className="campo-leitura"><span>CNPJ</span><strong>{dados?.cnpj || 'Não informado'}</strong></div>
            <div className="campo-leitura"><span>E-mail de contato</span><strong>{dados?.emailContato || 'Não informado'}</strong></div>
            <p>O CNPJ e o e-mail de contato não podem ser alterados nesta tela.</p>
          </div>
          <div className="acoes-estabelecimento"><button className="botao-primario" type="submit" disabled={salvando}>{salvando ? <><LoaderCircle className="girando" size={20} /> Salvando...</> : <><Save size={20} /> Salvar alterações</>}</button></div>
        </form>
      </div>}
      {!carregando && <div className="painel painel-integracao-consumo">
        <div className="cabecalho-painel">
          <div className="icone-painel"><KeyRound size={23} /></div>
          <div><h2>Integração de consumo</h2><p>Conecte o sistema do bar para registrar vendas e calcular o consumo por evento.</p></div>
        </div>
        <div className="integracao-chave-atual">
          <span>Chave cadastrada</span>
          <code>{apiKeyPrefixo ?? dados?.apiKeyPrefixo ?? 'Nenhuma chave gerada'}</code>
        </div>
        <p className="integracao-aviso">A chave completa aparece uma única vez. Configure-a no sistema do PDV, não a compartilhe nem a inclua no código-fonte do frontend.</p>
        {apiKey && <div className="integracao-chave-nova" role="status">
          <label htmlFor="api-key-gerada">Nova chave — copie e guarde agora</label>
          <div><input id="api-key-gerada" value={apiKey} readOnly /><button className="botao-secundario" type="button" onClick={copiarApiKey}><Clipboard size={18} />{copiada ? 'Copiada' : 'Copiar'}</button><button className="botao-icone" type="button" onClick={() => setApiKey('')} aria-label="Ocultar chave"><X size={20} /></button></div>
        </div>}
        <div className="acoes-integracao"><button className="botao-secundario" type="button" disabled={gerandoApiKey} onClick={gerarChave}>{gerandoApiKey ? <><LoaderCircle className="girando" size={20} /> Gerando...</> : <><KeyRound size={19} /> {dados?.apiKeyPrefixo ? 'Gerar nova chave' : 'Gerar chave de integração'}</>}</button></div>
      </div>}
      {!carregando && <div className="painel painel-integracao-consumo painel-importacao-consumo">
        <div className="cabecalho-painel">
          <div className="icone-painel"><FileUp size={23} /></div>
          <div><h2>Importar vendas do bar</h2><p>Envie um arquivo CSV ou JSON com até 100 vendas. A importação é feita por completo ou não é feita.</p></div>
        </div>
        <label className="campo-modal" htmlFor="arquivo-consumo">Arquivo CSV ou JSON
          <input
            id="arquivo-consumo"
            ref={campoArquivoRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            disabled={importando}
            onChange={(evento) => {
              setArquivoImportacao(evento.target.files?.[0] ?? null)
              setErroImportacao('')
              setResultadoImportacao(null)
            }}
          />
        </label>
        <p className="integracao-aviso">JSON deve ter o formato {"{"}"vendas": [...]{"}"}. O CSV precisa conter as colunas idTransacaoExterna, valorTotal e dataHoraTransacao. Tamanho máximo: 1 MB.</p>
        {erroImportacao && <p className="mensagem-erro" role="alert">{erroImportacao}</p>}
        {resultadoImportacao && <div className="importacao-resultado" role="status">
          <p><Check size={18} /> Importação concluída: {resultadoImportacao.criadas} importadas e {resultadoImportacao.repetidas} já existentes.</p>
          <ul>{resultadoImportacao.resultados.map((item) => <li key={item.idTransacaoExterna}>
            <code>{item.idTransacaoExterna}</code>
            <span>{item.situacao === 'IMPORTADA' ? 'Importada' : 'Já existia'}</span>
          </li>)}</ul>
        </div>}
        <div className="acoes-integracao">
          <button className="botao-primario" type="button" disabled={!arquivoImportacao || importando} onClick={enviarImportacao}>
            {importando ? <><LoaderCircle className="girando" size={20} /> Importando...</> : <><FileUp size={19} /> Importar arquivo</>}
          </button>
        </div>
      </div>}
    </section>
  )
}

export default PaginaEstabelecimento
