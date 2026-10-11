type IngressoMock = {
  id: string
  evento: string
  nome: string
  lote: string
  valor: number
  disponiveis: number
  cor: string
}

export const ingressosMock: IngressoMock[]
export function buscarIngressosDisponiveis(): Promise<IngressoMock[]>