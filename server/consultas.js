// Consultas ao banco usadas pela API. Separadas do Express para facilitar testes.

// Preço FIPE da versão: mesmo ano-modelo, ou "zero km" (32000) para o ano corrente
const PRECO_SQL = `(SELECT fv.valor FROM fipe_veiculos fv WHERE fv.codigo_fipe = v.fipe_codigo
  AND fv.ano_modelo IN (v.ano_modelo, 32000) ORDER BY fv.ano_modelo = v.ano_modelo DESC LIMIT 1)`;

const ORDENS = {
  preco_asc: 'preco IS NULL, preco ASC',
  preco_desc: 'preco IS NULL, preco DESC',
  relevancia: 'ma.nome, mo.nome, v.ano_modelo DESC, f.potencia_max_cv',
  destaque: `((f.zero_a_cem_s IS NOT NULL) + (coalesce(f.consumo_urbano_gasolina, f.consumo_urbano_etanol, f.autonomia_km) IS NOT NULL)
    + (f.porta_malas_l IS NOT NULL) + (mo.foto_url IS NOT NULL) * 2) DESC, v.ano_modelo DESC, f.potencia_max_cv DESC`,
  nome: 'ma.nome, mo.nome, v.nome',
  potencia_desc: 'f.potencia_max_cv IS NULL, f.potencia_max_cv DESC',
  potencia_asc: 'f.potencia_max_cv IS NULL, f.potencia_max_cv ASC',
  aceleracao: 'f.zero_a_cem_s IS NULL, f.zero_a_cem_s ASC',
  consumo: 'coalesce(f.consumo_urbano_gasolina, f.consumo_urbano_etanol) IS NULL, coalesce(f.consumo_urbano_gasolina, f.consumo_urbano_etanol) DESC',
  porta_malas: 'f.porta_malas_l IS NULL, f.porta_malas_l DESC',
  ano_desc: 'v.ano_modelo DESC, ma.nome, mo.nome',
  peso_potencia: 'f.peso_potencia IS NULL, f.peso_potencia ASC',
};

const BASE_SELECT = `
  SELECT v.id, v.slug, v.nome AS versao, v.ano_modelo, v.carroceria, v.status_dados,
         mo.nome AS modelo, mo.slug AS modelo_slug, mo.categoria, mo.foto_url,
         ma.nome AS marca, ma.slug AS marca_slug,
         g.nome AS geracao,
         f.motor_codigo, f.cilindrada_cc, f.combustivel, f.aspiracao, f.potencia_cv, f.potencia_cv_etanol,
         f.potencia_max_cv, f.torque_kgfm, f.torque_kgfm_etanol, f.cambio, f.marchas, f.tracao,
         f.zero_a_cem_s, f.vel_max_kmh, f.consumo_urbano_gasolina, f.consumo_estrada_gasolina,
         f.consumo_urbano_etanol, f.consumo_estrada_etanol, f.autonomia_km, f.porta_malas_l, f.peso_potencia,
         f.comprimento_mm, f.tanque_l, ${PRECO_SQL} AS preco
  FROM versoes v
  JOIN modelos mo ON mo.id = v.modelo_id
  JOIN marcas ma  ON ma.id = mo.marca_id
  JOIN geracoes g ON g.id = v.geracao_id
  LEFT JOIN fichas f ON f.versao_id = v.id`;

// "polo tsi" → "polo* AND tsi*" (prefixo, sem caracteres especiais do FTS)
export function termoFts(q) {
  const termos = String(q ?? '').normalize('NFC').split(/[^\p{L}\p{N}.]+/u).filter(Boolean).slice(0, 8);
  return termos.length ? termos.map((t) => `"${t.replace(/"/g, '')}"*`).join(' AND ') : null;
}

const inteiro = (x, padrao, min, max) => {
  const n = Number.parseInt(x, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : padrao;
};
const numero = (x) => (x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
const lista = (x) => (x == null || x === '' ? [] : String(x).split(',').map((s) => s.trim()).filter(Boolean));

export function listarVersoes(db, params = {}) {
  const where = [];
  const args = [];
  const fts = termoFts(params.q);
  if (fts) { where.push('v.id IN (SELECT versao_id FROM busca WHERE busca MATCH ?)'); args.push(fts); }

  const emLista = (coluna, valores) => {
    if (!valores.length) return;
    where.push(`${coluna} IN (${valores.map(() => '?').join(',')})`);
    args.push(...valores);
  };
  emLista('ma.slug', lista(params.marca));
  emLista('mo.categoria', lista(params.categoria));
  emLista('f.combustivel', lista(params.combustivel));
  emLista('f.tracao', lista(params.tracao));
  emLista('f.cambio', lista(params.cambio));
  if (params.modelo) { where.push('mo.slug = ?'); args.push(String(params.modelo)); }

  const faixas = [
    ['v.ano_modelo >= ?', numero(params.ano_min)], ['v.ano_modelo <= ?', numero(params.ano_max)],
    ['f.potencia_max_cv >= ?', numero(params.pot_min)], ['f.potencia_max_cv <= ?', numero(params.pot_max)],
    ['f.porta_malas_l >= ?', numero(params.porta_malas_min)],
    [`${PRECO_SQL} >= ?`, numero(params.preco_min)], [`${PRECO_SQL} <= ?`, numero(params.preco_max)],
  ];
  for (const [sql, val] of faixas) if (val != null) { where.push(sql); args.push(val); }
  if (params.apenas_atuais === '1') where.push('v.ano_modelo >= (SELECT max(ano_modelo) - 1 FROM versoes)');

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const ordem = ORDENS[params.ordem] ?? ORDENS.relevancia;
  const porPagina = inteiro(params.por_pagina, 24, 1, 100);
  const pagina = inteiro(params.pagina, 1, 1, 10_000);

  const { total } = db.prepare(`SELECT count(*) AS total FROM (${BASE_SELECT} ${whereSql})`).get(...args);
  const itens = db.prepare(`${BASE_SELECT} ${whereSql} ORDER BY ${ordem} LIMIT ? OFFSET ?`)
    .all(...args, porPagina, (pagina - 1) * porPagina);
  return { total, pagina, por_pagina: porPagina, paginas: Math.max(1, Math.ceil(total / porPagina)), itens };
}

export function filtros(db) {
  const distintos = (sql) => db.prepare(sql).all().map((r) => r.v);
  return {
    marcas: db.prepare(`SELECT ma.slug, ma.nome, count(v.id) AS versoes FROM marcas ma
      JOIN modelos mo ON mo.marca_id = ma.id JOIN versoes v ON v.modelo_id = mo.id GROUP BY ma.id ORDER BY ma.nome`).all(),
    categorias: distintos('SELECT DISTINCT categoria v FROM modelos WHERE categoria IS NOT NULL ORDER BY 1'),
    combustiveis: distintos('SELECT DISTINCT combustivel v FROM fichas WHERE combustivel IS NOT NULL ORDER BY 1'),
    tracoes: distintos('SELECT DISTINCT tracao v FROM fichas WHERE tracao IS NOT NULL ORDER BY 1'),
    cambios: distintos('SELECT DISTINCT cambio v FROM fichas WHERE cambio IS NOT NULL ORDER BY 1'),
    anos: db.prepare('SELECT min(ano_modelo) min, max(ano_modelo) max FROM versoes').get(),
    potencia: db.prepare('SELECT min(potencia_max_cv) min, max(potencia_max_cv) max FROM fichas WHERE potencia_max_cv > 0').get(),
  };
}

export function estatisticas(db) {
  return db.prepare(`SELECT
    (SELECT count(*) FROM marcas) AS marcas,
    (SELECT count(*) FROM modelos) AS modelos,
    (SELECT count(*) FROM versoes) AS versoes,
    (SELECT count(*) FROM versoes WHERE status_dados = 'verificado') AS verificadas,
    (SELECT count(*) FROM fipe_veiculos) AS fipe,
    (SELECT max(referencia) FROM fipe_veiculos) AS fipe_referencia`).get();
}

export function listarMarcas(db) {
  return db.prepare(`SELECT ma.slug, ma.nome, ma.pais,
      count(DISTINCT mo.id) AS modelos, count(v.id) AS versoes,
      (SELECT count(*) FROM fipe_veiculos fv WHERE fv.marca_id = ma.id) AS fipe
    FROM marcas ma LEFT JOIN modelos mo ON mo.marca_id = ma.id LEFT JOIN versoes v ON v.modelo_id = mo.id
    GROUP BY ma.id HAVING versoes > 0 OR fipe > 0 ORDER BY ma.nome`).all();
}

export function detalharMarca(db, slug) {
  const marca = db.prepare('SELECT id, slug, nome, pais FROM marcas WHERE slug = ?').get(slug);
  if (!marca) return null;
  const modelos = db.prepare(`SELECT mo.slug, mo.nome, mo.categoria, mo.foto_url, count(v.id) AS versoes,
      min(${PRECO_SQL}) AS preco_min, max(${PRECO_SQL}) AS preco_max,
      min(v.ano_modelo) AS ano_min, max(v.ano_modelo) AS ano_max,
      min(f.potencia_max_cv) AS pot_min, max(f.potencia_max_cv) AS pot_max,
      group_concat(DISTINCT f.combustivel) AS combustiveis
    FROM modelos mo JOIN versoes v ON v.modelo_id = mo.id LEFT JOIN fichas f ON f.versao_id = v.id
    WHERE mo.marca_id = ? GROUP BY mo.id ORDER BY max(v.ano_modelo) DESC, mo.nome`).all(marca.id);
  const { id, ...resto } = marca;
  const fipeModelos = db.prepare('SELECT count(DISTINCT codigo_fipe) n FROM fipe_veiculos WHERE marca_id = ?').get(id).n;
  return { ...resto, modelos, fipe_modelos: fipeModelos };
}

export function detalharModelo(db, marcaSlug, modeloSlug) {
  const modelo = db.prepare(`SELECT mo.id, mo.slug, mo.nome, mo.categoria, mo.foto_url, mo.foto_autor, mo.foto_licenca, mo.foto_pagina,
      ma.nome AS marca, ma.slug AS marca_slug
    FROM modelos mo JOIN marcas ma ON ma.id = mo.marca_id WHERE ma.slug = ? AND mo.slug = ?`).get(marcaSlug, modeloSlug);
  if (!modelo) return null;
  const geracoes = db.prepare('SELECT id, nome, ano_inicio, ano_fim FROM geracoes WHERE modelo_id = ? ORDER BY ano_inicio DESC').all(modelo.id);
  const versoes = db.prepare(`${BASE_SELECT} WHERE v.modelo_id = ? ORDER BY v.ano_modelo DESC, f.potencia_max_cv`).all(modelo.id);
  const { id: _id, ...resto } = modelo;
  return {
    ...resto,
    geracoes: geracoes.map(({ id: _gid, ...g }) => ({ ...g, versoes: versoes.filter((v) => v.geracao === g.nome) })),
    total_versoes: versoes.length,
    preco_min: Math.min(...versoes.map((v) => v.preco).filter(Boolean)) || null,
    preco_max: Math.max(...versoes.map((v) => v.preco).filter(Boolean)) || null,
  };
}

export function fichaCompleta(db, slug) {
  const row = db.prepare(`SELECT v.*, mo.nome AS modelo, mo.slug AS modelo_slug, mo.categoria,
      mo.foto_url, mo.foto_autor, mo.foto_licenca, mo.foto_pagina, ${PRECO_SQL} AS preco,
      ma.nome AS marca, ma.slug AS marca_slug, ma.pais, g.nome AS geracao, g.ano_inicio, g.ano_fim, f.*
    FROM versoes v JOIN modelos mo ON mo.id = v.modelo_id JOIN marcas ma ON ma.id = mo.marca_id
    JOIN geracoes g ON g.id = v.geracao_id LEFT JOIN fichas f ON f.versao_id = v.id WHERE v.slug = ?`).get(slug);
  if (!row) return null;

  const fipe = row.fipe_codigo
    ? db.prepare('SELECT ano_modelo, combustivel, valor, referencia FROM fipe_veiculos WHERE codigo_fipe = ? ORDER BY ano_modelo DESC').all(row.fipe_codigo)
    : [];
  const outrasVersoes = db.prepare(`SELECT v.slug, v.nome AS versao, v.ano_modelo, f.potencia_max_cv, f.cambio,
      ${PRECO_SQL} AS preco
    FROM versoes v LEFT JOIN fichas f ON f.versao_id = v.id WHERE v.modelo_id = ? AND v.id != ?
    ORDER BY v.ano_modelo DESC, f.potencia_max_cv`).all(row.modelo_id, row.id);
  // a versão mais parecida de cada modelo concorrente (no máximo 6 modelos)
  const similares = db.prepare(`SELECT * FROM (
      SELECT x.*, row_number() OVER (PARTITION BY x.modelo_slug, x.marca_slug ORDER BY x.dif) AS ordem_modelo FROM (
        ${BASE_SELECT.replace('SELECT v.id,', 'SELECT abs(f.potencia_max_cv - ?) AS dif, v.id,')}
        WHERE mo.categoria = ? AND mo.id != ? AND abs(v.ano_modelo - ?) <= 2 AND f.potencia_max_cv BETWEEN ? * 0.85 AND ? * 1.15
      ) x
    ) WHERE ordem_modelo = 1 ORDER BY dif LIMIT 6`)
    .all(row.potencia_max_cv ?? 0, row.categoria, row.modelo_id, row.ano_modelo, row.potencia_max_cv ?? 0, row.potencia_max_cv ?? 0);

  return {
    slug: row.slug, marca: row.marca, marca_slug: row.marca_slug, pais: row.pais,
    modelo: row.modelo, modelo_slug: row.modelo_slug, categoria: row.categoria,
    versao: row.nome, ano_modelo: row.ano_modelo, carroceria: row.carroceria, portas: row.portas, lugares: row.lugares,
    geracao: { nome: row.geracao, ano_inicio: row.ano_inicio, ano_fim: row.ano_fim },
    status_dados: row.status_dados, atualizado_em: row.atualizado_em, fipe_codigo: row.fipe_codigo,
    fipe_auto: Boolean(row.fipe_auto), preco: row.preco,
    foto: row.foto_url ? { url: row.foto_url, autor: row.foto_autor, licenca: row.foto_licenca, pagina: row.foto_pagina } : null,
    motor: {
      codigo: row.motor_codigo, cilindrada_cc: row.cilindrada_cc, cilindros: row.cilindros, valvulas: row.valvulas,
      aspiracao: row.aspiracao, injecao: row.injecao, combustivel: row.combustivel,
      potencia_cv: row.potencia_cv, potencia_cv_etanol: row.potencia_cv_etanol, potencia_rpm: row.potencia_rpm,
      torque_kgfm: row.torque_kgfm, torque_kgfm_etanol: row.torque_kgfm_etanol, torque_rpm: row.torque_rpm,
      potencia_max_cv: row.potencia_max_cv,
    },
    eletrico: row.bateria_kwh || row.autonomia_km
      ? { bateria_kwh: row.bateria_kwh, autonomia_km: row.autonomia_km, recarga_dc_kw: row.recarga_dc_kw } : null,
    transmissao: { cambio: row.cambio, marchas: row.marchas, tracao: row.tracao },
    desempenho: { zero_a_cem_s: row.zero_a_cem_s, vel_max_kmh: row.vel_max_kmh, peso_potencia: row.peso_potencia },
    consumo: {
      urbano_gasolina: row.consumo_urbano_gasolina, estrada_gasolina: row.consumo_estrada_gasolina,
      urbano_etanol: row.consumo_urbano_etanol, estrada_etanol: row.consumo_estrada_etanol,
    },
    dimensoes: {
      comprimento_mm: row.comprimento_mm, largura_mm: row.largura_mm, altura_mm: row.altura_mm,
      entre_eixos_mm: row.entre_eixos_mm, porta_malas_l: row.porta_malas_l, tanque_l: row.tanque_l, peso_kg: row.peso_kg,
    },
    chassi: {
      suspensao_dianteira: row.suspensao_dianteira, suspensao_traseira: row.suspensao_traseira,
      freios_dianteiros: row.freios_dianteiros, freios_traseiros: row.freios_traseiros, pneus: row.pneus,
    },
    fipe, outras_versoes: outrasVersoes, similares,
  };
}

export function buscarFipe(db, params = {}) {
  const where = [];
  const args = [];
  const fts = termoFts(params.q);
  if (fts) { where.push('codigo_fipe IN (SELECT codigo_fipe FROM busca_fipe WHERE busca_fipe MATCH ?)'); args.push(fts); }
  if (params.marca) { where.push('marca_id = (SELECT id FROM marcas WHERE slug = ?)'); args.push(String(params.marca)); }
  const ano = numero(params.ano);
  if (ano != null) { where.push('ano_modelo = ?'); args.push(ano); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const porPagina = inteiro(params.por_pagina, 50, 1, 200);
  const pagina = inteiro(params.pagina, 1, 1, 100_000);
  const { total } = db.prepare(`SELECT count(*) total FROM fipe_veiculos ${whereSql}`).get(...args);
  const itens = db.prepare(`SELECT codigo_fipe, marca_nome, modelo_nome, ano_modelo, combustivel, valor, referencia
    FROM fipe_veiculos ${whereSql} ORDER BY marca_nome, modelo_nome, ano_modelo DESC LIMIT ? OFFSET ?`)
    .all(...args, porPagina, (pagina - 1) * porPagina);
  return { total, pagina, por_pagina: porPagina, paginas: Math.max(1, Math.ceil(total / porPagina)), itens };
}
