export const ingressosMock = [
  {
    id: 'black-signal-pista',
    evento: 'BLACK SIGNAL',
    nome: 'Pista',
    lote: '2º lote',
    valor: 80,
    disponiveis: 64,
    cor: 'coral',
  },
  {
    id: 'black-signal-camarote',
    evento: 'BLACK SIGNAL',
    nome: 'Camarote',
    lote: 'Lote único',
    valor: 150,
    disponiveis: 18,
    cor: 'ouro',
  },
  {
    id: 'black-signal-meia',
    evento: 'BLACK SIGNAL',
    nome: 'Meia-entrada',
    lote: '2º lote',
    valor: 40,
    disponiveis: 32,
    cor: 'menta',
  },
  {
    id: 'noite-grunge-pista',
    evento: 'NOITE DO GRUNGE',
    nome: 'Pista',
    lote: '1º lote',
    valor: 60,
    disponiveis: 87,
    cor: 'coral',
  },
  {
    id: 'noite-grunge-meia',
    evento: 'NOITE DO GRUNGE',
    nome: 'Meia-entrada',
    lote: '1º lote',
    valor: 30,
    disponiveis: 41,
    cor: 'menta',
  },
  {
    id: 'festival-amplifica-pista',
    evento: 'FESTIVAL AMPLIFICA',
    nome: 'Pista',
    lote: 'Lote único',
    valor: 120,
    disponiveis: 0,
    cor: 'coral',
  },
]

// Substitua esta função pela chamada à API quando o endpoint estiver disponível.
export function buscarIngressosDisponiveis() {
  return Promise.resolve(ingressosMock)
}