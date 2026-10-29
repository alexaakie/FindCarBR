// Testes da API e da importação FIPE (com servidor FIPE simulado). Uso: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco } from './db.js';
import { popular } from './scripts/popular.js';
import { criarApp } from './index.js';
import { pontuar } from './fipe-vinculo.js';
import { carregarFotos } from './scripts/popular.js';
import { writeFileSync } from 'node:fs';

const AQUI = dirname(fileURLToPath(import.meta.url));
let servidor, base, db, tmp;

before(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'findcar-'));
  db = abrirBanco(join(tmp, 'teste.db'));
  popular(db);
  servidor = criarApp(db).listen(0);
  await new Promise((r) => servidor.once('listening', r));
  base = `http://localhost:${servidor.address().port}/api`;
});
after(() => { servidor?.close(); db?.close(); rmSync(tmp, { recursive: true, force: true }); });

const get = async (p) => { const r = await fetch(base + p); return { status: r.status, body: await r.json() }; };

test('estatísticas e filtros', async () => {
  const { body: e } = await get('/estatisticas');
  assert.ok(e.versoes > 300 && e.marcas >= 20);
  const { body: f } = await get('/filtros');
  assert.ok(f.combustiveis.includes('Flex') && f.tracoes.includes('Integral'));
});

test('busca sem acento encontra marca acentuada', async () => {
  const { body } = await get('/versoes?q=citroen');
  assert.ok(body.total > 0);
  assert.ok(body.itens.every((v) => v.marca === 'Citroën'));
});

test('filtros combinados, ordenação e paginação', async () => {
  const { body } = await get('/versoes?combustivel=Flex&categoria=SUV&ordem=potencia_desc&por_pagina=5');
  assert.equal(body.itens.length, 5);
  assert.ok(body.itens.every((v) => v.combustivel === 'Flex' && v.categoria === 'SUV'));
  const pots = body.itens.map((v) => v.potencia_max_cv);
  assert.deepEqual(pots, [...pots].sort((a, b) => b - a));
  const p2 = await get('/versoes?combustivel=Flex&categoria=SUV&ordem=potencia_desc&por_pagina=5&pagina=2');
  assert.notEqual(p2.body.itens[0].slug, body.itens[0].slug);
});

test('entrada maliciosa não quebra a busca', async () => {
  const r = await get(`/versoes?q=${encodeURIComponent('" OR 1=1; DROP TABLE versoes; --')}&ordem=xyz&pagina=-4`);
  assert.equal(r.status, 200);
  assert.equal(r.body.pagina, 1);
});

test('marca → modelo → ficha completa → comparar', async () => {
  const { body: marca } = await get('/marcas/volkswagen');
  assert.ok(marca.modelos.length > 5);
  const { body: modelo } = await get(`/modelos/volkswagen/${marca.modelos[0].slug}`);
  assert.ok(modelo.geracoes[0].versoes.length > 0);
  const slug = modelo.geracoes[0].versoes[0].slug;
  const { body: ficha } = await get(`/versoes/${slug}`);
  assert.equal(ficha.marca, 'Volkswagen');
  assert.ok(ficha.motor && ficha.dimensoes && Array.isArray(ficha.similares));
  const outro = (await get('/versoes?q=corolla')).body.itens[0].slug;
  const { body: cmp } = await get(`/comparar?slugs=${slug},${outro}`);
  assert.equal(cmp.length, 2);
});

test('404 e IA sem chave', async () => {
  assert.equal((await get('/versoes/nao-existe')).status, 404);
  delete process.env.GEMINI_API_KEY;
  const slug = (await get('/versoes?por_pagina=1')).body.itens[0].slug;
  const r = await fetch(`${base}/ia/analise`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
  assert.equal(r.status, 503);
});

test('importação FIPE com API simulada', async () => {
  const respostas = {
    '/references': [{ code: '330', month: 'outubro de 2026' }],
    '/cars/brands': [{ code: '59', name: 'VW - VolksWagen' }, { code: '999', name: 'Marca Nova' }],
    '/cars/brands/59/models': [{ code: '1', name: 'Polo Highline 1.0 TSI Flex Aut.' }],
    '/cars/brands/59/models/1/years': [{ code: '2025-5', name: '2025 Flex' }],
    '/cars/brands/59/models/1/years/2025-5': { codeFipe: '005540-0', fuel: 'Flex', model: 'Polo Highline 1.0 TSI Flex Aut.', price: 'R$ 118.990,00', referenceMonth: 'outubro de 2026' },
    '/cars/brands/999/models': [],
  };
  const fake = createServer((req, res) => {
    const body = respostas[req.url];
    res.writeHead(body ? 200 : 404, { 'Content-Type': 'application/json' }).end(JSON.stringify(body ?? {}));
  }).listen(0);
  await new Promise((r) => fake.once('listening', r));
  const dbPath = join(tmp, 'fipe.db');
  const seed = abrirBanco(dbPath); popular(seed); seed.close();
  await new Promise((resolve, reject) => execFile(process.execPath,
    ['--disable-warning=ExperimentalWarning', join(AQUI, 'scripts', 'importar-fipe.js'), '--pausa=0'],
    { env: { ...process.env, DB_PATH: dbPath, FIPE_API: `http://localhost:${fake.address().port}` } },
    (err, out, errOut) => (err ? reject(new Error(errOut || out)) : resolve(out))));
  fake.close();
  const d = abrirBanco(dbPath);
  const v = d.prepare('SELECT f.*, m.slug FROM fipe_veiculos f JOIN marcas m ON m.id = f.marca_id').get();
  assert.equal(v.valor, 118990);
  assert.equal(v.slug, 'volkswagen'); // ligado à marca existente, não duplicado
  assert.equal(d.prepare("SELECT count(*) n FROM busca_fipe WHERE busca_fipe MATCH 'polo*'").get().n, 1);
  // vínculo automático: a ficha do Polo Highline 2025 recebe o código e o preço FIPE
  const polo = d.prepare(`SELECT v.fipe_codigo, v.fipe_auto FROM versoes v JOIN modelos mo ON mo.id = v.modelo_id
    WHERE mo.slug = 'polo' AND v.nome LIKE 'Highline%' AND v.ano_modelo = 2025`).get();
  assert.equal(polo?.fipe_codigo, '005540-0');
  assert.equal(polo.fipe_auto, 1);
  const app = criarApp(d).listen(0);
  await new Promise((r) => app.once('listening', r));
  const lista = await (await fetch(`http://localhost:${app.address().port}/api/versoes?q=polo%20highline&ordem=preco_asc`)).json();
  assert.equal(lista.itens.find((v) => v.ano_modelo === 2025)?.preco, 118990);
  app.close();
  d.close();
});

test('pontuação FIPE distingue modelos parecidos', () => {
  const onix = { modelo: 'Onix', versao: 'LT 1.0 Turbo', cilindrada_cc: 999, cambio: 'Manual' };
  const plus = { ...onix, modelo: 'Onix Plus' };
  assert.equal(pontuar(plus, 'ONIX HATCH LT 1.0 12V TB Flex 5p Mec.'), -1);
  assert.ok(pontuar(onix, 'ONIX HATCH LT 1.0 12V TB Flex 5p Mec.') > pontuar(onix, 'ONIX HATCH LT 1.0 12V TB Flex 5p Aut.'));
});

test('fotos.json é aplicado aos modelos', () => {
  const arq = join(tmp, 'fotos.json');
  writeFileSync(arq, JSON.stringify({ 'volkswagen/polo': { url: 'https://upload.wikimedia.org/x.jpg', autor: 'Fulano', licenca: 'CC BY-SA 4.0', pagina: 'https://commons.wikimedia.org/wiki/File:x.jpg' } }));
  assert.equal(carregarFotos(db, arq), 1);
  assert.equal(db.prepare("SELECT foto_autor FROM modelos WHERE slug = 'polo'").get().foto_autor, 'Fulano');
});
