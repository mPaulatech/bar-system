export const eventosMock = [
  {
    id: 'black-signal-2026',
    nome: 'BLACK SIGNAL',
    descricao: 'Metal alternativo · edição de outubro',
    data: '10 out, 22h',
    local: 'Backstage Rock Bar',
    vendidos: 286,
    capacidade: 350,
    status: 'Ativo',
  },
  {
    id: 'noite-do-grunge-2026',
    nome: 'Noite do Grunge',
    descricao: 'Especial anos 90 · ao vivo',
    data: '11 out, 21h',
    local: 'Backstage Rock Bar',
    vendidos: 214,
    capacidade: 250,
    status: 'Ativo',
  },
  {
    id: 'festival-amplifica-2026',
    nome: 'Festival Amplifica',
    descricao: 'Festival independente · 4 bandas',
    data: '12 out, 18h',
    local: 'Arena Backstage',
    vendidos: 420,
    capacidade: 420,
    status: 'Esgotado',
  },
  {
    id: 'velvet-underground-2026',
    nome: 'Velvet Underground',
    descricao: 'Indie rock · tributo especial',
    data: '16 out, 22h',
    local: 'Backstage Rock Bar',
    vendidos: 86,
    capacidade: 300,
    status: 'Ativo',
  },
  {
    id: 'sexta-sem-freio-2026',
    nome: 'Sexta sem Freio',
    descricao: 'Rock nacional · abertura da casa às 20h',
    data: '17 out, 22h',
    local: 'Backstage Rock Bar',
    vendidos: 0,
    capacidade: 280,
    status: 'Agendado',
  },
  {
    id: 'acustico-na-garagem-2026',
    nome: 'Acústico na Garagem',
    descricao: 'Show intimista · voz e violão',
    data: '18 out, 20h',
    local: 'Palco 2',
    vendidos: 144,
    capacidade: 200,
    status: 'Ativo',
  },
]

// Substitua esta função pela chamada à API quando o endpoint estiver disponível.
export function buscarEventos() {
  return Promise.resolve(eventosMock)
}