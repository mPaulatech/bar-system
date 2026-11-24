# BACKSTAGE — Gestão de eventos e ingressos

Projeto acadêmico da Fatec Guaratinguetá para gerenciar estabelecimentos, eventos e vendas de ingressos. Inclui uma interface web, uma API e um chatbot de sugestões para gestores integrado à API Gemini.

## Funcionalidades

- Cadastro de estabelecimento e login de usuários.
- Gerenciamento de funcionários, eventos e tipos de ingresso.
- Venda e consulta de ingressos, com possibilidade de estorno.
- Chatbot de sugestões do cardápio para gestores, usando a API Gemini.
- Interface web para eventos, PDV e dados do estabelecimento.
- Isolamento dos dados por estabelecimento.

## Tecnologias usadas

- **API**: Node.js, JavaScript, Express, PostgreSQL, Prisma e Zod.
- **Interface**: React, TypeScript, Redux Toolkit e Vite.
- **Autenticação e proteção**: JWT, bcryptjs, Helmet, CORS e express-rate-limit.
- **Testes da API**: executor nativo do Node.js (`node --test`).

## Estrutura do repositório

```
bar-system/
├── backend/     # API Node.js/Express, schema Prisma e testes
└── frontend/    # Interface React/Vite (eventos, PDV, estabelecimento)
```

## Como rodar localmente

### Pré-requisitos

- Node.js 20.19 ou mais recente e npm.
- PostgreSQL em execução.

### Instalação

Na raiz do projeto, instale as dependências:

```
npm install --prefix backend
npm install --prefix frontend
```

Crie `backend/.env` com as configurações abaixo. Substitua os valores de exemplo pelos dados locais do PostgreSQL e por um segredo próprio.

```
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/bar_system?schema=public"
JWT_SECRET="substitua-por-um-segredo-com-pelo-menos-16-caracteres"
JWT_EXPIRA_EM="8h"
PORTA=3000
FRONTEND_URL="http://localhost:5563"
GEMINI_API_KEY="sua-chave-do-Google-AI-Studio"

# Opcionais: estes são os valores padrão
LOGIN_LIMITE_TENTATIVAS=10
LOGIN_JANELA_MINUTOS=15
```

Prepare o banco:

```
cd backend
npx prisma generate
npx prisma migrate dev
```

O projeto não carrega eventos ou outros dados fictícios automaticamente. Cadastre o estabelecimento e o gestor reais pela rota `POST /v1/autenticacao/registro-estabelecimento`; depois, o gestor poderá cadastrar os eventos e os demais dados pela API.

### Inicialização

Na raiz do projeto, inicie a API e a interface ao mesmo tempo:

```
npm run dev
```

Pressione `Ctrl+C` para encerrar os dois processos. O chatbot usa a chave `GEMINI_API_KEY`, configurada apenas no `backend/.env`; obtenha uma chave no [Google AI Studio](https://aistudio.google.com/apikey).

A interface fica em `http://localhost:5563`; a API, em `http://localhost:3000`. Para executar os testes da API, use `npm test` dentro de `backend/`.

Se a API estiver em outro endereço, crie `frontend/.env` e configure:

```
VITE_API_URL=http://localhost:3000/v1
```

## Como usar

Verifique se a API está ativa:

```
curl http://localhost:3000/v1/saude
```

Faça login para obter um token:

```
curl -X POST http://localhost:3000/v1/autenticacao/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@exemplo.com","senha":"sua-senha"}'
```

Use o token retornado para consultar eventos:

```
curl http://localhost:3000/v1/eventos \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## Licença

O pacote do backend declara a licença ISC em `backend/package.json`. Não há um arquivo de licença para o repositório completo.