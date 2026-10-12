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

O cadastro inicial cria o estabelecimento e seu primeiro usuário `GESTOR` na mesma
transação. Senhas são armazenadas somente como hash bcrypt. No login, a API
emite um JWT assinado com `JWT_SECRET`, contendo `usuarioId`, `estabelecimentoId`
e `perfil`. O middleware de autenticação valida esse token e coloca esses dados
em `req.usuario`.

O `estabelecimentoId` não é aceito no corpo das requisições protegidas: ele vem
do token e todas as consultas e alterações de funcionários filtram por esse
valor. Assim, mesmo que um usuário tente informar o ID de outro estabelecimento,
não consegue acessar seus dados. O middleware `exigirPerfil('GESTOR')` retorna
403 para funcionários.

## Rotas da API

Todas as rotas começam com `/v1`. A tabela abaixo registra o contrato de cada
rota: método, URL, perfil necessário, corpo esperado e exemplo de resposta.
As rotas marcadas como **planejada** ainda não estão montadas no Express.

| Módulo | Método | URL | Perfil | Corpo esperado | Exemplo de resposta | Status |
|---|---|---|---|---|---|---|
| Saúde | `GET` | `/v1/saude` | Público | Nenhum corpo | `200 OK`<br>`{ "status": "ok" }` | Implementada |
| Autenticação | `POST` | `/v1/autenticacao/registro-estabelecimento` | Público | `{ "nomeFantasia": "Dona Bier", "razaoSocial": "Dona Bier Eventos Ltda.", "cnpj": "12.345.678/0001-90", "emailContato": "contato@donabier.example", "nomeGestor": "Marina Gestora", "emailGestor": "gestor@donabier.example", "senhaGestor": "Gestor@123456" }` | `201 Created`<br>`{ "estabelecimento": { "id": 1, "nomeFantasia": "Dona Bier" }, "gestor": { "id": 1, "email": "gestor@donabier.example" } }` | Implementada |
| Autenticação | `POST` | `/v1/autenticacao/login` | Público | `{ "email": "gestor@donabier.example", "senha": "Gestor@123456" }` | `200 OK`<br>`{ "token": "<JWT>", "usuario": { "id": 1, "nome": "Marina Gestora", "perfil": "GESTOR" } }` | Implementada |
| Usuários | `POST` | `/v1/usuarios/funcionarios` | GESTOR | `{ "nome": "Carlos", "email": "carlos@example.com", "senha": "Funcionario@123" }` | `201 Created`<br>Funcionário sem `senhaHash` | Implementada |
| Usuários | `GET` | `/v1/usuarios/funcionarios` | GESTOR | Nenhum corpo | `200 OK`<br>Lista do estabelecimento do token | Implementada |
| Usuários | `PATCH` | `/v1/usuarios/funcionarios/:id/ativo` | GESTOR | `{ "ativo": false }` | `200 OK`<br>Funcionário atualizado | Implementada |
| Eventos | `POST` | `/v1/eventos` | GESTOR | `{ "nome": "Noite do Rock", "generoMusical": "Rock", "atracoes": "Banda X", "dataHora": "2026-11-20T22:00:00-03:00", "status": "ATIVO" }` | `201 Created`<br>Evento criado | Implementada |
| Eventos | `GET` | `/v1/eventos` | GESTOR ou FUNCIONARIO | Consulta: `pagina`, `limite` (máx. 100), `status`, `generoMusical`, `dataInicio`, `dataFim` | `200 OK`<br>`{ "dados": [], "pagina": 1, "limite": 20, "total": 0, "totalPaginas": 0 }` | Implementada |
| Eventos | `GET` | `/v1/eventos/ativos` | GESTOR ou FUNCIONARIO | Nenhum | `200 OK`<br>Eventos com status `ATIVO` | Implementada |
| Eventos | `GET` | `/v1/eventos/:id` | GESTOR ou FUNCIONARIO | Nenhum | `200 OK`<br>Evento do estabelecimento | Implementada |
| Eventos | `PATCH` | `/v1/eventos/:id` | GESTOR | Campos do evento | `200 OK`<br>Evento atualizado | Implementada |
| Eventos | `DELETE` | `/v1/eventos/:id` | GESTOR | Nenhum | `200 OK`<br>Sem vendas exclui; com vendas muda para `ENCERRADO` | Implementada |
| Tipos de ingresso | `POST` | `/v1/eventos/:eventoId/ingressos-tipos` | GESTOR | `{ "nome": "VIP", "preco": 90, "quantidadeDisponivel": 100 }` | `201 Created`<br>Tipo com `quantidadeRestante` | Implementada |
| Tipos de ingresso | `GET` | `/v1/eventos/:eventoId/ingressos-tipos` | GESTOR ou FUNCIONARIO | Nenhum | `200 OK`<br>Tipos do evento com quantidade restante | Implementada |
| Tipos de ingresso | `GET` | `/v1/eventos/:eventoId/ingressos-tipos/:id` | GESTOR ou FUNCIONARIO | Nenhum | `200 OK`<br>Tipo com quantidade restante | Implementada |
| Tipos de ingresso | `PATCH` | `/v1/eventos/:eventoId/ingressos-tipos/:id` | GESTOR | Campos do tipo | `200 OK`<br>Tipo atualizado | Implementada |
| Tipos de ingresso | `DELETE` | `/v1/eventos/:eventoId/ingressos-tipos/:id` | GESTOR | Nenhum | `200 OK`<br>Sem vendas confirmadas exclui | Implementada |
| Estabelecimento | `GET` | `/v1/estabelecimento` | GESTOR ou FUNCIONARIO | Nenhum | `200 OK`<br>Dados públicos do estabelecimento | Implementada |
| Estabelecimento | `PATCH` | `/v1/estabelecimento` | GESTOR | `{ "nomeFantasia": "Novo nome", "razaoSocial": "Nova razão social" }` | `200 OK`<br>Estabelecimento atualizado | Implementada |
| Estabelecimento | `POST` | `/v1/estabelecimento/api-key` | GESTOR | Nenhum | `201 Created`<br>API Key em texto puro, exibida somente nesta resposta | Implementada |
| Vendas de ingressos | `POST` | `/v1/vendas-ingressos` | GESTOR ou FUNCIONARIO | `{ "eventoId": 1, "ingressoTipoId": 1, "cpf": "111.111.111-11", "nomeCliente": "Cliente" }` ou `clienteId` | `201 Created`<br>Venda com `codigoIngresso` de 8 caracteres | Implementada |
| Vendas de ingressos | `GET` | `/v1/vendas-ingressos/:id` | GESTOR ou FUNCIONARIO | Nenhum | `200 OK`<br>Evento, tipo, valor, cliente, código e status | Implementada |
| Vendas de ingressos | `GET` | `/v1/vendas-ingressos` | GESTOR ou FUNCIONARIO | Consulta: `eventoId`, `vendedorId`, `dataInicio`, `dataFim`, `pagina`, `limite` | `200 OK`<br>Lista paginada de vendas | Implementada |
| Vendas de ingressos | `POST` | `/v1/vendas-ingressos/:id/estorno` | GESTOR | Nenhum | `200 OK`<br>Venda estornada e estoque devolvido | Implementada |
| Integração de consumo | `POST` | `/v1/integrations/consumption` | Sistema parceiro com `x-api-key` | Cabeçalho `x-api-key: <chave-da-api>` e `{ "idTransacaoExterna": "PDV-2026-0001", "valorTotal": 72.5, "dataHoraTransacao": "2026-11-20T22:30:00-03:00", "cpfCliente": "111.111.111-11", "itens": [{ "nome": "Chopp", "quantidade": 2 }] }` | `201 Created`<br>`{ "id": 1, "idTransacaoExterna": "PDV-2026-0001", "status": "recebida" }` | Planejada |

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
