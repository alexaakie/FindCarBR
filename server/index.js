// API do FindCarBR. Uso: npm run api  (porta 3001 por padrão)
import express from 'express';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco, DB_PATH } from './db.js';
import { popular } from './scripts/popular.js';
import * as q from './consultas.js';
import { analisarVersao, compararVersoes, iaDisponivel } from './ia.js';

const RAIZ = dirname(fileURLToPath(import.meta.url));

export function criarApp(db) {
  const app = express();
  app.use(express.json({ limit: '20kb' }));

  const rota = (fn) => (req, res, next) => {
    try {
      const r = fn(req, res);
      if (r instanceof Promise) r.catch(next);
      else if (r === null || r === undefined) res.status(404).json({ erro: 'Não encontrado' });
      else res.json(r);
    } catch (e) { next(e); }
  };

  app.get('/api/estatisticas', rota(() => ({ ...q.estatisticas(db), ia: iaDisponivel() })));
  app.get('/api/filtros', rota(() => q.filtros(db)));
  app.get('/api/marcas', rota(() => q.listarMarcas(db)));
  app.get('/api/marcas/:slug', rota((req) => q.detalharMarca(db, req.params.slug)));
  app.get('/api/modelos/:marca/:modelo', rota((req) => q.detalharModelo(db, req.params.marca, req.params.modelo)));
  app.get('/api/versoes', rota((req) => q.listarVersoes(db, req.query)));
  app.get('/api/versoes/:slug', rota((req) => q.fichaCompleta(db, req.params.slug)));
  app.get('/api/comparar', rota((req) => {
    const slugs = String(req.query.slugs ?? '').split(',').filter(Boolean).slice(0, 4);
    return slugs.map((s) => q.fichaCompleta(db, s)).filter(Boolean);
  }));
  app.get('/api/fipe', rota((req) => q.buscarFipe(db, req.query)));

  // IA: a chave do Gemini fica só no servidor (.env), nunca no navegador.
  app.post('/api/ia/analise', (req, res, next) => {
    const ficha = q.fichaCompleta(db, String(req.body?.slug ?? ''));
    if (!ficha) return res.status(404).json({ erro: 'Versão não encontrada' });
    if (!iaDisponivel()) return res.status(503).json({ erro: 'IA não configurada: defina GEMINI_API_KEY no arquivo .env' });
    analisarVersao(ficha).then((texto) => res.json({ texto })).catch(next);
  });
  app.post('/api/ia/comparar', (req, res, next) => {
    const slugs = Array.isArray(req.body?.slugs) ? req.body.slugs.slice(0, 4) : [];
    const fichas = slugs.map((s) => q.fichaCompleta(db, String(s))).filter(Boolean);
    if (fichas.length < 2) return res.status(400).json({ erro: 'Envie ao menos duas versões' });
    if (!iaDisponivel()) return res.status(503).json({ erro: 'IA não configurada: defina GEMINI_API_KEY no arquivo .env' });
    compararVersoes(fichas).then((texto) => res.json({ texto })).catch(next);
  });

  app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

  // Em produção, serve o frontend compilado (npm run build)
  const dist = join(RAIZ, '..', 'dist');
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status ?? 500).json({ erro: err.publico ?? 'Erro interno do servidor' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = abrirBanco();
  if (db.prepare('SELECT count(*) n FROM versoes').get().n === 0) {
    const r = popular(db);
    console.log(`Banco vazio — ${r.versoes} versões carregadas das fichas.`);
  }
  const porta = Number(process.env.PORT ?? 3001);
  criarApp(db).listen(porta, () => {
    console.log(`FindCarBR API em http://localhost:${porta}  (banco: ${DB_PATH})`);
    if (!iaDisponivel()) console.log('ℹ IA desativada — defina GEMINI_API_KEY no .env para ativar.');
  });
}
