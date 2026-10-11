# Instruções do Projeto (GitHub Copilot)

> Salvar em `.github/copilot-instructions.md` na raiz do repositório (`dona-bier/`).

## Sobre o produto
MVP acadêmico (Fatec Guaratinguetá) de um SaaS multi-tenant de **Gestão e Inteligência de Clientes** para casas de shows, começando pelo bar Dona Bier.
Centraliza venda de ingressos, jornada/histórico do cliente e dados de consumo vindos de sistemas externos (bar/PDV parceiro), e transforma isso em KPIs, segmentação e recomendações para o gestor.
O diferencial é BI + CRM + jornada do cliente; a venda de ingressos é apenas parte do sistema.

## Perfil de quem desenvolve (IMPORTANTE)
O desenvolvedor está **aprendendo as tecnologias enquanto constrói**. Portanto:
- Prefira soluções **simples, diretas e fáceis de entender**. Nada de abstrações, padrões ou camadas desnecessárias.
- **Não adicione tecnologias, bibliotecas ou ferramentas que não estejam na lista abaixo.** Se achar que precisa de uma nova, pare e pergunte, explicando o motivo.
- Ao final de cada tarefa, escreva no chat uma explicação curta, em português e em linguagem simples, dos **conceitos novos usados** (ex.: "o que é middleware", "o que é transação") e como testar.
- Código curto e legível vale mais do que código "elegante".

## Stack do back-end (lista fechada)
- **Node.js 20+** com **JavaScript** (módulos ES: `import`/`export`, `"type": "module"`)
- **Express** (servidor e rotas)
- **PostgreSQL** + **Prisma** (acesso ao banco e migrations)
- **Zod** (validação dos dados recebidos)
- **jsonwebtoken** (login com JWT) e **bcryptjs** (hash de senha)
- **helmet** (cabeçalhos de segurança), **cors** e **express-rate-limit** (limite de requisições)
- **Testes:** apenas o executor nativo do Node (`node --test`), sem biblioteca extra
- Variáveis de ambiente: arquivo `.env` carregado com `node --env-file=.env`

**Fora da stack (não usar, não sugerir):** TypeScript, NestJS, Redis, filas/jobs em background, Docker, WebSocket, Swagger, QR Code, bibliotecas de log, ORMs diferentes do Prisma.
Processamentos que seriam "em background" são feitos **na própria requisição** ou **sob demanda** (quando o gestor pede).

## Estrutura do repositório (monorepo)
```
dona-bier/
├── .github/copilot-instructions.md   # este arquivo
├── frontend/                          # interface web (design feito no Framer AI) - só mexa quando o prompt pedir para ligar o front à API
└── backend/                           # API (Node.js) - todo o trabalho acontece aqui
```
- Todo código novo fica **dentro de `backend/`**. Só altere `frontend/` quando o prompt pedir explicitamente para LIGAR O FRONT À API; nesse caso mexa apenas em `frontend/` e não toque em `backend/`. Nas demais tarefas, nunca altere `frontend/`.
- Comandos (`npm install`, `npm run dev`, `npx prisma ...`) são executados dentro de `backend/`.
- A API permite CORS apenas para a origem do frontend (variável `FRONTEND_URL`).

## Estrutura de pastas (dentro de `backend/`)
```
backend/
  prisma/
    schema.prisma
    seed.js
  src/
    app.js                  # monta o Express (middlewares e rotas)
    servidor.js             # sobe o servidor
    configuracao/           # leitura e validação do .env
    banco/                  # instância única do Prisma
    middlewares/            # autenticacao, perfis, apiKey, tratamentoErros, validacao
    utilitarios/            # funções auxiliares (cpf, datas, erros)
    modulos/
      autenticacao/
      estabelecimentos/
      eventos/
      ingressos/            # tipos de ingresso e vendas
      checkin/
      clientes/             # CRM, ficha única, restrições
      integracoes/          # API de ingestão de consumo
      segmentacao/
      kpis/                 # dashboard e curva ABC
      recomendacoes/
  testes/
```
Cada módulo tem 3 arquivos simples: `*.rotas.js` (define as URLs), `*.controlador.js` (recebe a requisição e responde) e `*.servico.js` (regra de negócio e acesso ao banco). A validação com Zod fica em `*.validacao.js`. O controlador não contém regra de negócio.

## Regras obrigatórias de segurança e negócio
1. **Multi-tenancy**: todo dado pertence a um `estabelecimento_id`. O `estabelecimento_id` vem SEMPRE do token JWT (ou da API Key), **nunca do body, query ou URL**. Toda consulta ao banco filtra por ele. Nunca retornar dados de outro estabelecimento. Ao buscar por id, sempre buscar por `id` **e** `estabelecimento_id`.
2. **Autorização**: perfis `GESTOR` e `FUNCIONARIO`. Funcionário vende ingresso e faz check-in; gestão (restrições, KPIs, recomendações, configurações) é só do `GESTOR`.
3. **Dinheiro**: usar `Decimal` do Prisma (nunca `Number` com casas decimais para somar valores). Valores em BRL.
4. **Dados pessoais (LGPD)**: CPF é dado sensível. Nunca usar `console.log` com CPF completo (mascarar `***.123.456-**`). Nunca retornar `senha_hash` nem `api_key_hash` em respostas.
5. **Segredos**: senhas com `bcryptjs`; API Keys guardadas só com hash (SHA-256). A API Key em texto puro é mostrada uma única vez, na criação. `JWT_SECRET` e demais segredos só no `.env` (que nunca vai para o Git; manter `.env.example` sem valores reais).
6. **Concorrência**: venda de ingresso (estoque do lote) e check-in (ingresso já utilizado) devem ser atômicos, com `prisma.$transaction` e **update condicional** (ex.: `updateMany` com `where: { statusCheckin: 'PENDENTE' }` e conferir quantos registros foram alterados). Nada de "ler e depois gravar" sem proteção.
7. **Idempotência**: a API de ingestão de consumo não pode duplicar transações; `id_transacao_externa` é único por estabelecimento.
8. **Validação**: todo dado recebido (body, query, params) passa por um schema Zod antes de chegar ao serviço. Nunca confiar no que o cliente envia.
9. **Erros**: usar um middleware único de tratamento de erros que responde no formato `{ status, mensagem, detalhes? }` em português. Nunca devolver stack trace ou erro interno do banco para o cliente.
10. **Banco**: toda mudança de schema via migration do Prisma (`npx prisma migrate dev`). Nunca editar o banco na mão. Nunca montar SQL concatenando texto com dados do usuário (use o Prisma; se precisar de SQL cru, use `$queryRaw` com parâmetros).
11. **Login**: mensagem genérica para credencial inválida ("E-mail ou senha incorretos"), sem revelar qual dos dois está errado. Aplicar rate limit mais rígido nas rotas de login.
12. **Testes**: regras críticas (isolamento entre estabelecimentos, estoque, check-in, idempotência) têm teste. Não finalizar uma etapa com testes quebrados.
13. **Código do ingresso**: o ingresso NÃO usa QR Code. Cada venda gera um `codigo_ingresso` de 8 caracteres (maiúsculas e números, sem 0, O, 1 e I), criado no servidor com `crypto.randomInt`, único e nunca sequencial. O check-in é feito digitando esse código (ou buscando o cliente por CPF ou nome).

## Idioma e estilo de código (REGRA FIXA)
Projeto acadêmico brasileiro. Tudo que for escrito por você deve estar em **português do Brasil**:
- **Nomes de variáveis, funções, classes e constantes em português**, em `camelCase` (variáveis/funções), `PascalCase` (classes) e `MAIUSCULAS_COM_UNDERSCORE` (constantes e valores de enum). Exemplos: `valorTotal`, `buscarClientePorCpf()`, `STATUS_CHECKIN.UTILIZADO`, `quantidadeDisponivel`.
- Sem acentos nem `ç` em identificadores (`calcularComissao`, não `calcularComissão`).
- Mantenha em inglês apenas o que é de biblioteca ou convenção técnica obrigatória (`app.use`, `req`, `res`, `next`, `findMany`, `create`, `where`, `$transaction`).
- Nomes de arquivos em português, minúsculos, com ponto separando o papel: `eventos.servico.js`, `eventos.rotas.js`.
- **Comentários em português em todo o código**: use JSDoc (`/** ... */`) em toda função exportada explicando o que faz, os parâmetros e o retorno; comente também trechos de regra de negócio, transações, queries complexas e decisões de segurança, explicando o **porquê** e não só o quê. Não comente o óbvio linha a linha.
- Mensagens de erro, textos de validação, logs e mensagens de commit em português.
- Reutilize exatamente os termos do modelo de dados (`estabelecimento`, `ingresso_tipo`, `codigo_ingresso`...) em vez de criar sinônimos.

## Modelo de dados (resumo)
Tabelas: `estabelecimentos`, `usuarios`, `eventos`, `clientes`, `ingressos_tipos`, `vendas_ingressos`, `vendas_consumo_api`, `recomendacoes_gestao` (mais `restricoes_clientes` e configurações simples, quando as etapas pedirem).
Relações principais: estabelecimento 1:N de tudo; evento 1:N `ingressos_tipos`; `vendas_ingressos` liga evento, tipo de ingresso, cliente e usuário vendedor; `vendas_consumo_api` liga evento e cliente (consumo externo).
Em caso de dúvida sobre o schema, perguntar antes de inventar campos.

## Como trabalhar
- Antes de codar uma tarefa, **apresente um plano curto** (em português) e aguarde confirmação.
- Faça mudanças pequenas e focadas na tarefa pedida. Não refatore código fora do escopo.
- Não instale dependências fora da stack acima sem perguntar.
- Ao terminar cada rota nova, atualize a tabela de rotas do `backend/README.md` (método, URL, perfil, corpo esperado, exemplo de resposta): é o contrato que o front usa.
- Ao terminar: liste os arquivos criados/alterados, explique os conceitos novos em linguagem simples e diga como testar (exemplo de requisição).
