import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { UsuarioAutenticado } from './tipos'

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

type EstadoIngressos = { ingressos: Ingresso[]; carregando: boolean; filtro: FiltroIngresso; busca: string }
const estadoInicial: EstadoIngressos = { ingressos: [], carregando: false, filtro: 'Todos', busca: '' }
const fatiaIngressos = createSlice({
  name: 'ingressos',
  initialState: estadoInicial,
  reducers: {
    finalizarCarregamento(estado) { estado.carregando = false },
    setFiltro(estado, acao: PayloadAction<FiltroIngresso>) { estado.filtro = acao.payload },
    setBusca(estado, acao: PayloadAction<string>) { estado.busca = acao.payload },
  },
})

type EstadoAutenticacao = { token: string | null; usuario: UsuarioAutenticado | null }
const sessaoSalva = sessionStorage.getItem('sessao')
const estadoAutenticacaoInicial: EstadoAutenticacao = sessaoSalva
  ? JSON.parse(sessaoSalva) as EstadoAutenticacao
  : { token: null, usuario: null }
const fatiaAutenticacao = createSlice({
  name: 'autenticacao',
  initialState: estadoAutenticacaoInicial,
  reducers: {
    entrar(estado, acao: PayloadAction<EstadoAutenticacao>) {
      estado.token = acao.payload.token
      estado.usuario = acao.payload.usuario
      sessionStorage.setItem('sessao', JSON.stringify(acao.payload))
    },
    sair(estado) {
      estado.token = null
      estado.usuario = null
      sessionStorage.removeItem('sessao')
    },
  },
})

export const { finalizarCarregamento, setBusca, setFiltro } = fatiaIngressos.actions
export const { entrar, sair } = fatiaAutenticacao.actions
export const store = configureStore({ reducer: { ingressos: fatiaIngressos.reducer, autenticacao: fatiaAutenticacao.reducer } })
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
