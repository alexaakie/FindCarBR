// Importa a Tabela FIPE (carros) da API pública https://deividfortuna.github.io/fipe/
// para a tabela fipe_veiculos. Cobre todas as marcas/modelos/anos vendidos no Brasil.
//
// Uso:
//   npm run db:fipe                       → todas as marcas (demora: dezenas de milhares de requisições)
//   npm run db:fipe -- --marcas=volkswagen,fiat
//   npm run db:fipe -- --sem-precos       → só marcas/modelos/anos (bem mais rápido)
//   FIPE_TOKEN=xxx npm run db:fipe        → token gratuito do fipe.online aumenta o limite diário
//
// É retomável: registros já importados no mês de referência atual são pulados.
import '../env.js';
import { abrirBanco, slugify, transacao } from '../db.js';
import { vincularFipe } from '../fipe-vinculo.js';

const BASE = process.env.FIPE_API ?? 'https://fipe.parallelum.com.br/api/v2';
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const PAUSA_MS = Number(args.pausa ?? 350);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(caminho, tentativa = 0) {
  const headers = process.env.FIPE_TOKEN ? { 'X-Subscription-Token': process.env.FIPE_TOKEN } : {};
  const r = await fetch(`${BASE}${caminho}`, { headers, signal: AbortSignal.timeout(20_000) }).catch((e) => ({ ok: false, status: 0, e }));
  if (r.ok) { await dormir(PAUSA_MS); return r.json(); }
  if (r.status === 429 || r.status >= 500 || r.status === 0) {
    if (tentativa >= 5) throw new Error(`FIPE ${r.status} em ${caminho} (limite diário? use FIPE_TOKEN ou rode de novo amanhã)`);
    const espera = 2 ** tentativa * 2000;
    console.warn(`  … ${r.status || 'rede'} em ${caminho}, aguardando ${espera / 1000}s`);
    await dormir(espera);
    return api(caminho, tentativa + 1);
  }
  throw new Error(`FIPE ${r.status} em ${caminho}`);
}

const valorNumerico = (s) => (s ? Number(String(s).replace(/[^\d,]/g, '').replace(',', '.')) : null);
const COMBUSTIVEL = { 1: 'Gasolina', 2: 'Etanol', 3: 'Diesel', 4: 'Elétrico', 5: 'Flex', 6: 'Híbrido', 7: 'Gás' };

async function main() {
  const db = abrirBanco();
  const marcasLocais = new Map(db.prepare('SELECT id, slug FROM marcas').all().map((m) => [m.slug, m.id]));
  const insMarca = db.prepare('INSERT INTO marcas (nome, slug, fipe_codigo) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET fipe_codigo = excluded.fipe_codigo RETURNING id');
  const upVeiculo = db.prepare(`INSERT INTO fipe_veiculos (codigo_fipe, ano_modelo, combustivel, marca_id, marca_nome, modelo_nome, valor, referencia)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(codigo_fipe, ano_modelo, combustivel) DO UPDATE SET valor = coalesce(excluded.valor, valor),
      referencia = coalesce(excluded.referencia, referencia), modelo_nome = excluded.modelo_nome, marca_id = excluded.marca_id`);
  const jaTem = db.prepare('SELECT 1 FROM fipe_veiculos WHERE codigo_fipe = ? AND ano_modelo = ? AND referencia = ?');

  const referencias = await api('/references');
  const refAtual = referencias[0]?.month ?? null;
  console.log(`Tabela FIPE — referência ${refAtual ?? 'desconhecida'}`);

  let marcas = await api('/cars/brands');
  if (args.marcas) {
    const filtro = String(args.marcas).split(',').map(slugify);
    marcas = marcas.filter((m) => filtro.some((f) => slugify(m.name).includes(f)));
  }
  console.log(`${marcas.length} marcas para importar${args['sem-precos'] ? ' (sem preços)' : ''}\n`);

  let total = 0;
  for (const marca of marcas) {
    // Une com a marca das fichas pelo slug ("VW - VolksWagen" → volkswagen)
    const nomeLimpo = marca.name.replace(/^VW - /i, '').replace(/^GM - /i, '');
    const slug = slugify(nomeLimpo);
    const marcaId = marcasLocais.get(slug) ?? insMarca.get(nomeLimpo, slug, String(marca.code)).id;
    marcasLocais.set(slug, marcaId);

    const modelos = await api(`/cars/brands/${marca.code}/models`);
    process.stdout.write(`${nomeLimpo}: ${modelos.length} modelos `);
    for (const modelo of modelos) {
      const anos = await api(`/cars/brands/${marca.code}/models/${modelo.code}/years`);
      for (const ano of anos) {
        const [anoStr, combCod] = String(ano.code).split('-');
        const anoModelo = Number(anoStr);
        if (args['sem-precos']) {
          upVeiculo.run(`m${marca.code}-${modelo.code}`, anoModelo, COMBUSTIVEL[combCod] ?? null, marcaId, nomeLimpo, modelo.name, null, null);
          total++;
          continue;
        }
        const det = await api(`/cars/brands/${marca.code}/models/${modelo.code}/years/${ano.code}`);
        if (refAtual && jaTem.get(det.codeFipe, anoModelo, det.referenceMonth)) continue;
        upVeiculo.run(det.codeFipe, anoModelo, det.fuel ?? COMBUSTIVEL[combCod] ?? null, marcaId, nomeLimpo, det.model,
          valorNumerico(det.price), det.referenceMonth ?? refAtual);
        total++;
      }
      process.stdout.write('.');
    }
    process.stdout.write('\n');
  }

  // Reconstrói o índice de busca FIPE
  transacao(db, () => {
    db.exec('DELETE FROM busca_fipe');
    db.exec(`INSERT INTO busca_fipe (texto, codigo_fipe)
      SELECT marca_nome || ' ' || modelo_nome, codigo_fipe FROM fipe_veiculos GROUP BY codigo_fipe`);
  });
  const v = vincularFipe(db);
  console.log(`\n✓ ${total} registros FIPE gravados · ${v.vinculadas} de ${v.total} versões com ficha ligadas a um preço FIPE.`);
}

main().catch((e) => { console.error(`\n✗ ${e.message}`); process.exit(1); });
