// Carrega as fichas JSON (server/data/fichas) e as fontes (server/data/fontes.json) no banco.
//
// O banco é um reflexo do Git: depois da carga ele contém exatamente o que está nos JSON.
// Versões que saíram dos arquivos são removidas; status de verificação e código FIPE manual
// seguem sempre o JSON. Ficam no banco apenas os dados externos importados por script
// (Tabela FIPE e o vínculo automático com ela). Nada é gravado se algum arquivo tiver erro.
//
// Uso: npm run db:popular
import '../env.js';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco, slugify, transacao, DB_PATH } from '../db.js';
import { DIR_FICHAS, ARQUIVO_FONTES, fontesPorSecao, lerFichas } from '../fichas.js';
import { vincularFipe } from '../fipe-vinculo.js';

export const FOTOS = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fotos.json');

// fotos.json: { "marca-slug/modelo-slug": { url, autor, licenca, pagina, artigo?, manual? } } (npm run db:fotos)
export function lerFotos(arquivo = FOTOS) {
  if (!existsSync(arquivo)) return { fotos: null, erros: [] };
  let fotos;
  try { fotos = JSON.parse(readFileSync(arquivo, 'utf8')); }
  catch (e) { return { fotos: null, erros: [`fotos.json: JSON inválido — ${e.message}`] }; }
  const erros = [];
  if (!fotos || typeof fotos !== 'object' || Array.isArray(fotos)) return { fotos: null, erros: ['fotos.json: deve conter um objeto'] };
  for (const [chave, f] of Object.entries(fotos)) {
    if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(chave)) erros.push(`fotos.json › ${chave}: a chave deve ser "marca/modelo" (em minúsculas, como no endereço do site)`);
    if (!f || typeof f !== 'object') { erros.push(`fotos.json › ${chave}: deve ser um objeto`); continue; }
    if (typeof f.url !== 'string' || !/^https?:\/\//.test(f.url)) erros.push(`fotos.json › ${chave}: url inválida`);
    for (const campo of ['autor', 'licenca', 'pagina', 'artigo']) {
      if (f[campo] != null && typeof f[campo] !== 'string') erros.push(`fotos.json › ${chave}: ${campo} deve ser texto`);
    }
  }
  return { fotos, erros };
}

// Aplica as fotos aos modelos. O arquivo manda: modelo que saiu dele fica sem foto.
function aplicarFotos(db, fotos) {
  db.exec('UPDATE modelos SET foto_url = NULL, foto_autor = NULL, foto_licenca = NULL, foto_pagina = NULL');
  const up = db.prepare(`UPDATE modelos SET foto_url = ?, foto_autor = ?, foto_licenca = ?, foto_pagina = ?
    WHERE slug = ? AND marca_id = (SELECT id FROM marcas WHERE slug = ?)`);
  let n = 0;
  for (const [chave, f] of Object.entries(fotos)) {
    const [marca, modelo] = chave.split('/');
    n += Number(up.run(f.url, f.autor ?? null, f.licenca ?? null, f.pagina ?? null, modelo, marca).changes);
  }
  return n;
}

export function carregarFotos(db, arquivo = FOTOS) {
  const { fotos, erros } = lerFotos(arquivo);
  if (erros.length) throw new Error(erros.join('\n'));
  return fotos ? transacao(db, () => aplicarFotos(db, fotos)) : 0;
}

const COLUNAS_FICHA = ['motor_codigo', 'cilindrada_cc', 'cilindros', 'valvulas', 'aspiracao', 'injecao', 'combustivel',
  'potencia_cv', 'potencia_cv_etanol', 'potencia_rpm', 'torque_kgfm', 'torque_kgfm_etanol', 'torque_rpm',
  'bateria_kwh', 'autonomia_km', 'recarga_dc_kw', 'cambio', 'marchas', 'tracao', 'zero_a_cem_s', 'vel_max_kmh',
  'consumo_urbano_gasolina', 'consumo_estrada_gasolina', 'consumo_urbano_etanol', 'consumo_estrada_etanol',
  'comprimento_mm', 'largura_mm', 'altura_mm', 'entre_eixos_mm', 'porta_malas_l', 'tanque_l', 'peso_kg',
  'suspensao_dianteira', 'suspensao_traseira', 'freios_dianteiros', 'freios_traseiros', 'pneus'];

const n = (x) => (x === undefined ? null : x);
const str = (x) => (x == null ? null : String(x));

function valoresFicha(v) {
  const mo = v.motor ?? {}, el = v.eletrico ?? {}, tr = v.transmissao ?? {}, de = v.desempenho ?? {};
  const co = v.consumo ?? {}, di = v.dimensoes ?? {}, su = v.suspensao ?? {}, fr = v.freios ?? {};
  return [
    n(mo.codigo), n(mo.cilindrada_cc), n(mo.cilindros), n(mo.valvulas), n(mo.aspiracao), n(mo.injecao), n(mo.combustivel),
    n(mo.potencia_cv), n(mo.potencia_cv_etanol), str(mo.potencia_rpm), n(mo.torque_kgfm), n(mo.torque_kgfm_etanol), str(mo.torque_rpm),
    n(el.bateria_kwh), n(el.autonomia_km), n(el.recarga_dc_kw), n(tr.cambio), n(tr.marchas), n(tr.tracao),
    n(de.zero_a_cem_s), n(de.vel_max_kmh),
    n(co.urbano_gasolina), n(co.estrada_gasolina), n(co.urbano_etanol), n(co.estrada_etanol),
    n(di.comprimento_mm), n(di.largura_mm), n(di.altura_mm), n(di.entre_eixos_mm), n(di.porta_malas_l), n(di.tanque_l), n(di.peso_kg),
    n(su.dianteira), n(su.traseira), n(fr.dianteiros), n(fr.traseiros), n(v.pneus),
  ];
}

export function popular(db, dir = DIR_FICHAS, { arquivoFontes = ARQUIVO_FONTES, arquivoFotos = FOTOS } = {}) {
  // 1. Lê e valida tudo antes de tocar no banco
  const { marcas, fontes, erros } = lerFichas(dir, { arquivoFontes });
  const { fotos, erros: errosFotos } = lerFotos(arquivoFotos);
  erros.push(...errosFotos);
  if (erros.length) throw new Error(`Fichas inválidas (nada foi gravado):\n${erros.join('\n')}`);

  const upFonte = db.prepare(`INSERT INTO fontes (chave, tipo, titulo, url, data_referencia, observacao) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(chave) DO UPDATE SET tipo = excluded.tipo, titulo = excluded.titulo, url = excluded.url,
      data_referencia = excluded.data_referencia, observacao = excluded.observacao RETURNING id`);
  const upMarca = db.prepare(`INSERT INTO marcas (nome, slug, pais) VALUES (?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET nome = excluded.nome, pais = excluded.pais RETURNING id`);
  const upModelo = db.prepare(`INSERT INTO modelos (marca_id, nome, slug, categoria) VALUES (?, ?, ?, ?)
    ON CONFLICT(marca_id, slug) DO UPDATE SET nome = excluded.nome, categoria = excluded.categoria RETURNING id`);
  const upGeracao = db.prepare(`INSERT INTO geracoes (modelo_id, nome, ano_inicio, ano_fim) VALUES (?, ?, ?, ?)
    ON CONFLICT(modelo_id, nome) DO UPDATE SET ano_inicio = excluded.ano_inicio, ano_fim = excluded.ano_fim RETURNING id`);
  const upVersao = db.prepare(`INSERT INTO versoes (geracao_id, modelo_id, nome, ano_modelo, slug, carroceria, portas, lugares, status_dados)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(modelo_id, nome, ano_modelo) DO UPDATE SET geracao_id = excluded.geracao_id, slug = excluded.slug,
      carroceria = excluded.carroceria, portas = excluded.portas, lugares = excluded.lugares,
      status_dados = excluded.status_dados, atualizado_em = datetime('now')
    RETURNING id`);
  const upFicha = db.prepare(`INSERT OR REPLACE INTO fichas (versao_id, ${COLUNAS_FICHA.join(', ')})
    VALUES (?, ${COLUNAS_FICHA.map(() => '?').join(', ')})`);
  const fipeManual = db.prepare('UPDATE versoes SET fipe_codigo = ?, fipe_auto = 0 WHERE id = ?');
  // código FIPE manual que saiu do JSON: limpa para o vínculo automático refazer
  const fipeSemManual = db.prepare('UPDATE versoes SET fipe_codigo = NULL WHERE id = ? AND fipe_auto = 0');
  const delFontesVersao = db.prepare('DELETE FROM ficha_fontes WHERE versao_id = ?');
  const insFonteVersao = db.prepare('INSERT OR IGNORE INTO ficha_fontes (versao_id, secao, fonte_id) VALUES (?, ?, ?)');
  const delBusca = db.prepare('DELETE FROM busca WHERE versao_id = ?');
  const insBusca = db.prepare('INSERT INTO busca (texto, versao_id) VALUES (?, ?)');

  // Versões verificadas no banco que o JSON não marca mais como verificadas (avisado no fim)
  const verificadasAntes = new Set(db.prepare(`SELECT ma.slug || '|' || mo.slug || '|' || v.nome || '|' || v.ano_modelo AS k
    FROM versoes v JOIN modelos mo ON mo.id = v.modelo_id JOIN marcas ma ON ma.id = mo.marca_id
    WHERE v.status_dados = 'verificado'`).all().map((r) => r.k));
  const desverificadas = [];

  let totalVersoes = 0;
  const resultado = transacao(db, () => {
    // 2. Remove primeiro o que não está mais nos JSON (assim uma versão movida de modelo
    //    ou renomeada não esbarra no endereço antigo). Marcas ficam: a FIPE também usa.
    db.exec(`CREATE TEMP TABLE IF NOT EXISTS _chaves (marca TEXT, modelo TEXT, nome TEXT, ano INTEGER, PRIMARY KEY (marca, modelo, nome, ano));
      DELETE FROM _chaves;`);
    const insChave = db.prepare('INSERT OR IGNORE INTO _chaves VALUES (?, ?, ?, ?)');
    for (const { dados } of marcas) {
      for (const m of dados.modelos) for (const g of m.geracoes) for (const v of g.versoes) {
        insChave.run(slugify(dados.marca.nome), slugify(m.nome), v.nome, v.ano_modelo);
      }
    }
    const obsoletas = `SELECT v.id FROM versoes v JOIN modelos mo ON mo.id = v.modelo_id JOIN marcas ma ON ma.id = mo.marca_id
      WHERE NOT EXISTS (SELECT 1 FROM _chaves c WHERE c.marca = ma.slug AND c.modelo = mo.slug AND c.nome = v.nome AND c.ano = v.ano_modelo)`;
    db.exec(`DELETE FROM busca WHERE versao_id IN (${obsoletas})`);
    const { changes } = db.prepare(`DELETE FROM versoes WHERE id IN (${obsoletas})`).run();

    // 3. Fontes
    const idFonte = new Map();
    for (const [chave, f] of Object.entries(fontes)) {
      idFonte.set(chave, upFonte.get(chave, f.tipo, f.titulo, n(f.url), n(f.data), n(f.observacao)).id);
    }
    const chaves = [...idFonte.keys()];
    db.prepare(`DELETE FROM fontes WHERE chave NOT IN (${chaves.map(() => '?').join(',') || "''"})`).run(...chaves);

    // 4. Marcas, modelos, gerações e uma ficha por versão e ano-modelo
    for (const { dados } of marcas) {
      const { id: marcaId } = upMarca.get(dados.marca.nome, slugify(dados.marca.nome), n(dados.marca.pais));
      for (const m of dados.modelos) {
        const { id: modeloId } = upModelo.get(marcaId, m.nome, slugify(m.nome), m.categoria);
        for (const g of m.geracoes) {
          const { id: geracaoId } = upGeracao.get(modeloId, g.nome, g.ano_inicio, n(g.ano_fim));
          for (const v of g.versoes) {
            const slug = slugify(`${dados.marca.nome} ${m.nome} ${v.nome} ${v.ano_modelo}`);
            const chaveVersao = `${slugify(dados.marca.nome)}|${slugify(m.nome)}|${v.nome}|${v.ano_modelo}`;
            if (verificadasAntes.has(chaveVersao) && v.status_dados !== 'verificado') desverificadas.push(`${dados.marca.nome} ${m.nome} ${v.nome} ${v.ano_modelo}`);
            const { id: versaoId } = upVersao.get(geracaoId, modeloId, v.nome, v.ano_modelo, slug,
              n(v.carroceria) ?? m.categoria, n(v.portas), n(v.lugares), v.status_dados ?? 'verificar');
            upFicha.run(versaoId, ...valoresFicha(v));
            if (v.fipe_codigo) fipeManual.run(v.fipe_codigo, versaoId);
            else fipeSemManual.run(versaoId);
            delFontesVersao.run(versaoId);
            for (const [secao, lista] of Object.entries(fontesPorSecao(v.fontes))) {
              for (const chave of lista) insFonteVersao.run(versaoId, secao, idFonte.get(chave));
            }
            delBusca.run(versaoId);
            insBusca.run([dados.marca.nome, m.nome, v.nome, g.nome, m.categoria, v.motor?.codigo, v.motor?.combustivel, v.ano_modelo]
              .filter(Boolean).join(' '), versaoId);
            totalVersoes++;
          }
        }
      }
    }

    // 5. Gerações e modelos que ficaram sem versões
    db.exec(`DELETE FROM geracoes WHERE id NOT IN (SELECT DISTINCT geracao_id FROM versoes);
      DELETE FROM modelos WHERE id NOT IN (SELECT DISTINCT modelo_id FROM versoes);
      DROP TABLE _chaves;`);

    // 6. Fotos e vínculo com a FIPE, na mesma transação (tudo ou nada)
    const nFotos = fotos ? aplicarFotos(db, fotos) : 0;
    const fipe = vincularFipe(db, { emTransacao: false });
    return { removidas: Number(changes), nFotos, fipe };
  });
  return {
    arquivos: marcas.length, versoes: totalVersoes, removidas: resultado.removidas, fontes: Object.keys(fontes).length,
    fotos: resultado.nFotos, fipe_vinculadas: resultado.fipe.vinculadas, desverificadas,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = abrirBanco();
  let r;
  try { r = popular(db); }
  catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
  const c = db.prepare(`SELECT (SELECT count(*) FROM marcas) marcas, (SELECT count(*) FROM modelos) modelos,
    (SELECT count(*) FROM versoes) versoes, (SELECT count(*) FROM fipe_veiculos) fipe`).get();
  console.log(`✓ ${r.versoes} fichas carregadas de ${r.arquivos} arquivos → ${DB_PATH}`);
  if (r.removidas) console.log(`  ${r.removidas} ficha(s) removida(s) do banco porque não existem mais nos JSON`);
  if (r.desverificadas.length) {
    console.warn(`  Aviso: ${r.desverificadas.length} ficha(s) estavam verificadas no banco e voltaram a "a verificar", porque o JSON`
      + ' não as marca como verificadas (o JSON é a fonte de verdade). Para manter, adicione "status_dados": "verificado" no JSON:');
    for (const nome of r.desverificadas.slice(0, 20)) console.warn(`    - ${nome}`);
    if (r.desverificadas.length > 20) console.warn(`    … e mais ${r.desverificadas.length - 20}`);
  }
  console.log(`  Banco: ${c.marcas} marcas, ${c.modelos} modelos, ${c.versoes} versões, ${c.fipe} registros FIPE`);
  console.log(`  ${r.fontes} fontes · ${r.fotos} modelos com foto · ${r.fipe_vinculadas} versões ligadas a um preço FIPE`);
}
