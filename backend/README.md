# Rotas da API — administrativas e públicas

Todas as rotas administrativas abaixo exigem `Authorization: Bearer <token>`
e usam o `estabelecimentoId` presente no token.

## Clientes

| Método | URL | Perfil | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/v1/clientes` | GESTOR | `{ "nome": "...", "cpf": "...", "email": "..." }` | Cliente criado |
| GET | `/v1/clientes` | GESTOR | — | `{ dados, pagina, limite, total, totalPaginas }` |
| GET | `/v1/clientes/cpf/:cpf` | GESTOR, FUNCIONARIO | — | `{ id, nome, cpf, email }` para venda |
| GET | `/v1/clientes/:id` | GESTOR | — | Cliente encontrado |
| PATCH | `/v1/clientes/:id` | GESTOR | `{ "nome": "...", "email": "..." }` | Cliente atualizado |

## Vendas de ingressos

| Método | URL | Perfil | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/v1/vendas-ingressos` | GESTOR, FUNCIONARIO | `{ eventoId, ingressoTipoId, quantidade, formaPagamento, nomeCliente, cpf, emailCliente }` | Venda registrada |

O CPF é normalizado, e o cliente existente é reutilizado somente quando nome
e e-mail coincidem.

## Integração e importação de consumo

| Método | URL | Perfil/autenticação | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/v1/estabelecimento/api-key` | GESTOR com JWT | — | `{ apiKey, apiKeyPrefixo }`; a chave completa é exibida uma única vez |
| POST | `/v1/integracoes/consumo` | API Key no cabeçalho `x-api-key` | `{ idTransacaoExterna, valorTotal, dataHoraTransacao, eventoId?, clienteId?, itens? }` | Venda registrada ou existente |
| POST | `/v1/integracoes/consumo/lote` | API Key no cabeçalho `x-api-key` | `{ vendas: [...] }` | Resultado de cada venda |
| POST | `/v1/vendas-consumo/importacao` | GESTOR com JWT | Arquivo `text/csv` ou JSON `{ vendas: [...] }` | `{ total, criadas, repetidas, resultados }` |
| GET | `/v1/eventos/:id/consumo/resumo` | GESTOR com JWT | — | `{ evento, faturamentoBar, presentesCheckin, ticketMedioGeral }` |

O estabelecimento das vendas recebidas por API Key é identificado pela própria
chave; nunca envie `estabelecimentoId` no corpo. A importação pelo painel aceita
arquivos de até 1 MB e desfaz o lote inteiro se alguma venda for inválida.

## Consulta pública de eventos e lotes

As rotas abaixo não exigem `Authorization`. O estabelecimento é localizado
somente pelo `identificadorPublico` da URL.

| Método | URL | Perfil | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/v1/publico/estabelecimentos/:identificadorPublico` | Público | — | `{ identificadorPublico, nomeFantasia }` |
| GET | `/v1/publico/estabelecimentos/:identificadorPublico/eventos` | Público | — | Lista de eventos `ATIVO` com lotes disponíveis |
| GET | `/v1/publico/estabelecimentos/:identificadorPublico/eventos/:eventoId/lotes` | Público | — | Lista de lotes disponíveis do evento |
| POST | `/v1/publico/estabelecimentos/:identificadorPublico/compras` | Público | `{ eventoId, ingressoTipoId, quantidade, nome, cpf, email, chaveIdempotencia, pagamentoSimulado, consentimentoMarketing }` | Compra aprovada e ingressos criados; e-mail somente simulado |

### Exemplos

Listar eventos ativos do estabelecimento:

```
GET /v1/publico/estabelecimentos/dona-bier/eventos
```

```json
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

Listar lotes disponíveis de um evento:

```
GET /v1/publico/estabelecimentos/dona-bier/eventos/1/lotes
```

```json
[
  {
    "id": 10,
    "nome": "Lote 1",
    "preco": "50.00",
    "quantidadeDisponivel": 42
  }
]
```

Realizar uma compra pública:

```
POST /v1/publico/estabelecimentos/dona-bier/compras
```

```json
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

## Check-in

As rotas permitem a entrada somente de `GESTOR` e `FUNCIONARIO` do
estabelecimento autenticado. O `estabelecimentoId` e o usuário responsável
vêm do JWT.

| Método | URL | Perfil | Corpo/consulta | Resposta |
|---|---|---|---|---|
| POST | `/v1/checkin` | GESTOR, FUNCIONARIO | `{ "eventoId": 1, "codigoIngresso": "X3QFHM87" }` | Resultado `AUTORIZADO` ou falha com `detalhes.resultado` |
| GET | `/v1/checkin/presentes?eventoId=1&pagina=1&limite=20` | GESTOR, FUNCIONARIO | — | Lista paginada de ingressos utilizados |
| GET | `/v1/checkin/ausentes?eventoId=1&pagina=1&limite=20` | GESTOR, FUNCIONARIO | — | Lista paginada de ingressos pendentes |

Os resultados de falha são `JA_UTILIZADO`, `ESTORNADO`, `EVENTO_INCORRETO`,
`EVENTO_INATIVO` e `INGRESSO_INVALIDO`. As respostas não incluem CPF ou
e-mail.