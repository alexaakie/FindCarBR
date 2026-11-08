// Mostra a versão do schema e aplica as migrações pendentes.
// Uso: npm run db:migrar            → aplica o que falta
//      npm run db:migrar -- --status → só mostra, sem alterar nada
// (O servidor e os scripts db:* também aplicam as migrações sozinhos ao abrir o banco.)
import '../env.js';
import { abrirBanco, DB_PATH, migracoesPendentes, migrar, versaoDoSchema } from '../db.js';
import { MIGRACOES } from '../migracoes.js';

const db = abrirBanco(DB_PATH, { migrar: false });
const atual = versaoDoSchema(db);
const pendentes = migracoesPendentes(db);
console.log(`Banco: ${DB_PATH}`);
console.log(`Schema na versão ${atual} de ${MIGRACOES.at(-1).versao}.`);

if (atual > MIGRACOES.at(-1).versao) {
  console.error(`✗ O banco é de uma versão mais nova do FindCarBR (schema ${atual}). Atualize o código (git pull) ou apague o banco e rode npm run db:popular.`);
  process.exit(1);
}

const historico = atual > 0 ? db.prepare('SELECT versao, nome, aplicada_em FROM schema_versao ORDER BY versao').all() : [];
for (const h of historico) console.log(`  ✓ ${h.versao}. ${h.nome}  (${h.aplicada_em})`);
for (const m of pendentes) console.log(`  · ${m.versao}. ${m.nome}  (pendente)`);

if (process.argv.includes('--status') || pendentes.length === 0) {
  if (!pendentes.length) console.log('Nada a aplicar.');
  process.exit(0);
}

try {
  const r = migrar(db);
  console.log(`\n✓ ${r.aplicadas.length} migração(ões) aplicada(s): versão ${r.de} → ${r.para}.`);
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
