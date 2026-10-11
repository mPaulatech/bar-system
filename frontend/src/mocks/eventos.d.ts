export type StatusEvento = 'Ativo' | 'Esgotado' | 'Agendado'

export type EventoMock = {
  id: string
  nome: string
  descricao: string
  data: string
  local: string
  vendidos: number
  capacidade: number
  status: StatusEvento
}

export const eventosMock: EventoMock[]
export function buscarEventos(): Promise<EventoMock[]>