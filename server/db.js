// Conexão com o banco SQLite (módulo nativo node:sqlite, Node >= 22.13).
// O schema fica em migracoes.js; abrirBanco() aplica as migrações pendentes.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIGRACOES } from './migracoes.js';

const RAIZ = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH ?? join(RAIZ, 'data', 'findcar.db');

export function slugify(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const TABELA_VERSAO = `CREATE TABLE IF NOT EXISTS schema_versao (
  versao      INTEGER PRIMARY KEY,
  nome        TEXT NOT NULL,
  aplicada_em TEXT NOT NULL DEFAULT (datetime('now'))
)`;

// Só lê: num banco sem a tabela schema_versao (novo ou de antes das migrações) devolve 0
export function versaoDoSchema(db) {
  const existe = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_versao'").get();
  return existe ? db.prepare('SELECT coalesce(max(versao), 0) AS v FROM schema_versao').get().v : 0;
}

export function migracoesPendentes(db, migracoes = MIGRACOES) {
  const atual = versaoDoSchema(db);
  return migracoes.filter((m) => m.versao > atual);
}

// Aplica as migrações pendentes, uma transação por migração. BEGIN IMMEDIATE trava o banco
// antes de conferir a versão, então dois processos abrindo o banco ao mesmo tempo
// (ex.: API em --watch e npm run db:popular) não aplicam a mesma migração duas vezes.
export function migrar(db, migracoes = MIGRACOES) {
  db.exec(TABELA_VERSAO);
  const de = versaoDoSchema(db);
  const ultima = migracoes.at(-1)?.versao ?? 0;
  if (de > ultima) {
    throw new Error(`O banco está na versão ${de} do schema, mais nova que a deste código (${ultima}). `
      + 'Atualize o FindCarBR (git pull) ou apague o banco e rode npm run db:popular.');
  }
  const aplicadas = [];
  // Violações de chave estrangeira que o banco já tinha (ex.: linha órfã deixada por uma ferramenta
  // externa) não bloqueiam a migração; só as que a própria migração criar.
  const violacoes = () => new Set(db.prepare('PRAGMA foreign_key_check').all().map((v) => `${v.table}|${v.rowid}|${v.parent}|${v.fkid}`));
  for (const m of migracoes) {
    if (m.versao <= de) continue;
    db.exec('PRAGMA foreign_keys = OFF');
    let emTransacao = false;
    try {
      db.exec('BEGIN IMMEDIATE');
      emTransacao = true;
      const atual = db.prepare('SELECT coalesce(max(versao), 0) AS v FROM schema_versao').get().v;
      if (m.versao > atual) {
        const antes = violacoes();
        m.aplicar(db);
        const novas = [...violacoes()].filter((v) => !antes.has(v));
        if (novas.length) throw new Error(`${novas.length} violação(ões) de chave estrangeira, ex.: tabela ${novas[0].split('|')[0]}`);
        if (antes.size) console.warn(`Aviso: o banco já tinha ${antes.size} registro(s) órfão(s) (chave estrangeira quebrada); a migração ${m.versao} seguiu sem mexer neles.`);
        db.prepare('INSERT INTO schema_versao (versao, nome) VALUES (?, ?)').run(m.versao, m.nome);
        aplicadas.push(m);
      }
      db.exec('COMMIT');
      emTransacao = false;
    } catch (e) {
      if (emTransacao) db.exec('ROLLBACK');
      throw new Error(`Falha na migração ${m.versao} (${m.nome}): ${e.message}. Nada foi alterado no banco.`);
    } finally {
      db.exec('PRAGMA foreign_keys = ON');
    }
  }
  return { de, para: versaoDoSchema(db), aplicadas };
}

// Abre o banco e, por padrão, aplica as migrações pendentes.
export function abrirBanco(caminho = DB_PATH, { migrar: aplicarMigracoes = true } = {}) {
  if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
  const db = new DatabaseSync(caminho);
  // busy_timeout primeiro: até a troca para WAL precisa esperar se outro processo estiver com o banco aberto
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  if (aplicarMigracoes) migrar(db);
  return db;
}

export function transacao(db, fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
