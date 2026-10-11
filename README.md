# bar-system
Projeto acadêmico: sistema de centralização e gestão de bares (Fatec Guaratinguetá).

## Estrutura

```
bar-system/
├── frontend/
└── backend/
```

## Frontend

Interface web do sistema. O design foi criado com o Framer AI.

**Tecnologias**

![HTML](https://img.shields.io/badge/HTML-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Redux](https://img.shields.io/badge/Redux-764ABC?style=for-the-badge&logo=redux&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**Como rodar**

```bash
cd frontend
npm install
npm run dev
```

## Backend

API do sistema, desenvolvida com Node.js, Express, PostgreSQL e Prisma.

**Pré-requisitos**

- Node.js 20 ou mais novo
- Banco de dados PostgreSQL

**Como rodar**

```bash
cd backend
npm install
cp .env.example .env
```

O `.env.example` contém a `DATABASE_URL`. Complete o arquivo `.env` com as outras variáveis obrigatórias:

```env
JWT_SECRET="substitua-por-um-segredo-aleatorio-com-pelo-menos-16-caracteres"
JWT_EXPIRA_EM="8h"
PORTA="3000"
FRONTEND_URL="http://localhost:5173"
```

Substitua o valor de `JWT_SECRET` por um segredo próprio e não envie o `.env` ao GitHub. Depois, crie e popule o banco e inicie a API:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Com `PORTA="3000"`, a API ficará disponível em `http://localhost:3000`. Para verificar se está funcionando, acesse `http://localhost:3000/v1/saude`. Para executar os testes automatizados, use `npm test` dentro de `backend/`.

## Integrantes

- Maria Paula De Carvalho Silva (Frontend)
- Aline Aparecida Da Silva (Backend)
- Murillo Augusto Pereira De Araujo (Backend)
