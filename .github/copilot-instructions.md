# Instrucoes do projeto

## Visao geral

O projeto BACKSTAGE e um monorepo academico da Fatec Guaratingueta para
gestao de casas de shows e eventos. O caso de uso principal e o bar Dona
Bier.

O sistema cobre:

- cadastro de estabelecimento e usuarios;
- login com perfis GESTOR e FUNCIONARIO;
- cadastro e consulta de eventos e tipos de ingresso;
- venda administrativa e compra publica de ingressos;
- estorno, check-in, presentes e ausentes;
- cadastro e consulta de clientes;
- importacao de vendas de consumo de sistemas externos;
- consulta publica por identificador publico do estabelecimento;
- resumo de consumo e indicadores por evento.

O repositorio tem duas partes executaveis:

- `backend/`: API em Node.js e persistencia PostgreSQL;
- `frontend/`: painel web e fluxo de compra publica.

## Stack detectada

### Raiz

- npm com scripts centralizados;
- `package.json` raiz executa API e interface em um unico processo de
  desenvolvimento.

### Backend

- Node.js 20+;
- JavaScript com modulos ES (`type: module`);
- Express 5;
- PostgreSQL;
- Prisma 7 com `@prisma/adapter-pg`;
- Zod 4;
- jsonwebtoken;
- bcryptjs;
- Helmet;
- CORS;
- express-rate-limit;
- executor nativo de testes `node:test`;
- `node:crypto` para geracao de codigos e hash de API Keys.

O backend usa Prisma 7 com configuracao em `backend/prisma.config.js`. O
cliente e instanciado em `backend/src/banco/prisma.js`.

### Frontend

- React 19;
- TypeScript 6;
- Vite 6;
- Redux Toolkit;
- React Redux;
- Framer Motion;
- Lucide React;
- Recharts;
- oxlint.

A interface usa o TypeScript configurado pelo projeto Vite. Em
`frontend/tsconfig.app.json`, nao ha emissao de arquivos e valem
`noUnusedLocals`, `noUnusedParameters` e `erasableSyntaxOnly`.

## Arquitetura

### Inicializacao

- `backend/src/servidor.js` carrega a configuracao e inicia o Express;
- `backend/src/app.js` monta Helmet, CORS, parsing JSON, limite geral de
  requisicoes, rotas publicas, autenticacao, rotas privadas e tratamento de
  erros;
- `backend/scripts/desenvolvimento.js` inicia API e frontend a partir da raiz;
- `frontend/src/main.tsx` monta o React;
- `frontend/src/App.tsx` faz o roteamento interno por `window.location`;
- `frontend/src/store.ts` guarda autenticacao e filtros da tela de ingressos;
- `frontend/src/servicos/index.ts` concentra chamadas HTTP para a API.

### Organizacao do backend

Os modulos ficam em `backend/src/modulos/` e seguem, quando aplicavel, estes
arquivos:

- `*.rotas.js`: monta URLs, middlewares de autenticacao/perfil e validacao;
- `*.esquemas.js`: define schemas Zod de corpo, parametros e consulta;
- `*.controlador.js`: le `req`, chama o servico e envia `res`;
- `*.servico.js`: implementa regras de negocio e queries Prisma.

Modulos atuais:

- `autenticacao`;
- `usuarios`;
- `estabelecimento`;
- `eventos`;
- `ingressos-tipos`;
- `vendas-ingressos`;
- `clientes`;
- `checkin`;
- `consulta-publica`;
- `vendas-consumo`.

O fluxo real de uma rota administrativa e:

1. `*.rotas.js` recebe a requisicao;
2. `validar()` aplica o schema Zod e grava os dados validados em `req`;
3. `exigirPerfil()` verifica o perfil do JWT, quando necessario;
4. o controlador chama uma funcao do `*.servico.js`;
5. o servico usa o Prisma e retorna dados ou chama `erroHttp`;
6. o middleware `tratamento-erros.js` gera a resposta padronizada.

As rotas publicas seguem o mesmo fluxo, mas nao recebem o
`estabelecimentoId` por body ou query. Consultas publicas usam o
`identificadorPublico` do estabelecimento.

### Organizacao do frontend

- `frontend/src/pages/`: telas `Eventos`, `Pdv`, `Checkin`,
  `Estabelecimento` e `Publico`;
- `frontend/src/servicos/index.ts`: requisicoes autenticadas e publicas;
- `frontend/src/store.ts`: estado do Redux Toolkit;
- `frontend/src/tipos.ts`: tipos compartilhados das respostas e formularios;
- `frontend/src/mocks/`: dados mockados legados relacionados a eventos e
  ingressos;
- `frontend/src/App.css` e `frontend/src/index.css`: estilos da interface.

O frontend nao consulta Prisma nem banco diretamente. A API REST e usada por
funcoes em `frontend/src/servicos/index.ts`.

## Convencoes de codigo

### JavaScript e backend

- modulos ES: `import` e `export`;
- funcoes exportadas em `camelCase`;
- constantes em `MAIUSCULAS_COM_UNDERSCORE`;
- nomes de arquivos em minusculas e com ponto separando o papel;
- comentarios e mensagens do usuario em portugues do Brasil;
- sem acentos em identificadores;
- nomes tecnicos e metodos de bibliotecas permanecem em ingles;
- funcoes async usam `async/await`;
- operacoes simples que ja recebem dados podem retornar uma Promise sem
  declarar `async`;
- `Promise.all` e usado para consultas paginadas independentes;
- funcoes exportadas nao seguem uma convencao unica de JSDoc: o codigo novo
  deve explicar comentarios nao obvios e preservar o padrao do arquivo.

Os nomes dos campos seguem o modelo: `estabelecimentoId`, `codigoIngresso`,
`quantidadeDisponivel`, `usuarioVendedorId`, entre outros. No Prisma,
`camelCase` representa o campo e `@map` representa a coluna snake_case.

### TypeScript e frontend

- components e tipos em `PascalCase`;
- variaveis, funcoes e propriedades em `camelCase`;
- nomes de tipos e estado em portugues;
- `type` e usado para objetos e estados;
- `PayloadAction` tipa acoes do Redux Toolkit;
- a base usa JSX e React Hooks;
- imports de tipos usam `import type`;
- nao usar `any`;
- nao desativar verificacoes de TypeScript sem necessidade.

### Idioma

- manter mensagens de erro, validacao, comentarios e nomes de dominio em
  portugues;
- manter nomes obrigatorios de bibliotecas, propriedades HTTP e convencoes
  tecnicas em ingles, como `req`, `res`, `next`, `findMany` e `$transaction`.

## Banco de dados

O banco e PostgreSQL e o acesso e feito pelo Prisma.

- toda tabela de negocio possui `estabelecimentoId`;
- toda query administrativa deve filtrar por `estabelecimentoId`;
- buscas por id devem combinar `id` e `estabelecimentoId`;
- o `estabelecimentoId` vem do JWT ou da API Key, nunca do body, query ou
  URL;
- CPF e dados pessoais nao podem ser retornados ou registrados em logs;
- valores monetarios usam `Decimal` no Prisma com precisao 12,2;
- o codigo de ingresso tem 8 caracteres aleatorios;
- vendas, estoque e check-in usam transacoes quando a operacao pode haver
  concorrencia;
- o check-in usa `updateMany` com status confirmado e pendente antes de
  considerar a entrada realizada.

Mudancas no schema ficam em `backend/prisma/schema.prisma` e devem gerar uma
migracao em `backend/prisma/migrations/`:

```bash
cd backend
npx prisma migrate dev --name descricao_da_mudanca
npx prisma generate
```

Nao alterar o banco manualmente nem editar migrations ja aplicadas. Consultas
diretas SQL nao sao usadas atualmente; novas consultas devem preferir Prisma.

O schema atual inclui estabelecimentos, usuarios, eventos, ingressos tipos,
compras, vendas de ingressos, clientes, restricoes, vendas de consumo e
recomendacoes de gestao.

## Validacao, autenticacao e erros

- todo body, parametro e query do backend passa por schema Zod;
- `JWT_SECRET`, `JWT_EXPIRA_EM`, `PORTA`, `FRONTEND_URL` e a URL do banco
  sao validados em `backend/src/configuracao/ambiente.js`;
- o login usa senha com bcryptjs e limite proprio de requisicoes;
- credencial invalida deve retornar a mensagem generica
  `E-mail ou senha incorretos`;
- a API Key da integracao e armazenada como hash SHA-256;
- a chave completa e exibida uma unica vez;
- erros sao enviados pelo middleware unico no formato
  `{ status, mensagem, detalhes? }`;
- erros internos nao podem devolver stack trace nem detalhes do banco.

## Testes

Os testes da API usam somente o executor nativo do Node.js:

```bash
cd backend
npm test
```

Os arquivos ficam em `backend/testes/*.test.js` e cobrem autenticacao,
eventos, tipos de ingresso, vendas, clientes, check-in, consulta publica,
consumo e a rota de saude.

Os testes usam `node:assert/strict`, `node:test` e instancias locais de
`Express`; quando necessario, usam `PrismaFake` no lugar do banco real.
Nao existe configuracao de cobertura minima nem comando de cobertura no
projeto. Regras criticas como isolamento multi-tenant, estoque, check-in e
idempotencia devem ser cobertas por testes sempre que forem alteradas.

No frontend, existem scripts de build e lint:

```bash
cd frontend
npm run build
npm run lint
```

Nao ha framework de testes frontend configurado.

## Comandos de desenvolvimento

Na raiz:

```bash
npm run dev
```

Esse script inicia a API em `backend/` e a interface em `frontend/`.

Na API:

```bash
cd backend
npm run dev
npm test
npx prisma migrate dev
npx prisma generate
```

Na interface:

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## O que evitar

- nao criar campos ou tabelas no schema sem necessidade real;
- nao editar arquivos em `frontend/` quando a tarefa for somente de backend;
- nao colocar regra de negocio no controlador;
- nao acessar Prisma diretamente em rotas ou controladores;
- nao usar SQL concatenado com dados do usuario;
- nao usar `Number` para somar valores monetarios;
- nao incluir `estabelecimentoId` em body, query ou URL administrativos;
- nao consultar ou atualizar registros sem filtrar
  `estabelecimentoId`;
- nao confiar em dados recebidos sem validacao Zod;
- nao colocar hash de senha ou hash da API Key na resposta;
- nao registrar CPF completo em logs;
- nao usar QR Code para ingresso;
- nao criar codigo de ingresso sequencial;
- nao usar `any` no frontend;
- nao desabilitar verificacoes do TypeScript como forma de contornar erros;
- nao fazer leitura seguida de escrita em estoque ou check-in sem transacao
  atomica;
- nao adicionar dependencias fora da stack sem justificativa e aprovacao;
- nao executar processamento pesado em background: o projeto atual processa
  sob demanda ou na propria requisicao;
- nao adicionar Docker, NestJS, Redis, WebSocket, Swagger ou outro ORM ao
  projeto.

## Padrao de commits

O historico recente usa uma combinacao de commits conventionais e mensagens
descritivas em portugues. Quando um commit adiciona uma funcionalidade ou
corrige um problema, os tipos mais presentes sao:

- `feat:` para novas funcionalidades;
- `fix:` para correcoes;
- merges e mensagens pontuais em portugues tambem existem.

Como nao ha padrao exclusivo aplicado a todo o historico, preferir mensagens
curtas em portugues e, quando adequado, iniciar com `feat:` ou `fix:`:

```text
feat: adiciona consulta de presentes por evento
fix: impede duplicacao de venda na importacao
```

## Fluxo de trabalho com o Copilot

- Apos qualquer alteracao de codigo, explique em ate 3 frases: o que mudou,
  por que, e como testar/rodar.
- Antes de criar ou remover arquivos, mudar o schema do banco ou alterar
  logica de negocio existente, confirme o escopo e a finalidade com o
  usuario, exceto quando o pedido ja deixar isso claro.
- Ajustes triviais dentro do que ja foi combinado (nomear variavel,
  formatar codigo, corrigir erro obvio) podem ser executados direto, sem
  confirmacao.