-- Schema do FindCarBR v0.2 (commit 9973ed6), usado para testar a atualização de bancos antigos.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS marcas (
  id            INTEGER PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,
  slug          TEXT NOT NULL UNIQUE,
  pais          TEXT,
  fipe_codigo   TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS modelos (
  id            INTEGER PRIMARY KEY,
  marca_id      INTEGER NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  categoria     TEXT,
  UNIQUE (marca_id, slug)
);

CREATE TABLE IF NOT EXISTS geracoes (
  id            INTEGER PRIMARY KEY,
  modelo_id     INTEGER NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  ano_inicio    INTEGER,
  ano_fim       INTEGER,
  UNIQUE (modelo_id, nome)
);

CREATE TABLE IF NOT EXISTS versoes (
  id            INTEGER PRIMARY KEY,
  geracao_id    INTEGER NOT NULL REFERENCES geracoes(id) ON DELETE CASCADE,
  modelo_id     INTEGER NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  ano_modelo    INTEGER NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  carroceria    TEXT,
  portas        INTEGER,
  lugares       INTEGER,
  fipe_codigo   TEXT,
  status_dados  TEXT NOT NULL DEFAULT 'verificar' CHECK (status_dados IN ('verificar','verificado')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (modelo_id, nome, ano_modelo)
);

-- Ficha técnica 1:1 com a versão. Colunas planas = filtros e ordenação rápidos.
CREATE TABLE IF NOT EXISTS fichas (
  versao_id               INTEGER PRIMARY KEY REFERENCES versoes(id) ON DELETE CASCADE,
  motor_codigo            TEXT,
  cilindrada_cc           INTEGER,
  cilindros               INTEGER,
  valvulas                INTEGER,
  aspiracao               TEXT,
  injecao                 TEXT,
  combustivel             TEXT,
  potencia_cv             REAL,
  potencia_cv_etanol      REAL,
  potencia_rpm            TEXT,
  torque_kgfm             REAL,
  torque_kgfm_etanol      REAL,
  torque_rpm              TEXT,
  bateria_kwh             REAL,
  autonomia_km            REAL,
  recarga_dc_kw           REAL,
  cambio                  TEXT,
  marchas                 INTEGER,
  tracao                  TEXT,
  zero_a_cem_s            REAL,
  vel_max_kmh             REAL,
  consumo_urbano_gasolina REAL,
  consumo_estrada_gasolina REAL,
  consumo_urbano_etanol   REAL,
  consumo_estrada_etanol  REAL,
  comprimento_mm          INTEGER,
  largura_mm              INTEGER,
  altura_mm               INTEGER,
  entre_eixos_mm          INTEGER,
  porta_malas_l           INTEGER,
  tanque_l                INTEGER,
  peso_kg                 INTEGER,
  suspensao_dianteira     TEXT,
  suspensao_traseira      TEXT,
  freios_dianteiros       TEXT,
  freios_traseiros        TEXT,
  pneus                   TEXT,
  -- potência máxima entre combustíveis: usada para filtrar/ordenar
  potencia_max_cv         REAL GENERATED ALWAYS AS (max(coalesce(potencia_cv,0), coalesce(potencia_cv_etanol,0))) STORED,
  peso_potencia           REAL GENERATED ALWAYS AS (
                            CASE WHEN peso_kg > 0 AND max(coalesce(potencia_cv,0), coalesce(potencia_cv_etanol,0)) > 0
                            THEN round(peso_kg * 1.0 / max(coalesce(potencia_cv,0), coalesce(potencia_cv_etanol,0)), 2) END) STORED
);

-- Tabela FIPE (preenchida por scripts/importar-fipe.js). Independente das fichas:
-- cobre TODO o mercado brasileiro; versoes.fipe_codigo faz a ligação quando existe.
CREATE TABLE IF NOT EXISTS fipe_veiculos (
  codigo_fipe   TEXT NOT NULL,
  ano_modelo    INTEGER NOT NULL,      -- 32000 = zero km na FIPE
  combustivel   TEXT,
  marca_id      INTEGER REFERENCES marcas(id) ON DELETE SET NULL,
  marca_nome    TEXT NOT NULL,
  modelo_nome   TEXT NOT NULL,
  valor         REAL,
  referencia    TEXT,
  PRIMARY KEY (codigo_fipe, ano_modelo, combustivel)
);

CREATE INDEX IF NOT EXISTS ix_modelos_marca   ON modelos(marca_id);
CREATE INDEX IF NOT EXISTS ix_versoes_modelo  ON versoes(modelo_id);
CREATE INDEX IF NOT EXISTS ix_versoes_ano     ON versoes(ano_modelo);
CREATE INDEX IF NOT EXISTS ix_fichas_comb     ON fichas(combustivel);
CREATE INDEX IF NOT EXISTS ix_fichas_tracao   ON fichas(tracao);
CREATE INDEX IF NOT EXISTS ix_fichas_cambio   ON fichas(cambio);
CREATE INDEX IF NOT EXISTS ix_fichas_pot      ON fichas(potencia_max_cv);
CREATE INDEX IF NOT EXISTS ix_fipe_marca      ON fipe_veiculos(marca_id);
CREATE INDEX IF NOT EXISTS ix_fipe_codigo     ON fipe_veiculos(codigo_fipe);

-- Busca textual sem acentos ("citroen" encontra "Citroën")
CREATE VIRTUAL TABLE IF NOT EXISTS busca USING fts5(
  texto, versao_id UNINDEXED, tokenize = 'unicode61 remove_diacritics 2'
);
CREATE VIRTUAL TABLE IF NOT EXISTS busca_fipe USING fts5(
  texto, codigo_fipe UNINDEXED, tokenize = 'unicode61 remove_diacritics 2'
);
