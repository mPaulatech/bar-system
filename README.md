# BACKSTAGE — Gestão de eventos e ingressos

Projeto acadêmico da Fatec Guaratinguetá para gerenciar estabelecimentos, eventos e vendas de ingressos. Inclui uma interface web, uma API e um serviço separado de recomendações para gestores.

## Tecnologias

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## Funcionalidades

- Cadastro de estabelecimento e login de usuários.
- Gerenciamento de funcionários, eventos e tipos de ingresso.
- Venda e consulta de ingressos, com possibilidade de estorno.
- Recomendações para gestores, servidas por um processo separado.
- Interface web para eventos, PDV e dados do estabelecimento.
- Isolamento dos dados por estabelecimento.

## Tecnologias usadas

- **API:** Node.js, JavaScript, Express, PostgreSQL, Prisma e Zod.
- **Interface:** React, TypeScript, Redux Toolkit e Vite.
- **Autenticação e proteção:** JWT, bcryptjs, Helmet, CORS e express-rate-limit.
- **Testes da API:** executor nativo do Node.js (`node --test`).

## Como rodar localmente

### Pré-requisitos

- Node.js 20.19 ou mais recente e npm.
- PostgreSQL em execução.

### Instalação

Na raiz do projeto, instale as dependências:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Crie `backend/.env` com as configurações abaixo. Substitua os valores de exemplo pelos dados locais do PostgreSQL e por um segredo próprio.

```env
DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/bar_system?schema=public"
JWT_SECRET="substitua-por-um-segredo-com-pelo-menos-16-caracteres"
JWT_EXPIRA_EM="8h"
PORTA=3000
FRONTEND_URL="http://localhost:5563"

# Opcionais: estes são os valores padrão
LOGIN_LIMITE_TENTATIVAS=10
LOGIN_JANELA_MINUTOS=15
PORTA_RECOMENDACOES=3001
```

Prepare o banco e carregue os dados de exemplo, se desejar:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### Inicialização

Inicie cada processo em um terminal separado:

```bash
# Terminal 1: API
cd backend
npm run dev
```

```bash
# Terminal 2: recomendações (opcional)
cd backend
npm run recomendacoes:dev
```

```bash
# Terminal 3: interface
cd frontend
npm run dev
```

A interface fica em `http://localhost:5563`; a API, em `http://localhost:3000`. Para executar os testes da API, use `npm test` dentro de `backend/`.

Se a API estiver em outro endereço, crie `frontend/.env` e configure:

```env
VITE_API_URL=http://localhost:3000/v1
```

## Como usar

Verifique se a API está ativa:

```bash
curl http://localhost:3000/v1/saude
```

Faça login para obter um token:

```bash
curl -X POST http://localhost:3000/v1/autenticacao/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@exemplo.com","senha":"sua-senha"}'
```

Use o token retornado para consultar eventos:

```bash
curl http://localhost:3000/v1/eventos \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

O serviço separado de recomendações, quando iniciado, atende gestores em `GET http://localhost:3001/v1/recomendacoes` com o mesmo cabeçalho de autorização.

## Licença

O pacote do backend declara a licença ISC em `backend/package.json`. Não há um arquivo de licença para o repositório completo.
