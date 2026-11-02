# Backend — API Dona Bier

API do MVP de gestão de eventos, ingressos e clientes para casas de shows. Cada estabelecimento acessa apenas os próprios dados.

## Requisitos

- Node.js 20.19 ou mais recente
- PostgreSQL

## Configuração e execução

No terminal, a partir da raiz do repositório:

```bash
cd backend
npm install
```

Crie o arquivo `.env` com os dados do seu banco e estas variáveis:

```env
DATABASE_URL="URL_DO_SEU_BANCO_POSTGRESQL"
JWT_SECRET="uma-chave-secreta-com-pelo-menos-16-caracteres"
JWT_EXPIRA_EM="8h"
PORTA=3000
FRONTEND_URL="http://localhost:5173"
LOGIN_LIMITE_TENTATIVAS=10
LOGIN_JANELA_MINUTOS=15
```

Não compartilhe nem envie o `.env` ao Git. A URL do banco é lida por `prisma.config.js`; o Prisma Client usa o adapter PostgreSQL.

```bash
npx prisma generate       # gera o Prisma Client
npx prisma migrate dev    # aplica migrations
npx prisma db seed        # opcional: carrega dados de exemplo
npm run dev               # inicia a API em modo de desenvolvimento
```

`npm start` inicia a API sem reinicialização automática. A rota `GET /v1/saude` deve responder `{ "status": "ok" }`.

## Testes

```bash
npm test
```

Os testes usam o executor nativo do Node (`node --test`).

## Rotas

Todas as rotas começam com `/v1`. Rotas protegidas recebem `Authorization: Bearer <JWT>`. O estabelecimento é identificado pelo token, não pelo corpo da requisição.

| Método e URL | Acesso | Uso |
|---|---|---|
| `GET /v1/saude` | Público | Verificar se a API está ativa |
| `POST /v1/autenticacao/registro-estabelecimento` | Público | Cadastrar estabelecimento e gestor |
| `POST /v1/autenticacao/login` | Público | Entrar e obter JWT |
| `GET /v1/usuarios/funcionarios` | Gestor | Listar funcionários |
| `POST /v1/usuarios/funcionarios` | Gestor | Cadastrar funcionário |
| `PATCH /v1/usuarios/funcionarios/:id/ativo` | Gestor | Ativar ou desativar funcionário |
| `GET /v1/eventos`, `/v1/eventos/ativos`, `/v1/eventos/:id` | Gestor ou funcionário | Consultar eventos |
| `POST /v1/eventos` | Gestor | Criar evento |
| `PATCH /v1/eventos/:id` | Gestor | Atualizar evento |
| `DELETE /v1/eventos/:id` | Gestor | Excluir evento sem vendas; rejeitar se houver vendas |
| `GET /v1/eventos/:eventoId/ingressos-tipos` | Gestor ou funcionário | Listar tipos de ingresso |
| `GET /v1/eventos/:eventoId/ingressos-tipos/:id` | Gestor ou funcionário | Consultar tipo de ingresso |
| `POST /v1/eventos/:eventoId/ingressos-tipos` | Gestor | Criar tipo de ingresso |
| `PATCH /v1/eventos/:eventoId/ingressos-tipos/:id` | Gestor | Atualizar tipo de ingresso |
| `DELETE /v1/eventos/:eventoId/ingressos-tipos/:id` | Gestor | Excluir tipo de ingresso |
| `GET /v1/estabelecimento` | Gestor ou funcionário | Consultar estabelecimento |
| `PATCH /v1/estabelecimento` | Gestor | Atualizar estabelecimento |
| `POST /v1/estabelecimento/api-key` | Gestor | Gerar chave de integração |
| `POST /v1/vendas-ingressos` | Gestor ou funcionário | Vender ingressos |
| `GET /v1/vendas-ingressos`, `/v1/vendas-ingressos/:id` | Gestor ou funcionário | Consultar vendas |
| `POST /v1/vendas-ingressos/:id/estorno` | Gestor | Estornar venda |

Os campos obrigatórios de cada corpo e os parâmetros de consulta são validados com Zod. O cadastro de estabelecimento espera dados da casa e do gestor; o login recebe e-mail e senha; uma venda recebe evento, tipo, quantidade e forma de pagamento, além do cliente. Erros seguem o formato `{ "status": "...", "mensagem": "..." }`.

### Integração de consumo

A rota `POST /v1/integrations/consumption`, autenticada por `x-api-key`, está planejada e ainda não está disponível.

## Banco e segurança

O modelo e as tabelas estão descritos em [`docs/banco-de-dados.md`](docs/banco-de-dados.md). Senhas e chaves são armazenadas como hash; requisições são validadas; consultas são isoladas por estabelecimento; vendas e operações de estoque usam transações.
