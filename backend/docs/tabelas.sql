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
    codigo_ingresso     TEXT           NOT NULL UNIQUE,   -- código curto digitado no check-in
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
