# Rotas da API

Todas as rotas abaixo são prefixadas por `/v1`. Rotas protegidas por JWT recebem
`Authorization: Bearer <token>`. A integração de consumo usa a API Key do
estabelecimento no cabeçalho `x-api-key`, gerada por um gestor em
`POST /estabelecimento/api-key`.

| Método | URL | Acesso | Corpo esperado | Resposta de exemplo |
|---|---|---|---|---|
| POST | `/estabelecimento/api-key` | Gestor | Sem corpo. A chave em texto puro é retornada somente nesta resposta. | `{"apiKey":"dbk_<chave-secreta>","apiKeyPrefixo":"dbk_..."}` |
| POST | `/integracoes/consumo` | API Key do estabelecimento | `{"idTransacaoExterna":"pdv-123","valorTotal":"42.50","dataHoraTransacao":"2026-11-05T23:00:00Z","itens":[{"nome":"Cerveja","quantidade":2}]}`. `eventoId` e `clienteId` são opcionais. | `{"id":1,"idTransacaoExterna":"pdv-123","valorTotal":"42.50","dataHoraTransacao":"2026-11-05T23:00:00.000Z","eventoId":7,"clienteId":null,"itens":[{"nome":"Cerveja","quantidade":2}],"criadoEm":"2026-11-06T00:00:00.000Z"}` |
| POST | `/integracoes/consumo/lote` | API Key do estabelecimento | `{"vendas":[{"idTransacaoExterna":"pdv-124","valorTotal":"42.50","dataHoraTransacao":"2026-11-05T23:00:00Z"}]}` | `{"total":1,"criadas":1,"repetidas":0,"resultados":[{"idTransacaoExterna":"pdv-124","situacao":"IMPORTADA","venda":{"id":2,"valorTotal":"42.50"}}]}` |
| POST | `/vendas-consumo/importacao` | Gestor | JSON `{"vendas":[...]}` ou arquivo CSV enviado como `text/csv`. | Mesmo formato de resposta do lote. |
| GET | `/eventos/:id/consumo/resumo` | Gestor | Sem corpo. | `{"evento":{"id":7,"nome":"Noite Rock","dataHora":"2026-11-05T20:00:00.000Z"},"faturamentoBar":"1250.00","presentesCheckin":50,"ticketMedioGeral":"25.00"}` |

Ao receber consumo sem `eventoId`, a API procura um único evento do mesmo
estabelecimento cuja duração inclua o horário da venda. Se não houver evento ou
houver mais de um, `eventoId` fica `null`. Informar um `eventoId` manualmente
tem prioridade, mas o evento precisa pertencer ao estabelecimento da API Key.
Uma repetição do mesmo `idTransacaoExterna` no estabelecimento retorna a venda
já registrada, com HTTP 200, sem duplicá-la.

### Envio em lote e importação CSV

O parceiro pode enviar até 100 vendas por chamada para
`POST /v1/integracoes/consumo/lote`, usando `x-api-key` e um JSON no formato
`{"vendas":[...]}`. O gestor também pode importar o mesmo formato JSON em
`POST /v1/vendas-consumo/importacao`, com `Authorization: Bearer <token>`, ou
enviar um CSV como corpo da requisição com `Content-Type: text/csv`.

O CSV usa cabeçalho com estes nomes exatos:

```csv
idTransacaoExterna,valorTotal,dataHoraTransacao,eventoId,clienteId,itens
pdv-125,42.50,2026-11-05T23:00:00Z,,,"[{""nome"":""Cerveja"",""quantidade"":2}]"
```

`idTransacaoExterna`, `valorTotal` e `dataHoraTransacao` são obrigatórios;
`eventoId`, `clienteId` e `itens` são opcionais. `itens`, quando enviado no
CSV, deve ser um JSON válido dentro da célula.

O lote é atômico: se alguma venda for inválida ou referenciar um cliente/evento
que não pertence ao estabelecimento, nenhuma venda nova do lote é gravada.
Transações que já existem no mesmo estabelecimento são informadas como
`JA_EXISTIA` e não são duplicadas. Identificadores repetidos dentro do próprio
lote são rejeitados. Em caso de sucesso, a resposta informa `total`, `criadas`,
`repetidas` e o resultado de cada transação.

Exemplo de importação CSV pelo gestor:

```bash
curl -X POST http://localhost:3000/v1/vendas-consumo/importacao \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: text/csv" \
  --data-binary @vendas.csv
```

Exemplo de envio em lote pelo sistema parceiro:

```bash
curl -X POST http://localhost:3000/v1/integracoes/consumo/lote \
  -H "x-api-key: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"vendas":[{"idTransacaoExterna":"pdv-126","valorTotal":"18.00","dataHoraTransacao":"2026-11-05T23:15:00Z"}]}'
```

Guarde a API Key em local seguro: ela não pode ser consultada novamente. Se
gerar uma nova chave, a anterior deixa de autenticar a integração.

O faturamento soma as vendas de consumo vinculadas ao evento. O ticket médio
divide esse faturamento pelo número de ingressos confirmados com check-in
realizado; sem presentes registrados, `ticketMedioGeral` é `null`.
