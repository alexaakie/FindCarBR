// Procura uma foto com licença livre para cada modelo, usando a imagem principal do
// artigo da Wikipédia (pt, depois en) e os metadados de licença do Wikimedia Commons.
// Grava em server/data/fotos.json (versionado — revise antes de commitar) e atualiza o banco.
//
// Uso:
//   npm run db:fotos                 → só modelos que ainda não têm foto
//   npm run db:fotos -- --forcar     → procura de novo todos (menos os marcados "manual": true)
//
// Para trocar uma foto à mão, edite fotos.json e marque a entrada com "manual": true.
import '../env.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { abrirBanco } from '../db.js';
import { carregarFotos, FOTOS } from './popular.js';

const forcar = process.argv.includes('--forcar');
const HEADERS = { 'User-Agent': 'FindCarBR/0.3 (https://github.com/alexaakie/FindCarBR)' };
const LICENCAS_OK = /^(cc[ -]?by|cc[ -]?by-sa|cc0|cc[ -]?zero|public domain|pd|attribution)/i;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Nome da marca como a Wikipédia costuma usar no título do artigo
const MARCA_WIKI = { 'caoa-chery': 'Chery', gwm: 'GWM', 'mercedes-benz': 'Mercedes-Benz', citroen: 'Citroën', ram: 'Ram' };

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })}`;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  await dormir(200);
  return r.json();
}

async function imagemDoArtigo(wiki, titulo) {
  const d = await api(`https://${wiki}.wikipedia.org/w/api.php`, { action: 'query', prop: 'pageimages|pageprops', piprop: 'name', redirects: '1', titles: titulo });
  const p = d.query?.pages?.[0];
  if (!p || p.missing || p.pageprops?.disambiguation !== undefined) return null;
  return p.pageimage ? { arquivo: p.pageimage, artigo: `https://${wiki}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}` } : null;
}

const semHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function infoCommons(arquivo) {
  const d = await api('https://commons.wikimedia.org/w/api.php', {
    action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1280', titles: `File:${arquivo}`,
  });
  const info = d.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null; // arquivo local da Wikipédia (uso restrito), não está no Commons
  const meta = info.extmetadata ?? {};
  const licenca = semHtml(meta.LicenseShortName?.value);
  if (!LICENCAS_OK.test(licenca)) return null;
  return {
    url: info.thumburl ?? info.url,
    autor: semHtml(meta.Artist?.value).slice(0, 120) || 'Autor desconhecido',
    licenca,
    pagina: info.descriptionurl,
  };
}

async function main() {
  const fotos = existsSync(FOTOS) ? JSON.parse(readFileSync(FOTOS, 'utf8')) : {};
  const db = abrirBanco();
  const modelos = db.prepare(`SELECT ma.slug AS marca_slug, ma.nome AS marca, mo.slug, mo.nome
    FROM modelos mo JOIN marcas ma ON ma.id = mo.marca_id
    WHERE EXISTS (SELECT 1 FROM versoes v WHERE v.modelo_id = mo.id) ORDER BY ma.nome, mo.nome`).all();

  let novas = 0, semFoto = 0;
  for (const m of modelos) {
    const chave = `${m.marca_slug}/${m.slug}`;
    const atual = fotos[chave];
    if (atual?.manual || (atual?.url && !forcar)) continue;
    const marca = MARCA_WIKI[m.marca_slug] ?? m.marca;
    const titulos = [`${marca} ${m.nome}`, m.nome.startsWith(marca) ? m.nome : null].filter(Boolean);
    let achou = null;
    try {
      for (const wiki of ['pt', 'en']) {
        for (const t of titulos) {
          const img = await imagemDoArtigo(wiki, t);
          if (!img) continue;
          const info = await infoCommons(img.arquivo);
          if (info) { achou = { ...info, artigo: img.artigo }; break; }
        }
        if (achou) break;
      }
    } catch (e) {
      console.warn(`  ! ${chave}: ${e.message}`);
    }
    if (achou) { fotos[chave] = achou; novas++; console.log(`✓ ${chave} — ${achou.licenca}, ${achou.autor}`); }
    else { semFoto++; console.log(`· ${chave} — sem foto livre`); }
  }

  const ordenado = Object.fromEntries(Object.entries(fotos).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(FOTOS, `${JSON.stringify(ordenado, null, 2)}\n`);
  const aplicadas = carregarFotos(db);
  console.log(`\n${novas} fotos novas, ${semFoto} modelos sem foto livre. ${aplicadas} modelos com foto no banco.`);
  console.log('Revise server/data/fotos.json: a foto do artigo pode ser de outra geração do modelo.');
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
