# Rotas administrativas da API

Todas as rotas abaixo exigem `Authorization: Bearer <token>` e usam o
`estabelecimentoId` presente no token.

## Clientes

| Método | URL | Perfil | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/v1/clientes` | GESTOR | `{ "nome": "...", "cpf": "...", "email": "..." }` | Cliente criado |
| GET | `/v1/clientes` | GESTOR | — | `{ dados, pagina, limite, total, totalPaginas }` |
| GET | `/v1/clientes/cpf/:cpf` | GESTOR, FUNCIONARIO | — | `{ id, nome, cpf, email }` para venda |
| GET | `/v1/clientes/:id` | GESTOR | — | Cliente encontrado |
| PATCH | `/v1/clientes/:id` | GESTOR | `{ "nome": "...", "email": "..." }` | Cliente atualizado |

## Vendas de ingressos

`POST /v1/vendas-ingressos` continua disponível para `GESTOR` e
`FUNCIONARIO`, mas exige `eventoId`, `ingressoTipoId`, `quantidade`,
`formaPagamento`, `nomeCliente`, `cpf` e `emailCliente`. O CPF é normalizado,
e o cliente existente é reutilizado somente quando nome e e-mail coincidem.

# Consulta pública de eventos e lotes

As rotas abaixo não exigem `Authorization`. O estabelecimento é localizado
somente pelo `identificadorPublico` da URL.

| Método | URL | Perfil | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/v1/publico/estabelecimentos/:identificadorPublico` | Público | — | `{ identificadorPublico, nomeFantasia }` |
| GET | `/v1/publico/estabelecimentos/:identificadorPublico/eventos` | Público | — | Lista de eventos `ATIVO` com lotes disponíveis |
| GET | `/v1/publico/estabelecimentos/:identificadorPublico/eventos/:eventoId/lotes` | Público | — | Lista de lotes disponíveis do evento |
| POST | `/v1/publico/estabelecimentos/:identificadorPublico/compras` | Público | `{ eventoId, ingressoTipoId, quantidade, nome, cpf, email, chaveIdempotencia, pagamentoSimulado, consentimentoMarketing }` | Compra aprovada e ingressos criados; e-mail somente simulado |

Exemplos:

```json
GET /v1/publico/estabelecimentos/dona-bier/eventos
[
  {
    "id": 1,
    "nome": "Sexta do Samba",
    "generoMusical": "Samba",
    "atracoes": "Banda Exemplo",
    "dataHora": "2026-12-05T22:00:00.000Z",
    "duracaoHoras": 8
  }
]
```

```json
GET /v1/publico/estabelecimentos/dona-bier/eventos/1/lotes
[
  {
    "id": 10,
    "nome": "Lote 1",
    "preco": "50.00",
    "quantidadeDisponivel": 42
  }
]
```

```json
POST /v1/publico/estabelecimentos/dona-bier/compras
{
  "eventoId": 1,
  "ingressoTipoId": 10,
  "quantidade": 2,
  "nome": "Cliente Exemplo",
  "cpf": "529.982.247-25",
  "email": "cliente@exemplo.com",
  "chaveIdempotencia": "pedido-123",
  "pagamentoSimulado": "APROVADO",
  "consentimentoMarketing": false
}
```

A resposta contém `compraId`, `quantidade`, `valorTotal`, `statusPagamento`
e os ingressos individuais com seus códigos, além de
`emailTransacionalSimulado: true`. O preço, o estoque, o status do pagamento
e o estabelecimento são definidos ou validados pelo backend. Use
`pagamentoSimulado: "RECUSADO"` apenas para testar a falha acadêmica; nesse
caso a API responde `402` e não cria compra, ingressos ou baixa estoque.
