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
