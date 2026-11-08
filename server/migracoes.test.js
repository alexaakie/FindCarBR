// Testes do gerenciador de migrações. Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco, migracoesPendentes, migrar, versaoDoSchema } from './db.js';
import { MIGRACOES } from './migracoes.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ULTIMA = MIGRACOES.at(-1).versao;

function pastaTemp(t) {
  const dir = mkdtempSync(join(tmpdir(), 'findcar-mig-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const tabelas = (db) => db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);

test('banco novo recebe todas as migrações, em ordem', (t) => {
  const db = abrirBanco(join(pastaTemp(t), 'novo.db'));
  assert.equal(versaoDoSchema(db), ULTIMA);
  const hist = db.prepare('SELECT versao FROM schema_versao ORDER BY versao').all().map((r) => r.versao);
  assert.deepEqual(hist, MIGRACOES.map((m) => m.versao));
  for (const nome of ['marcas', 'modelos', 'geracoes', 'versoes', 'fichas', 'fipe_veiculos', 'fontes', 'ficha_fontes']) {
    assert.ok(tabelas(db).includes(nome), `falta a tabela ${nome}`);
  }
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1, 'chaves estrangeiras ligadas após migrar');
  db.close();
});

test('reabrir o banco não reaplica nada', (t) => {
  const arq = join(pastaTemp(t), 'b.db');
  abrirBanco(arq).close();
  const db = abrirBanco(arq);
  assert.equal(migracoesPendentes(db).length, 0);
  assert.equal(migrar(db).aplicadas.length, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM schema_versao').get().n, MIGRACOES.length);
  db.close();
});

test('banco antigo (v0.2, sem schema_versao) é atualizado sem perder dados', (t) => {
  const arq = join(pastaTemp(t), 'legado.db');
  const antigo = new DatabaseSync(arq);
  antigo.exec(readFileSync(join(AQUI, 'test', 'fixtures', 'schema-v0.2.sql'), 'utf8'));
  antigo.exec(`
    INSERT INTO marcas (id, nome, slug) VALUES (1, 'Volkswagen', 'volkswagen');
    INSERT INTO modelos (id, marca_id, nome, slug, categoria) VALUES (1, 1, 'Gol', 'gol', 'Hatch');
    INSERT INTO geracoes (id, modelo_id, nome, ano_inicio) VALUES (1, 1, 'G4', 2006);
    INSERT INTO versoes (id, geracao_id, modelo_id, nome, ano_modelo, slug) VALUES
      (1, 1, 1, '1.0 Total Flex', 2006, 'volkswagen-gol-1-0-total-flex-2006'),
      (2, 1, 1, '1.6 Total Flex', 2006, 'volkswagen-gol-1-6-total-flex-2006');
    INSERT INTO fichas (versao_id, potencia_cv, potencia_cv_etanol, peso_kg) VALUES (1, 68, 72, 900), (2, NULL, NULL, 950);
    INSERT INTO fipe_veiculos VALUES ('005000-1', 2006, 'Flex', 1, 'VW', 'Gol 1.0', 18000, 'outubro de 2026');`);
  assert.equal(antigo.prepare('SELECT potencia_max_cv FROM fichas WHERE versao_id = 2').get().potencia_max_cv, 0);
  antigo.close();

  const db = abrirBanco(arq);
  assert.equal(versaoDoSchema(db), ULTIMA);
  // colunas novas existem, dados preservados
  const colunas = (tab) => db.prepare(`SELECT name FROM pragma_table_info('${tab}')`).all().map((c) => c.name);
  assert.ok(colunas('modelos').includes('foto_url'));
  assert.ok(colunas('versoes').includes('fipe_auto'));
  assert.equal(db.prepare('SELECT count(*) n FROM versoes').get().n, 2);
  assert.equal(db.prepare('SELECT count(*) n FROM fipe_veiculos').get().n, 1);
  const f1 = db.prepare('SELECT potencia_max_cv, peso_kg, peso_potencia FROM fichas WHERE versao_id = 1').get();
  assert.equal(f1.potencia_max_cv, 72);
  assert.equal(f1.peso_kg, 900);
  // coluna gerada corrigida: sem potência → NULL, não 0
  assert.equal(db.prepare('SELECT potencia_max_cv FROM fichas WHERE versao_id = 2').get().potencia_max_cv, null);
  // índices recriados e integridade ok
  const indices = db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'fichas'").all().map((r) => r.name);
  assert.ok(indices.includes('ix_fichas_pot'));
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  // apagar a versão apaga a ficha (ON DELETE CASCADE continua funcionando na tabela recriada)
  db.exec('DELETE FROM versoes WHERE id = 1');
  assert.equal(db.prepare('SELECT count(*) n FROM fichas').get().n, 1);
  db.close();
});

test('registro órfão que já existia no banco antigo não impede a atualização', (t) => {
  const arq = join(pastaTemp(t), 'orfao.db');
  const antigo = new DatabaseSync(arq);
  antigo.exec(readFileSync(join(AQUI, 'test', 'fixtures', 'schema-v0.2.sql'), 'utf8'));
  antigo.exec(`
    INSERT INTO marcas (id, nome, slug) VALUES (1, 'VW', 'vw');
    INSERT INTO modelos (id, marca_id, nome, slug) VALUES (1, 1, 'Gol', 'gol');
    INSERT INTO geracoes (id, modelo_id, nome) VALUES (1, 1, 'G4');
    INSERT INTO versoes (id, geracao_id, modelo_id, nome, ano_modelo, slug) VALUES (1, 1, 1, '1.0', 2006, 'vw-gol-1-0-2006');
    INSERT INTO fichas (versao_id, potencia_cv) VALUES (1, 68);
    PRAGMA foreign_keys = OFF;
    DELETE FROM versoes WHERE id = 1;`); // como faria o sqlite3 de linha de comando
  antigo.close();
  const db = abrirBanco(arq);
  assert.equal(versaoDoSchema(db), ULTIMA);
  assert.equal(db.prepare('SELECT count(*) n FROM fichas').get().n, 1, 'o órfão não é apagado pela migração');
  db.close();
});

test('migração com erro é desfeita por inteiro', (t) => {
  const db = abrirBanco(join(pastaTemp(t), 'falha.db'));
  const quebrada = [...MIGRACOES, {
    versao: ULTIMA + 1,
    nome: 'teste que falha no meio',
    aplicar(d) {
      d.exec('CREATE TABLE tabela_parcial (id INTEGER)');
      d.exec('SELECT * FROM tabela_que_nao_existe');
    },
  }];
  assert.throws(() => migrar(db, quebrada), /Falha na migração .*Nada foi alterado/);
  assert.equal(versaoDoSchema(db), ULTIMA);
  assert.ok(!tabelas(db).includes('tabela_parcial'), 'a tabela criada antes do erro foi desfeita');
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  db.close();
});

test('migração que deixa chave estrangeira quebrada é recusada', (t) => {
  const db = abrirBanco(join(pastaTemp(t), 'fk.db'));
  const ruim = [...MIGRACOES, {
    versao: ULTIMA + 1,
    nome: 'insere ficha órfã',
    aplicar(d) { d.exec('INSERT INTO fichas (versao_id) VALUES (999)'); },
  }];
  assert.throws(() => migrar(db, ruim), /chave estrangeira/);
  assert.equal(db.prepare('SELECT count(*) n FROM fichas').get().n, 0);
  db.close();
});

test('banco de uma versão mais nova do código é recusado', (t) => {
  const arq = join(pastaTemp(t), 'futuro.db');
  const db = abrirBanco(arq);
  db.prepare('INSERT INTO schema_versao (versao, nome) VALUES (?, ?)').run(ULTIMA + 5, 'do futuro');
  db.close();
  assert.throws(() => abrirBanco(arq), /mais nova que a deste código/);
});
