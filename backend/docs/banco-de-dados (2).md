# Banco de Dados: modelo reestruturado e onde subir
**Sistema de Gestão e Inteligência de Clientes, bar Dona Bier (Fatec Guaratinguetá)**

Este documento acompanha o arquivo `schema.prisma`. Ele explica **o que mudou no seu modelo e por quê**, **onde hospedar o PostgreSQL de graça** e o **passo a passo para colocar tudo de pé**.

---

## 1. Desenho do modelo (diagrama completo)

Cole o bloco abaixo em qualquer visualizador de Mermaid (por exemplo mermaid.live, ou o Mermaid Chart que você já usa) para ver o desenho. No GitHub e no VS Code (com a extensão de Mermaid), ele aparece desenhado automaticamente.
Legenda: **PK** = chave primária, **FK** = chave estrangeira (liga a outra tabela), **UK** = valor único. Os campos marcados como "opcional" podem ficar vazios.

```mermaid
erDiagram
    ESTABELECIMENTOS {
        int id PK
        string nome_fantasia
        string razao_social
        string cnpj UK
        string email_contato
        string api_key_hash UK "opcional, só o hash"
        string api_key_prefixo "opcional"
        datetime criado_em
        datetime atualizado_em
    }
    USUARIOS {
        int id PK
        int estabelecimento_id FK
        string nome
        string cpf "opcional"
        string email UK
        string senha_hash
        enum perfil "GESTOR | FUNCIONARIO"
        boolean ativo
        datetime criado_em
        datetime atualizado_em
    }
    EVENTOS {
        int id PK
        int estabelecimento_id FK
        string nome
        string genero_musical
        string atracoes "opcional"
        datetime data_hora
        int duracao_horas
        enum status "RASCUNHO | ATIVO | ENCERRADO"
        datetime criado_em
        datetime atualizado_em
    }
    CLIENTES {
        int id PK
        int estabelecimento_id FK
        string nome
        string cpf "UK com estabelecimento_id"
        date data_nascimento "opcional"
        string telefone "opcional"
        string email "opcional"
        datetime criado_em
        datetime atualizado_em
    }
    RESTRICOES_CLIENTES {
        int id PK
        int estabelecimento_id FK
        int cliente_id FK
        enum tipo "DEBITO | COMPORTAMENTO | OUTRO"
        string descricao
        boolean bloqueia_entrada
        enum status "ATIVA | RESOLVIDA"
        int criado_por_id FK
        datetime criado_em
        int resolvido_por_id FK "opcional"
        datetime resolvido_em "opcional"
    }
    INGRESSOS_TIPOS {
        int id PK
        int estabelecimento_id FK
        int evento_id FK
        string nome
        decimal preco
        int quantidade_disponivel
        datetime criado_em
        datetime atualizado_em
    }
    VENDAS_INGRESSOS {
        int id PK
        int estabelecimento_id FK
        int evento_id FK
        int ingresso_tipo_id FK
        int cliente_id FK "opcional"
        int usuario_vendedor_id FK
        string codigo_qr UK
        decimal valor_pago
        enum status_venda "CONFIRMADA | ESTORNADA"
        datetime estornada_em "opcional"
        enum status_checkin "PENDENTE | UTILIZADO"
        datetime checkin_em "opcional"
        int checkin_por_id FK "opcional"
        datetime criado_em
        datetime atualizado_em
    }
    VENDAS_CONSUMO_API {
        int id PK
        int estabelecimento_id FK
        int evento_id FK "opcional"
        int cliente_id FK "opcional"
        string id_transacao_externa "UK com estabelecimento_id"
        decimal valor_total
        datetime data_hora_transacao
        json itens "opcional"
        json payload_original
        datetime criado_em
    }
    RECOMENDACOES_GESTAO {
        int id PK
        int estabelecimento_id FK
        enum tipo_insight "PROGRAMACAO | PRECIFICACAO | RECUPERACAO_CLIENTES | CONSUMO"
        string titulo
        string descricao
        int prioridade "1 alta, 2 media, 3 baixa"
        json dados_suporte "opcional"
        enum status "NOVA | VISTA | APLICADA | DESCARTADA"
        datetime criado_em
        datetime atualizado_em
    }

    ESTABELECIMENTOS ||--o{ USUARIOS : "cadastra funcionarios"
    ESTABELECIMENTOS ||--o{ EVENTOS : "organiza"
    ESTABELECIMENTOS ||--o{ CLIENTES : "possui base de"
    ESTABELECIMENTOS ||--o{ RECOMENDACOES_GESTAO : "gera insights"
    EVENTOS ||--o{ INGRESSOS_TIPOS : "tem lotes"
    INGRESSOS_TIPOS ||--o{ VENDAS_INGRESSOS : "define categoria"
    EVENTOS ||--o{ VENDAS_INGRESSOS : "pertence"
    CLIENTES |o--o{ VENDAS_INGRESSOS : "compra"
    USUARIOS ||--o{ VENDAS_INGRESSOS : "vende na portaria"
    USUARIOS |o--o{ VENDAS_INGRESSOS : "faz o check-in"
    EVENTOS |o--o{ VENDAS_CONSUMO_API : "associa consumo"
    CLIENTES |o--o{ VENDAS_CONSUMO_API : "consome"
    CLIENTES ||--o{ RESTRICOES_CLIENTES : "pode ter"
    USUARIOS ||--o{ RESTRICOES_CLIENTES : "cria e resolve"
```

Todas as tabelas de negócio também ligam ao `ESTABELECIMENTOS` pela coluna `estabelecimento_id` (para não poluir o desenho, só as ligações principais foram traçadas). Essa coluna mantém os dados de uma casa de shows separados dos de outra (multi-tenant) e é a regra de ouro do back-end: **toda consulta filtra por ela**.

### Como ler o desenho
- `||--o{` significa "um para muitos": um estabelecimento tem vários eventos, mas cada evento é de um só estabelecimento.
- `|o--o{` significa "um opcional para muitos": uma venda de ingresso pode existir sem cliente cadastrado.

---

## 2. O que mudou em relação ao seu diagrama (e por quê)

| Tabela | O que mudou | Por quê |
|---|---|---|
| `estabelecimentos` | `api_key_consumo` virou `api_key_hash` + `api_key_prefixo`; novo `email_contato` | Nunca se guarda uma chave de acesso em texto puro. Se o banco vazar, o hash não serve para nada. O prefixo só serve para o gestor reconhecer qual chave é qual |
| `usuarios` | novos `senha_hash` e `criado_em`/`atualizado_em`; `email` único no sistema inteiro; `cpf` opcional | O diagrama não tinha onde guardar a senha. O login usa só o e-mail, então ele não pode se repetir entre casas |
| `eventos` | novo `status` (RASCUNHO, ATIVO, ENCERRADO) e `duracao_horas` | A US05 fala em "evento ativo", então isso precisa existir. A duração ajuda a descobrir a qual evento pertence um consumo que chegou sem evento informado |
| `clientes` | CPF **único por estabelecimento**; novos `telefone` e `email` (opcionais); `observacao_restricao` saiu | É a "identidade única" da US06. Telefone e e-mail preparam o envio de promoções. As restrições ganharam uma tabela própria (abaixo) |
| `restricoes_clientes` (**nova**) | tipo, descrição, se bloqueia a entrada, status, quem criou, quem resolveu, datas | Um único campo de texto não guarda histórico nem permite saber quem marcou o cliente. Com a tabela, a restrição resolvida fica registrada e o check-in consegue barrar só quando `bloqueia_entrada = true` |
| `ingressos_tipos` | novo `estabelecimento_id` (repetido de propósito) | Toda consulta pode filtrar direto por estabelecimento, sem JOIN. Reduz o risco de vazar dado de outra casa |
| `vendas_ingressos` | `cliente_id` opcional; novos `status_venda` (CONFIRMADA/ESTORNADA), `estornada_em`, `checkin_em`, `checkin_por_id`; `status_checkin` virou enum | Venda na porta pode ser sem cadastro. Estorno não apaga a venda, só muda o status. O check-in registra quando e por quem foi feito |
| `vendas_consumo_api` | `cliente_id` e `evento_id` opcionais; novos `data_hora_transacao`, `itens` (JSON) e `payload_original` (JSON); único `(estabelecimento_id, id_transacao_externa)` | O consumo do bar pode chegar sem CPF ou sem evento, e o cruzamento tenta ligar depois. O horário serve para achar o evento. O par único impede a mesma venda de entrar duas vezes. O JSON original fica para auditoria |
| `recomendacoes_gestao` | novos `prioridade`, `dados_suporte` (JSON), `status` | O gestor precisa ver os números que justificam a sugestão e marcar se aplicou ou descartou |
| **todas** | `criado_em` e `atualizado_em` | Sem data não existe KPI por período, série temporal nem auditoria |

### Decisões que vale você entender
- **Dinheiro em `Decimal(12,2)`**, nunca `Float`. Números decimais comuns erram na soma (0,1 + 0,2 não dá exatamente 0,3), e dinheiro não pode errar.
- **Enums** (listas fechadas de valores) para perfil, status e tipos. O banco recusa um valor inventado, o que evita bugs.
- **Índices** começando por `estabelecimento_id`: quase toda consulta do sistema filtra por ele, então o banco já fica rápido onde mais importa.
- **Nomes em português no código, snake_case no banco**: o `@map` e o `@@map` fazem o Prisma traduzir `estabelecimentoId` (código) para `estabelecimento_id` (coluna), como no seu diagrama.

### O que ficou de fora de propósito (MVP)
- **Tabela de campanhas/promoções:** o sistema segmenta o público e entrega a lista de quem receber a ação. O envio em si (e-mail, WhatsApp) fica para uma versão futura.
- **Itens de consumo em tabela própria:** os itens vêm como JSON dentro de `vendas_consumo_api`. É mais simples e suficiente para os KPIs do MVP.
- **Compra de ingresso online pelo cliente final:** o modelo já aguenta (venda sem `usuario_vendedor` humano exigiria um ajuste), mas as user stories atuais cobrem o PDV de portaria. Se o site de venda entrar no escopo, me avise que eu adapto `usuario_vendedor_id` para opcional e adiciono canal de venda.

---

## 3. Onde subir o banco

Você precisa de um **PostgreSQL** acessível pela sua API. Para um projeto acadêmico, as opções realistas são:

| Opção | Custo | Prós | Contras |
|---|---|---|---|
| **Neon** (recomendada) | Plano gratuito sem cartão | Só banco, sem extras para aprender; Postgres padrão; várias bases de graça (dev e teste); funciona direto com Prisma | O banco "dorme" após alguns minutos parado, e a primeira consulta depois disso demora um pouco mais; há cotas mensais de uso |
| **Supabase** | Plano gratuito | Interface boa para ver as tabelas; Postgres padrão | Tem muita coisa que você não vai usar (Auth, Storage...); no plano gratuito o projeto **pausa após 1 semana sem uso** e precisa ser reativado, o que é arriscado perto da apresentação |
| **PostgreSQL local** | Grátis | Sem limite, sem internet, sem pausa | Só funciona na sua máquina; cada pessoa do grupo precisa do seu; não dá para o grupo compartilhar os mesmos dados |
| **Aiven** | Plano gratuito | Mais espaço de armazenamento | Configuração menos amigável para iniciante |
| **Render (banco grátis)** | - | - | O banco gratuito é apagado após 30 dias. **Evite** |

> **Valores e limites mudam com frequência.** Na minha pesquisa de hoje, o Neon gratuito oferecia 100 CU-horas de computação por mês por projeto e armazenamento de 0,5 GB (com notícias de que passou para 1 GB em outubro de 2026), suspendendo a computação após 5 minutos sem uso; o Supabase gratuito oferecia 500 MB por projeto e pausa após 1 semana sem atividade. Confira os números atuais nas páginas oficiais antes de decidir: neon.com/pricing e supabase.com/pricing. Para o volume de dados de um MVP acadêmico, qualquer um dos dois sobra com folga.

### Minha recomendação
1. **Desenvolvimento:** Neon (um projeto chamado `dona-bier-dev`), ou PostgreSQL local se você preferir trabalhar offline.
2. **Testes automáticos:** um segundo projeto no Neon (`dona-bier-teste`), para os testes nunca mexerem nos dados que você usa para desenvolver.
3. **Apresentação:** o mesmo Neon do desenvolvimento, com o seed carregado.

Se o grupo trabalha em várias pessoas, usem **um banco Neon em comum** (cada um com a mesma `DATABASE_URL` no seu `.env`) ou, melhor, **cada um com o seu** e todo mundo roda o mesmo `seed`. Assim ninguém atrapalha o outro.

---

## 4. Passo a passo com Neon

1. Acesse **neon.com**, crie a conta (pode entrar com o GitHub) e crie um **projeto** com o nome `dona-bier-dev`.
2. Na escolha da **região**, prefira a mais próxima do Brasil (São Paulo, se estiver disponível). Isso diminui a latência.
3. Na tela do projeto, clique em **Connect** (ou "Connection details") e copie a **connection string**.
   - Escolha a conexão **direta** (desligue a opção *Pooled connection*, se ela estiver ligada). A conexão com pool atrapalha as migrations do Prisma, e o seu volume de acesso não precisa dela.
   - Ela tem este formato (exemplo, não use este valor):
     `postgresql://usuario:senha@ep-xxxxxx.regiao.aws.neon.tech/nomedobanco?sslmode=require`
4. No seu projeto, abra `backend/.env` e cole a string:
   ```
   DATABASE_URL="postgresql://usuario:senha@ep-xxxxxx.regiao.aws.neon.tech/nomedobanco?sslmode=require"
   ```
   Se a **senha tiver caracteres especiais** (`@`, `#`, `/`, `:`), eles precisam ser codificados na URL (ex.: `@` vira `%40`). O mais fácil é gerar uma senha só com letras e números.
5. Confira que o `.env` está no `.gitignore` e que **nunca** foi para o GitHub. A `DATABASE_URL` é uma senha.
6. Copie o `schema.prisma` para `backend/prisma/schema.prisma`.
7. Dentro de `backend/`, rode:
   ```bash
   npx prisma validate          # confere se o schema está correto
   npx prisma format            # organiza a formatação
   npx prisma migrate dev --name inicial   # cria as tabelas no banco
   npx prisma db seed           # popula com dados de exemplo (depois da etapa 2 do roteiro)
   npx prisma studio            # abre uma interface no navegador para ver as tabelas
   ```
8. No painel do Neon, aba **Tables**, as tabelas devem aparecer. Compare com o diagrama da seção 1.

### Alternativa: PostgreSQL local
1. Instale o PostgreSQL pelo instalador oficial (postgresql.org/download) e guarde a senha do usuário `postgres`.
2. Crie o banco, pelo pgAdmin ou pelo terminal: `createdb dona_bier_dev`.
3. No `.env`:
   ```
   DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/dona_bier_dev"
   ```
4. Siga a partir do passo 6 acima.

---

## 5. Problemas comuns

| Erro | Provável causa e solução |
|---|---|
| `P1001: Can't reach database server` | URL errada, sem internet, ou o banco do Neon acordando. Tente de novo em alguns segundos e confira o host na string |
| `P1000: Authentication failed` | Senha errada ou com caractere especial sem codificar |
| `P1012` ao validar o schema | Erro de sintaxe no `schema.prisma`; a mensagem indica a linha. Se você mexeu no arquivo, volte à versão original |
| `Environment variable not found: DATABASE_URL` | O comando do Prisma não achou o `.env`. Rode dentro de `backend/`, onde está o arquivo |
| Primeira requisição lenta no Neon | O banco estava suspenso por inatividade. É normal; as seguintes são rápidas |
| `relation ... does not exist` | A migration não foi aplicada nesse banco. Rode `npx prisma migrate dev` |

---

## 6. Cuidados com os dados

- **Nunca** coloque a `DATABASE_URL` no código, no README ou em print. Se vazar, troque a senha no painel do Neon e atualize o `.env`.
- Use **dados fictícios** no seed e nos testes. CPF de gente real é dado pessoal (LGPD).
- Gere CPFs de teste válidos com um gerador online, em vez de usar o seu ou o de conhecidos.
- Planos gratuitos têm backup limitado. Antes de uma entrega importante, exporte uma cópia: `pg_dump "SUA_DATABASE_URL" > backup.sql`.
- **Antes da apresentação**, acesse a API uma vez (`GET /v1/saude` e uma rota que consulte o banco) para o banco estar "acordado" quando a banca olhar.
- A API também precisa rodar em algum lugar. Para a apresentação, pode rodar na sua máquina (`npm run dev`) apontando para o banco do Neon. Hospedar a API na internet é um passo opcional, que podemos planejar depois.

---

## Anexo: código das tabelas (SQL)

O mesmo modelo, escrito em SQL para PostgreSQL. Está também no arquivo `tabelas.sql`.
Use para **estudar** o que o Prisma cria por baixo dos panos ou para montar o banco à mão. No projeto, o caminho oficial é o `npx prisma migrate dev`: **não rode os dois no mesmo banco**.
Testei este SQL num PostgreSQL de teste: as 9 tabelas são criadas sem erro, o CPF repetido no mesmo estabelecimento é recusado e a mesma `id_transacao_externa` não entra duas vezes.

```sql
-- ============================================================================
-- Código SQL das tabelas - Sistema Dona Bier (PostgreSQL)
--
-- ATENÇÃO: este arquivo é para CONSULTA e ESTUDO (e para quem quiser criar o
-- banco sem o Prisma). No projeto, as tabelas são criadas pelo Prisma com
-- `npx prisma migrate dev`, a partir do schema.prisma. NÃO rode os dois no
-- mesmo banco, senão as tabelas serão criadas duas vezes.
--
-- Os nomes seguem o diagrama: tabelas e colunas em snake_case.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TIPOS ENUMERADOS (listas fechadas de valores permitidos)
-- ---------------------------------------------------------------------------
CREATE TYPE perfil_usuario      AS ENUM ('GESTOR', 'FUNCIONARIO');
CREATE TYPE status_evento       AS ENUM ('RASCUNHO', 'ATIVO', 'ENCERRADO');
CREATE TYPE status_venda        AS ENUM ('CONFIRMADA', 'ESTORNADA');
CREATE TYPE status_checkin      AS ENUM ('PENDENTE', 'UTILIZADO');
CREATE TYPE tipo_restricao      AS ENUM ('DEBITO', 'COMPORTAMENTO', 'OUTRO');
CREATE TYPE status_restricao    AS ENUM ('ATIVA', 'RESOLVIDA');
CREATE TYPE tipo_insight        AS ENUM ('PROGRAMACAO', 'PRECIFICACAO', 'RECUPERACAO_CLIENTES', 'CONSUMO');
CREATE TYPE status_recomendacao AS ENUM ('NOVA', 'VISTA', 'APLICADA', 'DESCARTADA');

-- ---------------------------------------------------------------------------
-- ESTABELECIMENTOS (a casa de shows; "cliente" do SaaS)
-- ---------------------------------------------------------------------------
CREATE TABLE estabelecimentos (
    id              SERIAL PRIMARY KEY,
    nome_fantasia   TEXT          NOT NULL,
    razao_social    TEXT          NOT NULL,
    cnpj            TEXT          NOT NULL UNIQUE,
    email_contato   TEXT          NOT NULL,
    api_key_hash    TEXT          UNIQUE,          -- só o hash SHA-256 da chave
    api_key_prefixo TEXT,                          -- primeiros caracteres, para identificar
    criado_em       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- USUARIOS (gestores e funcionários)
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id                 SERIAL PRIMARY KEY,
    estabelecimento_id INTEGER        NOT NULL REFERENCES estabelecimentos (id),
    nome               TEXT           NOT NULL,
    cpf                TEXT,
    email              TEXT           NOT NULL UNIQUE,   -- usado no login
    senha_hash         TEXT           NOT NULL,
    perfil             perfil_usuario NOT NULL,
    ativo              BOOLEAN        NOT NULL DEFAULT TRUE,
    criado_em          TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_usuarios_estabelecimento ON usuarios (estabelecimento_id);

-- ---------------------------------------------------------------------------
-- EVENTOS (shows e noites da casa)
-- ---------------------------------------------------------------------------
CREATE TABLE eventos (
    id                 SERIAL PRIMARY KEY,
    estabelecimento_id INTEGER       NOT NULL REFERENCES estabelecimentos (id),
    nome               TEXT          NOT NULL,
    genero_musical     TEXT          NOT NULL,
    atracoes           TEXT,
    data_hora          TIMESTAMP(3)  NOT NULL,
    duracao_horas      INTEGER       NOT NULL DEFAULT 12,
    status             status_evento NOT NULL DEFAULT 'RASCUNHO',
    criado_em          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_eventos_estab_data   ON eventos (estabelecimento_id, data_hora);
CREATE INDEX idx_eventos_estab_status ON eventos (estabelecimento_id, status);

-- ---------------------------------------------------------------------------
-- CLIENTES (identidade única do frequentador, por estabelecimento)
-- ---------------------------------------------------------------------------
CREATE TABLE clientes (
    id                 SERIAL PRIMARY KEY,
    estabelecimento_id INTEGER      NOT NULL REFERENCES estabelecimentos (id),
    nome               TEXT         NOT NULL,
    cpf                TEXT         NOT NULL,
    data_nascimento    DATE,
    telefone           TEXT,
    email              TEXT,
    criado_em          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_clientes_estab_cpf UNIQUE (estabelecimento_id, cpf)
);
CREATE INDEX idx_clientes_estab_nome ON clientes (estabelecimento_id, nome);

-- ---------------------------------------------------------------------------
-- RESTRICOES_CLIENTES (pendências, débitos, comportamento)
-- ---------------------------------------------------------------------------
CREATE TABLE restricoes_clientes (
    id                 SERIAL PRIMARY KEY,
    estabelecimento_id INTEGER          NOT NULL REFERENCES estabelecimentos (id),
    cliente_id         INTEGER          NOT NULL REFERENCES clientes (id),
    tipo               tipo_restricao   NOT NULL,
    descricao          TEXT             NOT NULL,
    bloqueia_entrada   BOOLEAN          NOT NULL DEFAULT FALSE,
    status             status_restricao NOT NULL DEFAULT 'ATIVA',
    criado_por_id      INTEGER          NOT NULL REFERENCES usuarios (id),
    criado_em          TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvido_por_id   INTEGER          REFERENCES usuarios (id),
    resolvido_em       TIMESTAMP(3)
);
CREATE INDEX idx_restricoes_estab_cliente_status
    ON restricoes_clientes (estabelecimento_id, cliente_id, status);

-- ---------------------------------------------------------------------------
-- INGRESSOS_TIPOS (lotes e categorias de ingresso de cada evento)
-- ---------------------------------------------------------------------------
CREATE TABLE ingressos_tipos (
    id                    SERIAL PRIMARY KEY,
    estabelecimento_id    INTEGER       NOT NULL REFERENCES estabelecimentos (id),
    evento_id             INTEGER       NOT NULL REFERENCES eventos (id),
    nome                  TEXT          NOT NULL,
    preco                 NUMERIC(12,2) NOT NULL,
    quantidade_disponivel INTEGER       NOT NULL,
    criado_em             TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ingressos_tipos_estab_evento ON ingressos_tipos (estabelecimento_id, evento_id);

-- ---------------------------------------------------------------------------
-- VENDAS_INGRESSOS (cada linha é um ingresso vendido)
-- ---------------------------------------------------------------------------
CREATE TABLE vendas_ingressos (
    id                  SERIAL PRIMARY KEY,
    estabelecimento_id  INTEGER        NOT NULL REFERENCES estabelecimentos (id),
    evento_id           INTEGER        NOT NULL REFERENCES eventos (id),
    ingresso_tipo_id    INTEGER        NOT NULL REFERENCES ingressos_tipos (id),
    cliente_id          INTEGER        REFERENCES clientes (id),   -- opcional
    usuario_vendedor_id INTEGER        NOT NULL REFERENCES usuarios (id),
    codigo_qr           TEXT           NOT NULL UNIQUE,
    valor_pago          NUMERIC(12,2)  NOT NULL,
    status_venda        status_venda   NOT NULL DEFAULT 'CONFIRMADA',
    estornada_em        TIMESTAMP(3),
    status_checkin      status_checkin NOT NULL DEFAULT 'PENDENTE',
    checkin_em          TIMESTAMP(3),
    checkin_por_id      INTEGER        REFERENCES usuarios (id),
    criado_em           TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_vendas_ing_estab_evento  ON vendas_ingressos (estabelecimento_id, evento_id);
CREATE INDEX idx_vendas_ing_estab_cliente ON vendas_ingressos (estabelecimento_id, cliente_id);
CREATE INDEX idx_vendas_ing_estab_criado  ON vendas_ingressos (estabelecimento_id, criado_em);

-- ---------------------------------------------------------------------------
-- VENDAS_CONSUMO_API (consumo do bar/PDV externo recebido pela API)
-- ---------------------------------------------------------------------------
CREATE TABLE vendas_consumo_api (
    id                   SERIAL PRIMARY KEY,
    estabelecimento_id   INTEGER       NOT NULL REFERENCES estabelecimentos (id),
    evento_id            INTEGER       REFERENCES eventos (id),    -- preenchido pelo cruzamento
    cliente_id           INTEGER       REFERENCES clientes (id),   -- preenchido pelo cruzamento
    id_transacao_externa TEXT          NOT NULL,
    valor_total          NUMERIC(12,2) NOT NULL,
    data_hora_transacao  TIMESTAMP(3)  NOT NULL,
    itens                JSONB,
    payload_original     JSONB         NOT NULL,
    criado_em            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- impede a mesma venda externa de entrar duas vezes (idempotência)
    CONSTRAINT uq_consumo_estab_transacao UNIQUE (estabelecimento_id, id_transacao_externa)
);
CREATE INDEX idx_consumo_estab_evento  ON vendas_consumo_api (estabelecimento_id, evento_id);
CREATE INDEX idx_consumo_estab_cliente ON vendas_consumo_api (estabelecimento_id, cliente_id);
CREATE INDEX idx_consumo_estab_data    ON vendas_consumo_api (estabelecimento_id, data_hora_transacao);

-- ---------------------------------------------------------------------------
-- RECOMENDACOES_GESTAO (sugestões automáticas para o gestor)
-- ---------------------------------------------------------------------------
CREATE TABLE recomendacoes_gestao (
    id                 SERIAL PRIMARY KEY,
    estabelecimento_id INTEGER             NOT NULL REFERENCES estabelecimentos (id),
    tipo_insight       tipo_insight        NOT NULL,
    titulo             TEXT                NOT NULL,
    descricao          TEXT                NOT NULL,
    prioridade         INTEGER             NOT NULL DEFAULT 2,   -- 1 alta, 2 média, 3 baixa
    dados_suporte      JSONB,
    status             status_recomendacao NOT NULL DEFAULT 'NOVA',
    criado_em          TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em      TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_recomendacoes_estab_status ON recomendacoes_gestao (estabelecimento_id, status);
```

---

## Fontes consultadas
- Neon: neon.com/pricing (planos e limites do plano gratuito) e comparativos de preço de 2026
- Supabase: supabase.com/pricing e guias de limites do plano gratuito de 2026
- Comparativo de hospedagens gratuitas de PostgreSQL em 2026 (Neon, Supabase, Aiven, Render)
