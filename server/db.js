// Conexão e schema do banco SQLite (módulo nativo node:sqlite, Node >= 22.13).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH ?? join(RAIZ, 'data', 'findcar.db');

export const SCHEMA = `
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
  foto_url      TEXT,               -- foto com licença livre (Wikimedia Commons), ver data/fotos.json
  foto_autor    TEXT,
  foto_licenca  TEXT,
  foto_pagina   TEXT,
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
  fipe_auto     INTEGER NOT NULL DEFAULT 0,   -- 1 = código FIPE escolhido pelo vínculo automático
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
  potencia_max_cv         REAL GENERATED ALWAYS AS (nullif(max(coalesce(potencia_cv,0), coalesce(potencia_cv_etanol,0)), 0)) STORED,
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
`;

export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Colunas adicionadas depois da primeira versão do schema: bancos antigos ganham as colunas
const MIGRACOES = [
  ['modelos', 'foto_url', 'TEXT'], ['modelos', 'foto_autor', 'TEXT'],
  ['modelos', 'foto_licenca', 'TEXT'], ['modelos', 'foto_pagina', 'TEXT'],
  ['versoes', 'fipe_auto', 'INTEGER NOT NULL DEFAULT 0'],
];

function migrar(db) {
  for (const [tabela, coluna, tipo] of MIGRACOES) {
    const existe = db.prepare(`SELECT 1 FROM pragma_table_info('${tabela}') WHERE name = ?`).get(coluna);
    if (!existe) db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${tipo}`);
  }
  // v0.4: potencia_max_cv passou a ser NULL (e não 0) quando a ficha não tem potência.
  // Coluna gerada não pode ser alterada, então a tabela fichas é recriada com os mesmos dados.
  const sqlFichas = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'fichas'").get()?.sql ?? '';
  if (!sqlFichas.includes('nullif')) {
    const colunas = db.prepare("SELECT name FROM pragma_table_xinfo('fichas') WHERE hidden = 0").all().map((c) => c.name).join(', ');
    const criar = SCHEMA.slice(SCHEMA.indexOf('CREATE TABLE IF NOT EXISTS fichas'), SCHEMA.indexOf(');', SCHEMA.indexOf('CREATE TABLE IF NOT EXISTS fichas')) + 2);
    db.exec('PRAGMA foreign_keys = OFF; BEGIN;');
    db.exec(`ALTER TABLE fichas RENAME TO fichas_antiga; ${criar}
      INSERT INTO fichas (${colunas}) SELECT ${colunas} FROM fichas_antiga; DROP TABLE fichas_antiga;
      CREATE INDEX IF NOT EXISTS ix_fichas_comb ON fichas(combustivel); CREATE INDEX IF NOT EXISTS ix_fichas_tracao ON fichas(tracao);
      CREATE INDEX IF NOT EXISTS ix_fichas_cambio ON fichas(cambio); CREATE INDEX IF NOT EXISTS ix_fichas_pot ON fichas(potencia_max_cv);`);
    db.exec('COMMIT; PRAGMA foreign_keys = ON;');
  }
}

export function abrirBanco(caminho = DB_PATH) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  migrar(db);
  return db;
}

export function transacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
