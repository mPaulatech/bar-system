/**
 * Trata erros não tratados sem expor detalhes internos ao cliente.
 * @param {Error & {status?: number, detalhes?: unknown}} erro Erro recebido.
 * @param {import('express').Request} req Requisição atual.
 * @param {import('express').Response} res Resposta atual.
 * @param {import('express').NextFunction} next Próximo middleware da cadeia.
 * @returns {void} Envia uma resposta padronizada ao cliente.
 */
export function tratamentoErros(erro, req, res, next) {
  const status = Number.isInteger(erro.status) && erro.status >= 400 && erro.status < 600
    ? erro.status
    : 500;
  const mensagem = status === 500
    ? 'Ocorreu um erro interno no servidor.'
    : erro.message;

  res.status(status).json({
    status: status === 500 ? 'erro' : 'falha',
    mensagem,
    ...(status !== 500 && erro.detalhes ? { detalhes: erro.detalhes } : {}),
  });
}
