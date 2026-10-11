#API do Back-end

API do **Sistema de Gestão e Inteligência de Clientes** para casas de shows, desenvolvida como projeto acadêmico na **Fatec Guaratinguetá**

> Este README é completado ao longo do desenvolvimento. Onde estiver escrito **(preencher na Etapa N)**, a informação entra quando a etapa correspondente for concluída.

## O que o sistema faz

- Cadastro da casa de shows e dos eventos (multi-tenant: cada casa só enxerga os próprios dados)
- Criação de lotes e tipos de ingresso
- Venda de ingressos na portaria (PDV)
- Check-in e controle de acesso 
- API de integração para receber o consumo de sistemas parceiros (bar, PDV)
- Cruzamento do consumo e evento
- Ficha única do cliente, com histórico de vários eventos
- Alertas e restrições (pendências, débitos)
- Segmentação do público (frequentes, ausentes, VIPs, aniversariantes)
- Dashboard de performance e recomendações para o gestor

## Tecnologias

| Tecnologia | Uso |
|---|---|
| Node.js 20+ (JavaScript) | Ambiente de execução |
| Express | Servidor e rotas da API |
| PostgreSQL + Prisma | Banco de dados e acesso a ele |
| Zod | Validação dos dados recebidos |
| jsonwebtoken + bcryptjs | Login (JWT) e senhas criptografadas |
| helmet, cors, express-rate-limit | Segurança da API |
| `node --test` | Testes automatizados |

## Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou mais novo (`node -v`)
- [Git](https://git-scm.com)
- Um banco PostgreSQL (recomendado: projeto gratuito no [Neon](https://neon.com); ou PostgreSQL local)

## Como rodar o projeto

```bash
# 1. clonar o repositório e entrar na pasta do back-end
git clone <URL-DO-REPOSITORIO>
cd <pasta-do-repositorio>/backend

# 2. instalar as dependências
npm install

# 3. criar o arquivo de configuração a partir do exemplo
cp .env.example .env
# abra o .env e preencha os valores 

# 4. criar as tabelas no banco
npx prisma migrate dev

# 5. popular com dados de exemplo
npx prisma db seed

# 6. subir a API em modo desenvolvimento
npm run dev
```

A API sobe em `http://localhost:<PORTA>` e a rota `GET /v1/saude` responde `{ "status": "ok" }`.

### Variáveis de ambiente

> **Nunca** envie o arquivo `.env` para o GitHub. Ele guarda segredos.

| Variável | Para que serve | Exemplo |
|---|---|---|
| `DATABASE_URL` | Endereço do banco PostgreSQL | `postgresql://usuario:senha@host/banco?sslmode=require` |
| `JWT_SECRET` | Segredo que assina os tokens de login (use um texto longo e aleatório) | *(gere um valor próprio)* |
| `JWT_EXPIRA_EM` | Validade do token de login | `8h` |
| `PORTA` | Porta em que a API roda | `3000` |
| `FRONTEND_URL` | Endereço do front-end liberado no CORS | `http://localhost:5173` |

*(Conferir esta tabela com o `.env.example` na Etapa 16.)*

### Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API reiniciando sozinha a cada alteração |
| `npm start` | Sobe a API (modo normal) |
| `npm test` | Roda os testes automatizados |
| `npx prisma migrate dev` | Cria/atualiza as tabelas no banco |
| `npx prisma db seed` | Popula o banco com dados de exemplo |
| `npx prisma studio` | Abre uma tela no navegador para ver o banco |

### Usuários do seed (dados fictícios)

*(preencher na Etapa 2: e-mails e senhas de teste do gestor e do funcionário criados pelo seed.)*

---

## Estrutura de pastas

```
backend/
├── prisma/
│   ├── schema.prisma        # modelo do banco
│   └── seed.js              # dados de exemplo
├── docs/
│   ├── banco-de-dados.md    # diagrama, explicação e SQL das tabelas
│   ├── tabelas.sql          # SQL das tabelas (referência)
│   └── api-integracao.md    # como sistemas parceiros enviam consumo
├── src/
│   ├── app.js               # configuração do Express
│   ├── servidor.js          # inicialização do servidor
│   ├── configuracao/        # leitura das variáveis de ambiente
│   ├── banco/               # conexão única com o banco (Prisma)
│   ├── middlewares/         # autenticação, perfis, API Key, erros, validação
│   ├── utilitarios/         # funções auxiliares
│   └── modulos/             # um módulo por assunto
│       ├── autenticacao/
│       ├── estabelecimentos/
│       ├── eventos/
│       ├── ingressos/
│       ├── checkin/
│       ├── clientes/
│       ├── integracoes/
│       ├── segmentacao/
│       ├── kpis/
│       └── recomendacoes/
└── testes/
```

Cada módulo segue o mesmo padrão: `*.rotas.js` (URLs), `*.controlador.js` (recebe e responde) e `*.servico.js` (regra de negócio).

## Banco de dados

O modelo tem 9 tabelas, todas ligadas a um estabelecimento (isolamento multi-tenant). O diagrama completo, a explicação de cada tabela e o SQL estão em [`docs/banco-de-dados.md`](docs/banco-de-dados.md).

Tabelas: `estabelecimentos`, `usuarios`, `eventos`, `clientes`, `restricoes_clientes`, `ingressos_tipos`, `vendas_ingressos`, `vendas_consumo_api`, `recomendacoes_gestao`.

---

## Autenticação

Perfis:

| Perfil | Pode |
|---|---|
| `GESTOR` | Tudo: configurações, eventos, lotes, restrições, KPIs, recomendações, funcionários |
| `FUNCIONARIO` | Vender ingresso, fazer check-in e consultar clientes e eventos |

## Rotas da API

Todas as rotas começam com `/v1`. A tabela é preenchida conforme cada etapa é concluída.

| Módulo | Método e rota | Perfil | O que faz | Etapa |
|---|---|---|---|---|
| Saúde | `GET /v1/saude` | público | Verifica se a API está no ar | 1 |
| Autenticação | `POST /v1/autenticacao/registro-estabelecimento` | público | Cria a casa de shows e o primeiro gestor | 3 |
| Autenticação | `POST /v1/autenticacao/login` | público | Faz login e devolve o token | 3 |
| *(demais rotas)* | | | *(preencher a cada etapa)* | 3 a 15 |

## Integração com sistemas externos (API de consumo)

Sistemas parceiros enviam as vendas de consumo (bar, comidas) para `POST /v1/integrations/consumption`, autenticando com `x-api-key`. A mesma venda enviada duas vezes não é duplicada.

Guia completo para quem integra: [`docs/api-integracao.md`](docs/api-integracao.md) *(preencher na Etapa 7)*.

## Segurança

- O `estabelecimento_id` sempre vem do token, nunca do que o cliente envia, e toda consulta filtra por ele
- Senhas e chaves de API guardadas apenas com hash
- Todos os dados recebidos são validados com Zod
- Limite de requisições, `helmet` e CORS restrito ao front-end
- Estoque de ingressos e check-in são operações atômicas (sem venda duplicada nem QR usado duas vezes)
- CPF e outros dados pessoais não aparecem em logs (LGPD)

## Testes

```bash
npm test
``

---

