# Frontend — Backstage

Interface web para gestão de eventos, vendas de ingressos e estabelecimentos. Desenvolvida com React, TypeScript e Vite.

## Requisitos

- Node.js 20 ou mais recente
- API backend em execução para usar login, cadastro e dados

## Instalação e execução

A partir da raiz do repositório:

```bash
cd frontend
npm install
npm run dev
```

O Vite inicia em `http://localhost:5563`. A URL da API padrão é `http://localhost:3000/v1`. Para usar outro endereço, crie `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/v1
```

## Comandos

```bash
npm run dev      # inicia o servidor de desenvolvimento
npm run build    # verifica os tipos e gera a versão de produção
npm run preview  # abre localmente a versão gerada
npm run lint     # verifica problemas no código
```

## Funcionalidades

- Cadastro de estabelecimento e login
- Consulta e gerenciamento de eventos e tipos de ingresso
- Venda de ingressos no PDV
- Consulta e atualização dos dados do estabelecimento

O acesso às telas e ações depende do perfil do usuário. A API valida as permissões e os dados.
