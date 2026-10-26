# Dona Bier - Frontend

Interface web do sistema de gestão centralizada do bar Dona Bier. O design foi criado com o Framer AI.

## Tecnologias

<p>
  <img src="https://skillicons.dev/icons?i=html,css,js,ts,react,redux,vite" alt="HTML, CSS, JavaScript, TypeScript, React, Redux e Vite" />
</p>

- HTML, CSS e JavaScript
- React
- TypeScript
- Redux
- Vite

## Como rodar

Pré-requisito: [Node.js](https://nodejs.org) instalado.

```bash
npm install
npm run dev
```

O projeto abre em `http://localhost:5563`.

Para conectar o cadastro e o login à API local, deixe o back-end rodando em
`http://localhost:3000`. Outro endereço pode ser informado pela variável
`VITE_API_URL`, incluindo o prefixo `/v1` (por exemplo,
`VITE_API_URL=http://localhost:3000/v1`).

## Build de produção

```bash
npm run build
npm run preview
```

## Fluxo de trabalho

- Crie sua branch a partir da `develop`.
- Envie as alterações por Pull Request.
- A `main` recebe código apenas da `develop`.
