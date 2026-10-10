import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type StatusIngresso = 'Ativo' | 'Esgotado' | 'Agendado'
export type FiltroIngresso = 'Todos' | StatusIngresso

export type Ingresso = {
  id: number
  evento: string
  lote: string
  local: string
  vendidos: number
  capacidade: number
  valor: number
  status: StatusIngresso
  data: string
  novo?: boolean
}

type EstadoIngressos = {
  ingressos: Ingresso[]
  carregando: boolean
  filtro: FiltroIngresso
  busca: string
}

const ingressosIniciais: Ingresso[] = [
  { id: 1, evento: 'BLACK SIGNAL', lote: '2º lote', local: 'Backstage Rock Bar', vendidos: 286, capacidade: 350, valor: 80, status: 'Ativo', data: 'Hoje, 22h' },
  { id: 2, evento: 'Noite do Grunge', lote: '1º lote', local: 'Backstage Rock Bar', vendidos: 214, capacidade: 250, valor: 60, status: 'Ativo', data: '11 out, 21h' },
  { id: 3, evento: 'Festival Amplifica', lote: 'Lote único', local: 'Arena Backstage', vendidos: 420, capacidade: 420, valor: 120, status: 'Esgotado', data: '12 out, 18h' },
  { id: 4, evento: 'Velvet Underground', lote: 'Pré-venda', local: 'Backstage Rock Bar', vendidos: 86, capacidade: 300, valor: 55, status: 'Ativo', data: '16 out, 22h' },
  { id: 5, evento: 'Sexta sem Freio', lote: '1º lote', local: 'Backstage Rock Bar', vendidos: 0, capacidade: 280, valor: 45, status: 'Agendado', data: '17 out, 22h' },
  { id: 6, evento: 'Acústico na Garagem', lote: 'Lote único', local: 'Palco 2', vendidos: 144, capacidade: 200, valor: 35, status: 'Ativo', data: '18 out, 20h' },
  { id: 7, evento: 'Noise Therapy', lote: '2º lote', local: 'Backstage Rock Bar', vendidos: 198, capacidade: 240, valor: 70, status: 'Ativo', data: '24 out, 22h' },
  { id: 8, evento: 'Halloween Amplificado', lote: 'Pré-venda', local: 'Arena Backstage', vendidos: 0, capacidade: 500, valor: 95, status: 'Agendado', data: '31 out, 21h' },
]

const estadoInicial: EstadoIngressos = {
  ingressos: ingressosIniciais,
  carregando: true,
  filtro: 'Todos',
  busca: '',
}

const fatiaIngressos = createSlice({
  name: 'ingressos',
  initialState: estadoInicial,
  reducers: {
    finalizarCarregamento(estado) {
      estado.carregando = false
    },
    setFiltro(estado, acao: PayloadAction<FiltroIngresso>) {
      estado.filtro = acao.payload
    },
    setBusca(estado, acao: PayloadAction<string>) {
      estado.busca = acao.payload
    },
    adicionarIngresso(estado, acao: PayloadAction<Ingresso>) {
      estado.ingressos.unshift(acao.payload)
    },
  },
})

export const { adicionarIngresso, finalizarCarregamento, setBusca, setFiltro } = fatiaIngressos.actions

export const store = configureStore({
  reducer: { ingressos: fatiaIngressos.reducer },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch