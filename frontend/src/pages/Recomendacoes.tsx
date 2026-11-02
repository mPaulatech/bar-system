import { useEffect, useState } from 'react'
import { AlertCircle, Lightbulb, RefreshCw, Ticket, UserRound } from 'lucide-react'
import { obterRecomendacoes } from '../servicos'
import type { RespostaRecomendacoes } from '../tipos'
import './Recomendacoes.css'

function Recomendacoes() {
  const [dados, setDados] = useState<RespostaRecomendacoes | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = () => {
    setCarregando(true)
    setErro('')
    obterRecomendacoes()
      .then(setDados)
      .catch((falha: Error) => setErro(falha.message))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    let ativa = true
    obterRecomendacoes()
      .then((resposta) => { if (ativa) setDados(resposta) })
      .catch((falha: Error) => { if (ativa) setErro(falha.message) })
      .finally(() => { if (ativa) setCarregando(false) })
    return () => { ativa = false }
  }, [])

  const total = (dados?.clientesInativos.length ?? 0) + (dados?.tiposEventoBaixaAdesao.length ?? 0)

  return (
    <section className="recomendacoes-pagina">
      <div className="titulo-secao">
        <div>
          <span className="sobretitulo"><Lightbulb size={14} /> ANÁLISE DO ESTABELECIMENTO</span>
          <h1>Recomendações</h1>
          <p>Sugestões calculadas com base nas compras e nas edições dos seus eventos.</p>
        </div>
        <button className="botao-secundario recomendacoes-atualizar" type="button" onClick={carregar} disabled={carregando}>
          <RefreshCw size={15} className={carregando ? 'recomendacoes-girando' : ''} />
          Atualizar
        </button>
      </div>

      {erro && (
        <div className="mensagem-erro recomendacoes-erro" role="alert">
          <AlertCircle size={17} />
          <span>{erro}</span>
          <button className="botao-secundario" type="button" onClick={carregar}>Tentar novamente</button>
        </div>
      )}

      {carregando && !dados && <p className="recomendacoes-vazio" role="status">Analisando os dados...</p>}

      {!carregando && !erro && dados && (
        <>
          <div className="recomendacoes-resumo">
            <div className="recomendacoes-resumo-icone"><Lightbulb size={19} /></div>
            <div>
              <strong>{total === 1 ? '1 sugestão encontrada' : `${total} sugestões encontradas`}</strong>
              <span>Geradas agora a partir dos dados atuais do estabelecimento.</span>
            </div>
          </div>

          {total === 0 ? (
            <div className="painel recomendacoes-sem-resultados">
              <span className="recomendacoes-sem-resultados-icone"><Lightbulb size={23} /></span>
              <h2>Nenhuma sugestão no momento</h2>
              <p>Quando os dados atenderem aos critérios de inatividade ou baixa adesão, as recomendações aparecerão aqui.</p>
            </div>
          ) : (
            <div className="recomendacoes-grade">
              <section className="painel recomendacoes-grupo">
                <header className="recomendacoes-grupo-cabecalho">
                  <span className="recomendacoes-grupo-icone coral"><UserRound size={18} /></span>
                  <div>
                    <h2>Clientes inativos</h2>
                    <p>Sem compras há mais de 60 dias</p>
                  </div>
                  <span className="recomendacoes-contagem">{dados.clientesInativos.length}</span>
                </header>
                {dados.clientesInativos.length === 0 ? (
                  <p className="recomendacoes-grupo-vazio">Nenhum cliente atende a esse critério.</p>
                ) : (
                  <ul className="recomendacoes-lista">
                    {dados.clientesInativos.map((cliente) => (
                      <li className="recomendacao-item" key={cliente.clienteId}>
                        <div className="recomendacao-item-topo">
                          <strong>{cliente.nome}</strong>
                          <span>{cliente.diasInativo} dias</span>
                        </div>
                        <p>{cliente.mensagem}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="painel recomendacoes-grupo">
                <header className="recomendacoes-grupo-cabecalho">
                  <span className="recomendacoes-grupo-icone ouro"><Ticket size={18} /></span>
                  <div>
                    <h2>Baixa adesão por tipo</h2>
                    <p>Média abaixo de 40% nas últimas edições</p>
                  </div>
                  <span className="recomendacoes-contagem">{dados.tiposEventoBaixaAdesao.length}</span>
                </header>
                {dados.tiposEventoBaixaAdesao.length === 0 ? (
                  <p className="recomendacoes-grupo-vazio">Nenhum tipo de evento atende a esse critério.</p>
                ) : (
                  <ul className="recomendacoes-lista">
                    {dados.tiposEventoBaixaAdesao.map((tipo) => (
                      <li className="recomendacao-item" key={tipo.generoMusical}>
                        <div className="recomendacao-item-topo">
                          <strong>{tipo.generoMusical}</strong>
                          <span>{tipo.ocupacaoMediaPercentual}% · {tipo.edicoesAnalisadas} edições</span>
                        </div>
                        <p>{tipo.mensagem}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </section>
  )
}

export default Recomendacoes
