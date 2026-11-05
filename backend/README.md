# Rotas da API

Todas as rotas abaixo são prefixadas por `/v1`. Rotas protegidas por JWT recebem
`Authorization: Bearer <token>`. A integração de consumo usa a API Key do
estabelecimento no cabeçalho `x-api-key`, gerada por um gestor em
`POST /estabelecimento/api-key`.

| Método | URL | Acesso | Corpo esperado | Resposta de exemplo |
|---|---|---|---|---|
| POST | `/integracoes/consumo` | API Key do estabelecimento | `{"idTransacaoExterna":"pdv-123","valorTotal":"42.50","dataHoraTransacao":"2026-11-05T23:00:00Z","itens":[{"nome":"Cerveja","quantidade":2}]}`. `eventoId` e `clienteId` são opcionais. | `{"id":1,"idTransacaoExterna":"pdv-123","valorTotal":"42.50","dataHoraTransacao":"2026-11-05T23:00:00.000Z","eventoId":7,"clienteId":null,"itens":[{"nome":"Cerveja","quantidade":2}],"criadoEm":"2026-11-06T00:00:00.000Z"}` |
| GET | `/eventos/:id/consumo/resumo` | Gestor | Sem corpo. | `{"evento":{"id":7,"nome":"Noite Rock","dataHora":"2026-11-05T20:00:00.000Z"},"faturamentoBar":"1250.00","presentesCheckin":50,"ticketMedioGeral":"25.00"}` |

Ao receber consumo sem `eventoId`, a API procura um único evento do mesmo
estabelecimento cuja duração inclua o horário da venda. Se não houver evento ou
houver mais de um, `eventoId` fica `null`. Informar um `eventoId` manualmente
tem prioridade, mas o evento precisa pertencer ao estabelecimento da API Key.
Uma repetição do mesmo `idTransacaoExterna` no estabelecimento retorna a venda
já registrada, com HTTP 200, sem duplicá-la.

O faturamento soma as vendas de consumo vinculadas ao evento. O ticket médio
divide esse faturamento pelo número de ingressos confirmados com check-in
realizado; sem presentes registrados, `ticketMedioGeral` é `null`.
