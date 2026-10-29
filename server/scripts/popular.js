// Carrega as fichas JSON (server/data/fichas) no banco SQLite. Idempotente:
// pode rodar de novo após editar os JSON — atualiza sem duplicar e preserva
// versões marcadas como "verificado" e os dados FIPE já importados.
// Uso: npm run db:popular
import '../env.js';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco, slugify, transacao, DB_PATH } from '../db.js';
import { validarArquivo } from './validar.js';
import { vincularFipe } from '../fipe-vinculo.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fichas');
export const FOTOS = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fotos.json');

// fotos.json: { "marca-slug/modelo-slug": { url, autor, licenca, pagina } } (gerado por npm run db:fotos)
export function carregarFotos(db, arquivo = FOTOS) {
  if (!existsSync(arquivo)) return 0;
  const fotos = JSON.parse(readFileSync(arquivo, 'utf8'));
  const up = db.prepare(`UPDATE modelos SET foto_url = ?, foto_autor = ?, foto_licenca = ?, foto_pagina = ?
    WHERE slug = ? AND marca_id = (SELECT id FROM marcas WHERE slug = ?)`);
  let n = 0;
  for (const [chave, f] of Object.entries(fotos)) {
    if (!f?.url) continue;
    const [marca, modelo] = chave.split('/');
    n += Number(up.run(f.url, f.autor ?? null, f.licenca ?? null, f.pagina ?? null, modelo, marca).changes);
  }
  return n;
}

export function popular(db, dir = DIR) {
  const arquivos = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

  const upMarca = db.prepare(`INSERT INTO marcas (nome, slug, pais) VALUES (?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET nome = excluded.nome, pais = coalesce(excluded.pais, pais) RETURNING id`);
  const upModelo = db.prepare(`INSERT INTO modelos (marca_id, nome, slug, categoria) VALUES (?, ?, ?, ?)
    ON CONFLICT(marca_id, slug) DO UPDATE SET nome = excluded.nome, categoria = excluded.categoria RETURNING id`);
  const upGeracao = db.prepare(`INSERT INTO geracoes (modelo_id, nome, ano_inicio, ano_fim) VALUES (?, ?, ?, ?)
    ON CONFLICT(modelo_id, nome) DO UPDATE SET ano_inicio = excluded.ano_inicio, ano_fim = excluded.ano_fim RETURNING id`);
  const upVersao = db.prepare(`INSERT INTO versoes (geracao_id, modelo_id, nome, ano_modelo, slug, carroceria, portas, lugares, status_dados)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, coalesce(?, 'verificar'))
    ON CONFLICT(modelo_id, nome, ano_modelo) DO UPDATE SET geracao_id = excluded.geracao_id, carroceria = excluded.carroceria,
      portas = excluded.portas, lugares = excluded.lugares, atualizado_em = datetime('now'),
      status_dados = CASE WHEN ? IS NOT NULL THEN excluded.status_dados ELSE status_dados END
    RETURNING id`);
  const colunas = ['motor_codigo', 'cilindrada_cc', 'cilindros', 'valvulas', 'aspiracao', 'injecao', 'combustivel',
    'potencia_cv', 'potencia_cv_etanol', 'potencia_rpm', 'torque_kgfm', 'torque_kgfm_etanol', 'torque_rpm',
    'bateria_kwh', 'autonomia_km', 'recarga_dc_kw', 'cambio', 'marchas', 'tracao', 'zero_a_cem_s', 'vel_max_kmh',
    'consumo_urbano_gasolina', 'consumo_estrada_gasolina', 'consumo_urbano_etanol', 'consumo_estrada_etanol',
    'comprimento_mm', 'largura_mm', 'altura_mm', 'entre_eixos_mm', 'porta_malas_l', 'tanque_l', 'peso_kg',
    'suspensao_dianteira', 'suspensao_traseira', 'freios_dianteiros', 'freios_traseiros', 'pneus'];
  const upFicha = db.prepare(`INSERT OR REPLACE INTO fichas (versao_id, ${colunas.join(', ')})
    VALUES (?, ${colunas.map(() => '?').join(', ')})`);
  const setFipe = db.prepare('UPDATE versoes SET fipe_codigo = ?, fipe_auto = 0 WHERE id = ?');
  const delBusca = db.prepare('DELETE FROM busca WHERE versao_id = ?');
  const insBusca = db.prepare('INSERT INTO busca (texto, versao_id) VALUES (?, ?)');

  const n = (x) => (x === undefined ? null : x);
  const str = (x) => (x == null ? null : String(x));
  let totalVersoes = 0;

  transacao(db, () => {
    for (const arq of arquivos) {
      const dados = JSON.parse(readFileSync(join(dir, arq), 'utf8'));
      const { erros } = validarArquivo(dados, arq);
      if (erros.length) throw new Error(`Arquivo inválido:\n${erros.join('\n')}`);

      const { id: marcaId } = upMarca.get(dados.marca.nome, slugify(dados.marca.nome), n(dados.marca.pais));
      for (const m of dados.modelos) {
        const { id: modeloId } = upModelo.get(marcaId, m.nome, slugify(m.nome), m.categoria);
        for (const g of m.geracoes) {
          const { id: geracaoId } = upGeracao.get(modeloId, g.nome, g.ano_inicio, n(g.ano_fim));
          for (const v of g.versoes ?? []) {
            const slug = slugify(`${dados.marca.nome} ${m.nome} ${v.nome} ${v.ano_modelo}`);
            const status = n(v.status_dados);
            const { id: versaoId } = upVersao.get(geracaoId, modeloId, v.nome, v.ano_modelo, slug,
              n(v.carroceria) ?? m.categoria, n(v.portas), n(v.lugares), status, status);
            const mo = v.motor ?? {}, el = v.eletrico ?? {}, tr = v.transmissao ?? {}, de = v.desempenho ?? {};
            const co = v.consumo ?? {}, di = v.dimensoes ?? {}, su = v.suspensao ?? {}, fr = v.freios ?? {};
            upFicha.run(versaoId,
              n(mo.codigo), n(mo.cilindrada_cc), n(mo.cilindros), n(mo.valvulas), n(mo.aspiracao), n(mo.injecao), n(mo.combustivel),
              n(mo.potencia_cv), n(mo.potencia_cv_etanol), str(mo.potencia_rpm), n(mo.torque_kgfm), n(mo.torque_kgfm_etanol), str(mo.torque_rpm),
              n(el.bateria_kwh), n(el.autonomia_km), n(el.recarga_dc_kw), n(tr.cambio), n(tr.marchas), n(tr.tracao),
              n(de.zero_a_cem_s), n(de.vel_max_kmh),
              n(co.urbano_gasolina), n(co.estrada_gasolina), n(co.urbano_etanol), n(co.estrada_etanol),
              n(di.comprimento_mm), n(di.largura_mm), n(di.altura_mm), n(di.entre_eixos_mm), n(di.porta_malas_l), n(di.tanque_l), n(di.peso_kg),
              n(su.dianteira), n(su.traseira), n(fr.dianteiros), n(fr.traseiros), n(v.pneus));
            if (v.fipe_codigo) setFipe.run(String(v.fipe_codigo), versaoId);
            delBusca.run(versaoId);
            insBusca.run([dados.marca.nome, m.nome, v.nome, g.nome, m.categoria, mo.codigo, mo.combustivel, v.ano_modelo]
              .filter(Boolean).join(' '), versaoId);
            totalVersoes++;
          }
        }
      }
    }
  });
  const fotos = carregarFotos(db);
  const fipe = vincularFipe(db);
  return { arquivos: arquivos.length, versoes: totalVersoes, fotos, fipe_vinculadas: fipe.vinculadas };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = abrirBanco();
  const r = popular(db);
  const c = db.prepare(`SELECT (SELECT count(*) FROM marcas) marcas, (SELECT count(*) FROM modelos) modelos,
    (SELECT count(*) FROM versoes) versoes, (SELECT count(*) FROM fipe_veiculos) fipe`).get();
  console.log(`✓ ${r.versoes} versões carregadas de ${r.arquivos} arquivos → ${DB_PATH}`);
  console.log(`  Banco: ${c.marcas} marcas, ${c.modelos} modelos, ${c.versoes} versões, ${c.fipe} registros FIPE`);
  console.log(`  ${r.fotos} modelos com foto · ${r.fipe_vinculadas} versões ligadas a um preço FIPE`);
}
