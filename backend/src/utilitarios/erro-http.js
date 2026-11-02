export function erroHttp(status, mensagem, detalhes) {
  const erro = new Error(mensagem);
  erro.status = status;
  if (detalhes !== undefined) erro.detalhes = detalhes;
  return erro;
}
