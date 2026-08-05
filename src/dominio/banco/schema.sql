-- ============================================================
--  ESQUEMA — PLENA CONTÁBIL
-- ============================================================
--  Postgres (Neon). Idempotente: rodar de novo não duplica nem apaga.
--
--  Convenções deste esquema, e o motivo de cada uma:
--
--  1. `text` em vez de `varchar(n)`. Em Postgres não há ganho de desempenho
--     no limite, e limite errado vira migração depois. Onde o domínio tem
--     lista fechada, usamos CHECK, que é explícito e aparece no erro.
--
--  2. Documento e valor monetário são `text` e `bigint` respectivamente.
--     CNPJ/CPF guardam SÓ DÍGITOS (formatar é da apresentação), e dinheiro
--     é centavo inteiro — `numeric` seria correto também, mas o código já
--     trabalha em centavos desde o kernel/br.ts e converter nas bordas
--     criaria dois lugares para errar.
--
--  3. `null` significa "ainda não informado", nunca "não se aplica" e nunca
--     zero. É a mesma regra que já vale em src/dominio/tipos.ts, e é o que
--     permite a tela distinguir cadastro incompleto de cadastro vazio.
--
--  4. Nada de DELETE em cliente e processo. Encerrar é estado, não sumiço:
--     quem concluiu uma abertura de empresa ainda precisa achar aquilo
--     depois.
-- ============================================================

-- ---------- Acesso ----------
-- Uma linha por pessoa que entra no sistema. Hoje é a contadora; amanhã pode
-- ser a equipe. Senha NUNCA em texto: `senha_hash` guarda scrypt e `senha_salt`
-- o sal por usuário. Ver src/dominio/banco/senha.ts.
CREATE TABLE IF NOT EXISTS usuarios (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  nome          text NOT NULL,
  senha_hash    text NOT NULL,
  senha_salt    text NOT NULL,
  papel         text NOT NULL DEFAULT 'escritorio'
                CHECK (papel IN ('escritorio', 'cliente')),
  -- Preenchido só quando papel = 'cliente': a qual cliente da carteira a
  -- pessoa tem acesso. Escritório vê tudo, cliente vê o próprio.
  cliente_id    text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  ultimo_acesso timestamptz
);

-- Sessão em tabela, não em JWT assinado. Motivo: com tabela dá para revogar
-- de verdade (basta apagar a linha). JWT só expira, e "sair de todos os
-- dispositivos" vira impossível sem uma lista de revogação — que é esta
-- tabela, só que com passos a mais.
CREATE TABLE IF NOT EXISTS sessoes (
  token      text PRIMARY KEY,
  usuario_id text NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criada_em  timestamptz NOT NULL DEFAULT now(),
  expira_em  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira  ON sessoes(expira_em);

-- ---------- Carteira ----------
CREATE TABLE IF NOT EXISTS clientes (
  id                text PRIMARY KEY,
  razao_social      text,
  nome_fantasia     text NOT NULL,
  tipo_pessoa       text NOT NULL CHECK (tipo_pessoa IN ('PJ', 'PF')),
  cnpj              text,
  cpf               text,
  atividade         text,
  natureza_juridica text,
  porte             text,
  regime            text,
  status            text NOT NULL DEFAULT 'pendente'
                    CHECK (status IN ('ativo', 'pendente', 'inativo')),
  -- Arrays nativos do Postgres. O domínio já trata os dois como lista, e
  -- tabela de junção para um enum pequeno seria cerimônia sem ganho.
  atendimentos      text[] NOT NULL DEFAULT '{}',
  servicos          text[] NOT NULL DEFAULT '{}',
  responsavel       text,
  email             text,
  telefone          text,
  cliente_desde     date,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

-- Índices parciais: CNPJ e CPF são únicos quando existem, e nulo não colide
-- com nulo. Sem o WHERE, dois cadastros incompletos (ambos sem CNPJ) seriam
-- tratados como duplicata — e cadastro incompleto é a regra, não a exceção.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cnpj
  ON clientes(cnpj) WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cpf
  ON clientes(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_regime ON clientes(regime);

-- ---------- Trabalho com começo, meio e fim ----------
CREATE TABLE IF NOT EXISTS processos (
  id           text PRIMARY KEY,
  cliente_id   text NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  tipo         text NOT NULL,
  titulo       text NOT NULL,
  aberto_em    date NOT NULL,
  prazo        date,
  encerrado_em date,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_processos_cliente ON processos(cliente_id);
-- Índice parcial: a pergunta feita o tempo todo é "o que está em aberto".
CREATE INDEX IF NOT EXISTS idx_processos_abertos
  ON processos(cliente_id) WHERE encerrado_em IS NULL;

CREATE TABLE IF NOT EXISTS etapas_processo (
  id                text PRIMARY KEY,
  processo_id       text NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  ordem             integer NOT NULL,
  rotulo            text NOT NULL,
  status            text NOT NULL DEFAULT 'nao-iniciada'
                    CHECK (status IN ('concluida', 'em-andamento', 'bloqueada', 'nao-iniciada')),
  observacao        text,
  -- Falso significa "estimativa": a contadora informou o escopo, não onde
  -- cada frente parou. A tela avisa quando é estimativa, e é isso que impede
  -- o sistema de apresentar chute como fato.
  status_confirmado boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_etapas_processo ON etapas_processo(processo_id, ordem);

-- ---------- O que se repete e tem prazo legal ----------
-- É o irmão do processo: obrigação volta todo mês/ano e tem vencimento
-- definido por lei; processo acontece uma vez e tem etapa.
CREATE TABLE IF NOT EXISTS obrigacoes (
  id             text PRIMARY KEY,
  cliente_id     text NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  sigla          text NOT NULL,
  descricao      text NOT NULL,
  -- Mês de apuração no formato YYYY-MM. NÃO confundir com vencimento: a
  -- competência 2026-01 costuma vencer em 2026-02, e tratar os dois como a
  -- mesma coisa é o erro clássico deste domínio.
  competencia    text NOT NULL,
  vencimento     date NOT NULL,
  valor_centavos bigint,
  status         text NOT NULL DEFAULT 'a-vencer'
                 CHECK (status IN ('pago', 'a-vencer', 'vence-hoje', 'atrasado')),
  pago_em        date,
  -- Quando o aviso ao cliente foi efetivamente enviado. Nulo = não avisado.
  -- É o que a contadora pediu: saber o que vence PARA informar o cliente.
  avisado_em     timestamptz,
  observacao     text,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);
-- A mesma obrigação, do mesmo cliente, na mesma competência, existe uma vez.
-- É esta restrição que impede o gerador de calendário de duplicar guia ao
-- rodar duas vezes no mesmo mês.
CREATE UNIQUE INDEX IF NOT EXISTS idx_obrigacoes_unica
  ON obrigacoes(cliente_id, sigla, competencia);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_vencimento ON obrigacoes(vencimento);
CREATE INDEX IF NOT EXISTS idx_obrigacoes_cliente    ON obrigacoes(cliente_id);
-- "O que ainda não avisei e vence logo" é a consulta da rotina diária dela.
CREATE INDEX IF NOT EXISTS idx_obrigacoes_a_avisar
  ON obrigacoes(vencimento) WHERE avisado_em IS NULL AND status <> 'pago';

-- ---------- Documento: ficha, não o arquivo ----------
-- Decisão de 04/08/2026: o arquivo NÃO sobe. O sistema guarda o que existe,
-- de quem é, de que período e o que falta; o arquivo continua na pasta dela,
-- e `caminho_origem` é a trilha de volta.
CREATE TABLE IF NOT EXISTS documentos (
  id             text PRIMARY KEY,
  cliente_id     text NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  processo_id    text REFERENCES processos(id) ON DELETE SET NULL,
  nome_arquivo   text NOT NULL,
  tipo           text,
  categoria      text,
  origem         text CHECK (origem IN ('gerado-pela-plena', 'recebido-do-cliente', 'emitido-pelo-orgao')),
  assinatura     text CHECK (assinatura IN ('nao-requer', 'aguardando-assinatura', 'assinado')),
  -- Período a que o documento se REFERE, diferente de quando foi emitido.
  -- A declaração entregue em 2026 refere-se ao ano-calendário 2025.
  exercicio      integer,
  ano_calendario integer,
  competencia    text,
  emitido_em     date,
  valor_centavos bigint,
  confianca      real,
  caminho_origem text,
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente   ON documentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_processo  ON documentos(processo_id);
CREATE INDEX IF NOT EXISTS idx_documentos_exercicio ON documentos(exercicio);
-- "O que está esperando assinatura" hoje é uma pasta chamada `Assinados` no
-- computador dela. Aqui é consulta.
CREATE INDEX IF NOT EXISTS idx_documentos_assinatura
  ON documentos(assinatura) WHERE assinatura = 'aguardando-assinatura';

-- ---------- Trilha ----------
-- Quem mudou o quê e quando. Sem isto, "esse valor mudou sozinho" não tem
-- resposta, e num sistema que a contadora vai usar para informar cliente a
-- pergunta vai aparecer.
CREATE TABLE IF NOT EXISTS auditoria (
  id         bigserial PRIMARY KEY,
  usuario_id text REFERENCES usuarios(id) ON DELETE SET NULL,
  entidade   text NOT NULL,
  entidade_id text NOT NULL,
  acao       text NOT NULL,
  detalhe    jsonb,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade ON auditoria(entidade, entidade_id);
