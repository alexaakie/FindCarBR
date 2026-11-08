// Valida as fichas técnicas (server/data/fichas) e o registro de fontes (server/data/fontes.json).
// Uso:
//   npm run db:validar                          → todos os arquivos, incluindo conflitos entre eles
//   node server/scripts/validar.js arq.json …   → só os arquivos indicados
//   node server/scripts/validar.js --expandir arq.json → mostra as faixas de anos e as mudanças de cada versão
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { anosTexto, expandirVersao, lerFichas } from '../fichas.js';

// Achata um objeto de mudança em caminhos: { motor: { potencia_cv: 1 } } → ["motor.potencia_cv"]
function caminhos(obj, prefixo = '') {
  return Object.entries(obj ?? {}).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? caminhos(v, `${prefixo}${k}.`) : [`${prefixo}${k}`]));
}

function mostrarExpansao(arquivo) {
  const dados = JSON.parse(readFileSync(arquivo, 'utf8'));
  for (const m of Array.isArray(dados?.modelos) ? dados.modelos : []) {
    for (const g of Array.isArray(m?.geracoes) ? m.geracoes : []) {
      for (const v of Array.isArray(g.versoes) ? g.versoes : []) {
        let anos;
        try { anos = expandirVersao(v).map((f) => f.ano_modelo); }
        catch { console.log(`${m.nome} ${v?.nome ?? '?'} — inválida (veja os erros abaixo)`); continue; }
        const mud = Object.entries(v.mudancas ?? {}).map(([ano, d]) => `${ano}: ${caminhos(d).join(', ')}`);
        console.log(`${m.nome} ${v.nome} — ${anosTexto(anos)} (${anos.length} ${anos.length === 1 ? 'ficha' : 'fichas'})${mud.length ? `\n    mudanças → ${mud.join(' | ')}` : ''}`);
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const expandir = args.includes('--expandir');
  const arquivos = args.filter((a) => !a.startsWith('--')).map((a) => resolve(a));
  if (expandir) for (const a of arquivos) mostrarExpansao(a);

  const { marcas, erros, versoes } = lerFichas(undefined, { arquivos: arquivos.length ? arquivos : undefined });
  for (const m of marcas) {
    const n = m.dados.modelos.reduce((s, mo) => s + mo.geracoes.reduce((t, g) => t + g.versoes.length, 0), 0);
    console.log(`✓ ${m.arquivo} — ${n} fichas`);
  }
  for (const e of erros) console.error('✗', e);
  console.log(`\n${versoes} fichas (versão × ano-modelo), ${erros.length} problema(s).`);
  process.exit(erros.length ? 1 : 0);
}
