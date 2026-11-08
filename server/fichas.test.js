// Testes do formato das fichas (faixas de anos, mudanças, fontes) e da carga no banco. Uso: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco } from './db.js';
import { anosTexto, expandirVersao, fontesPorSecao, lerFichas, mesclar, validarArquivo, validarFontes } from './fichas.js';
import { popular } from './scripts/popular.js';
import { fichaCompleta } from './consultas.js';

// Versão mínima válida (formato 2)
const base = () => ({
  nome: 'Highline 1.0 TSI',
  anos: [2018, 2021],
  carroceria: 'Hatch', portas: 4, lugares: 5,
  motor: { codigo: 'EA211', cilindrada_cc: 999, combustivel: 'Flex', potencia_cv: 116, potencia_cv_etanol: 128 },
  transmissao: { cambio: 'Automático', marchas: 6, tracao: 'Dianteira' },
  dimensoes: { porta_malas_l: 300 },
  pneus: '195/55 R16',
});
const arquivo = (versoes, extra = {}) => ({
  marca: { nome: 'Marca Teste', pais: 'Brasil' },
  modelos: [{ nome: 'Carro', categoria: 'Hatch', geracoes: [{ nome: '1ª geração', ano_inicio: 2015, ano_fim: 2024, versoes }] }],
  ...extra,
});
const fichasDe = (r) => r.expandido.modelos[0].geracoes[0].versoes;

test('mesclar: objetos combinam, null apaga, listas substituem, entrada não é alterada', () => {
  const a = { motor: { potencia_cv: 100, torque_kgfm: 10 }, pneus: 'x', lista: [1, 2] };
  const b = mesclar(a, { motor: { potencia_cv: 110 }, pneus: null, lista: [3] });
  assert.deepEqual(b, { motor: { potencia_cv: 110, torque_kgfm: 10 }, pneus: null, lista: [3] });
  assert.equal(a.motor.potencia_cv, 100);
});

test('faixa de anos gera uma ficha por ano, com mudanças acumuladas', () => {
  const v = { ...base(), mudancas: { 2020: { motor: { potencia_cv: 109 } }, 2021: { pneus: '205/50 R17', dimensoes: { porta_malas_l: null } } } };
  const fichas = expandirVersao(v);
  assert.deepEqual(fichas.map((f) => f.ano_modelo), [2018, 2019, 2020, 2021]);
  assert.deepEqual(fichas.map((f) => f.motor.potencia_cv), [116, 116, 109, 109]); // vale do ano em diante
  assert.equal(fichas[3].motor.potencia_cv_etanol, 128); // campos não citados continuam
  assert.deepEqual(fichas.map((f) => f.pneus), ['195/55 R16', '195/55 R16', '195/55 R16', '205/50 R17']);
  assert.equal(fichas[3].dimensoes.porta_malas_l, null);
  for (const f of fichas) assert.ok(!('anos' in f) && !('mudancas' in f));
});

test('formato antigo (ano_modelo) continua válido', () => {
  const { anos: _a, ...v1 } = base();
  const r = validarArquivo(arquivo([{ ...v1, ano_modelo: 2019 }]), 't.json');
  assert.deepEqual(r.erros, []);
  assert.deepEqual(fichasDe(r).map((f) => f.ano_modelo), [2019]);
});

test('erros de estrutura do formato 2 são apontados', () => {
  const casos = [
    [{ ...base(), ano_modelo: 2019 }, /não os dois/],
    [{ ...base(), anos: [2021, 2018] }, /primeiro ≤ último/],
    [{ ...base(), anos: null }, /primeiro ≤ último/],
    [{ ...base(), mudancas: { 2018: { pneus: 'x' } } }, /fora da faixa.*primeiro ano vai na base/],
    [{ ...base(), mudancas: { 2025: { pneus: 'x' } } }, /fora da faixa/],
    [{ ...base(), mudancas: { 2020: { nome: 'Outro' } } }, /"nome" não pode aparecer dentro de "mudancas"/],
    [{ ...base(), mudancas: { 2020: { motor: { potencia: 120 } } } }, /campo desconhecido "motor.potencia"/],
    [{ ...base(), consumos: {} }, /campo desconhecido "consumos"/],
    [{ ...base(), motor: { ...base().motor, potencia_cv: '116' } }, /motor.potencia_cv inválido/],
    [{ ...base(), fipe_codigo: '5540-0' }, /formato 000000-0/],
  ];
  for (const [v, esperado] of casos) {
    const { erros } = validarArquivo(arquivo([v]), 't.json');
    assert.ok(erros.some((e) => esperado.test(e)), `esperava ${esperado} em: ${erros.join(' | ')}`);
  }
});

test('valores ruins numa mudança aparecem com os anos afetados, em uma linha só', () => {
  const v = { ...base(), mudancas: { 2020: { motor: { potencia_cv: 5000 } } } };
  const { erros } = validarArquivo(arquivo([v]), 't.json');
  assert.equal(erros.length, 1);
  assert.match(erros[0], /Highline 1.0 TSI 2020–2021: motor.potencia_cv=5000 fora da faixa/);
});

test('ano fora da geração e duplicata entre faixa e ano avulso', () => {
  const fora = validarArquivo(arquivo([{ ...base(), anos: [2023, 2026] }]), 't.json');
  assert.ok(fora.erros.some((e) => /2025–2026: ano fora da geração \(2015–2024\)/.test(e)), fora.erros.join(' | '));
  const { anos: _a, ...v1 } = base();
  const dup = validarArquivo(arquivo([base(), { ...v1, ano_modelo: 2020 }]), 't.json');
  assert.ok(dup.erros.some((e) => /2020: versão duplicada/.test(e)), dup.erros.join(' | '));
});

test('fontes: seções, "*" e chaves inexistentes', () => {
  // "*" vale para as seções não listadas; uma seção listada substitui o "*"
  const porSecao = fontesPorSecao({ '*': ['ficha'], consumo: ['pbev'] });
  assert.deepEqual(porSecao.motor, ['ficha']);
  assert.deepEqual(porSecao.consumo, ['pbev']);
  assert.deepEqual(fontesPorSecao({ '*': ['ficha'], consumo: null }).consumo, undefined);
  assert.deepEqual(fontesPorSecao({ consumo: ['c'] }), { consumo: ['c'] });
  // numa mudança de ano, trocar só a fonte do consumo
  const [f2018, f2021] = [2018, 2021].map((a) => expandirVersao({ ...base(), fontes: { '*': ['ficha'] }, mudancas: { 2021: { fontes: { consumo: ['pbev'] } } } }).find((f) => f.ano_modelo === a));
  assert.deepEqual(fontesPorSecao(f2018.fontes).consumo, ['ficha']);
  assert.deepEqual(fontesPorSecao(f2021.fontes).consumo, ['pbev']);
  assert.deepEqual(fontesPorSecao(f2021.fontes).motor, ['ficha']);
  const registro = { 'ficha-vw': { tipo: 'fabricante', titulo: 'Ficha técnica' } };
  const ok = validarArquivo(arquivo([{ ...base(), fontes: { motor: ['ficha-vw'] } }]), 't.json', { fontes: registro });
  assert.deepEqual(ok.erros, []);
  const ruim = validarArquivo(arquivo([{ ...base(), fontes: { motorr: ['nao-existe'] } }]), 't.json', { fontes: registro });
  assert.ok(ruim.erros.some((e) => /seção de fonte desconhecida "motorr"/.test(e)));
  assert.ok(ruim.erros.some((e) => /fonte "nao-existe" não existe/.test(e)));
  assert.equal(validarFontes({ 'Chave Ruim': { tipo: 'blog', titulo: '', url: 'ftp://x', data: '05/11/2026' } }).length, 5);
});

test('modelo ou geração repetidos no mesmo arquivo são recusados', () => {
  const dados = arquivo([base()]);
  dados.modelos.push(structuredClone(dados.modelos[0]));
  dados.modelos[1].geracoes[0].versoes[0].anos = [2022, 2023];
  const { erros } = validarArquivo(dados, 't.json');
  assert.ok(erros.some((e) => /Carro: modelo repetido no arquivo/.test(e)), erros.join(' | '));
  const gen = arquivo([base()]);
  gen.modelos[0].geracoes.push({ ...structuredClone(gen.modelos[0].geracoes[0]), versoes: [] });
  assert.ok(validarArquivo(gen, 't.json').erros.some((e) => /geração repetida/.test(e)));
});

test('estruturas malformadas viram erro, não exceção', () => {
  const casos = [
    { marca: { nome: 'X' }, modelos: [null] },
    { marca: { nome: 'X' }, modelos: [{ nome: 'A', categoria: 'Hatch', geracoes: { nome: 'g' } }] },
    { marca: { nome: 'X' }, modelos: [{ nome: 'A', categoria: 'Hatch', geracoes: [null] }] },
    { marca: { nome: 'X' }, modelos: [{ nome: 'A', categoria: 'Hatch', geracoes: [{ nome: 'g', ano_inicio: 2020, versoes: [null] }] }] },
    { marca: { nome: 'X' }, modelos: [{ nome: 'A', categoria: 'Hatch', geracoes: [{ nome: 'g', ano_inicio: 2020, versoes: { a: 1 } }] }] },
    { marca: 'X', modelos: 'Y' },
  ];
  for (const dados of casos) {
    const r = validarArquivo(dados, 't.json');
    assert.ok(r.erros.length > 0, JSON.stringify(dados));
    assert.equal(r.expandido, null);
  }
});

test('anosTexto agrupa anos seguidos', () => {
  assert.equal(anosTexto([2022, 2018, 2019, 2020]), '2018–2020, 2022');
  assert.equal(anosTexto([2025]), '2025');
});

// ---------- carga no banco ----------

function cenario(t, arquivos, fontes = {}) {
  const raiz = mkdtempSync(join(tmpdir(), 'findcar-fichas-'));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  const dir = join(raiz, 'fichas');
  mkdirSync(dir);
  const escrever = (novos, novasFontes = fontes) => {
    for (const f of Object.keys(arquivos)) rmSync(join(dir, f), { force: true });
    for (const [nome, dados] of Object.entries(novos)) writeFileSync(join(dir, nome), JSON.stringify(dados));
    writeFileSync(join(raiz, 'fontes.json'), JSON.stringify(novasFontes));
  };
  escrever(arquivos);
  const db = abrirBanco(join(raiz, 'b.db'));
  t.after(() => db.close());
  const carregar = () => popular(db, dir, { arquivoFontes: join(raiz, 'fontes.json'), arquivoFotos: join(raiz, 'sem-fotos.json') });
  return { db, dir, escrever, carregar };
}

test('carga: faixa vira uma linha por ano, com endereço por ano e fontes por seção', (t) => {
  const fontes = { 'ficha-teste': { tipo: 'fabricante', titulo: 'Ficha técnica de teste', url: 'https://exemplo.com/ficha', data: '2026-11' } };
  const v = { ...base(), fontes: { '*': ['ficha-teste'] }, mudancas: { 2020: { motor: { potencia_cv: 109 } } } };
  const { db, carregar } = cenario(t, { 'teste.json': arquivo([v]) }, fontes);
  const r = carregar();
  assert.equal(r.versoes, 4);
  const linhas = db.prepare(`SELECT v.slug, f.potencia_cv FROM versoes v JOIN fichas f ON f.versao_id = v.id ORDER BY v.ano_modelo`).all();
  assert.deepEqual(linhas.map((l) => l.slug), [2018, 2019, 2020, 2021].map((a) => `marca-teste-carro-highline-1-0-tsi-${a}`));
  assert.deepEqual(linhas.map((l) => l.potencia_cv), [116, 116, 109, 109]);
  const secoes = db.prepare(`SELECT secao FROM ficha_fontes ff JOIN versoes v ON v.id = ff.versao_id WHERE v.ano_modelo = 2019 ORDER BY secao`).all().map((x) => x.secao);
  assert.deepEqual(secoes, ['chassi', 'consumo', 'desempenho', 'dimensoes', 'eletrico', 'geral', 'motor', 'transmissao']);
  assert.equal(db.prepare('SELECT url FROM fontes WHERE chave = ?').get('ficha-teste').url, 'https://exemplo.com/ficha');
  // a API devolve as fontes com as seções cobertas
  const ficha = fichaCompleta(db, 'marca-teste-carro-highline-1-0-tsi-2020');
  assert.equal(ficha.motor.potencia_cv, 109);
  assert.equal(ficha.fontes.length, 1);
  assert.equal(ficha.fontes[0].titulo, 'Ficha técnica de teste');
  assert.ok(ficha.fontes[0].secoes.includes('motor') && ficha.fontes[0].secoes.includes('chassi'));
});

test('carga: o banco segue o Git (remove o que saiu, status e FIPE manual vêm do JSON)', (t) => {
  const v = { ...base(), status_dados: 'verificado', fipe_codigo: '005540-0' };
  const outra = { ...base(), nome: 'Comfortline 1.0 TSI', anos: [2018, 2019] };
  const { db, escrever, carregar } = cenario(t, { 'teste.json': arquivo([v, outra]) }, { f1: { tipo: 'outro', titulo: 'x' } });
  carregar();
  assert.equal(db.prepare('SELECT count(*) n FROM versoes').get().n, 6);
  assert.equal(db.prepare("SELECT count(*) n FROM versoes WHERE status_dados = 'verificado'").get().n, 4);

  // encurta a faixa, tira a outra versão, o status, o código FIPE e a fonte
  const { status_dados: _s, fipe_codigo: _f, ...semExtras } = v;
  escrever({ 'teste.json': arquivo([{ ...semExtras, anos: [2018, 2020] }]) }, {});
  const r = carregar();
  assert.equal(r.removidas, 3);
  assert.deepEqual(db.prepare('SELECT ano_modelo FROM versoes ORDER BY ano_modelo').all().map((x) => x.ano_modelo), [2018, 2019, 2020]);
  assert.equal(db.prepare("SELECT count(*) n FROM versoes WHERE status_dados = 'verificado'").get().n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM versoes WHERE fipe_codigo IS NOT NULL').get().n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM fontes').get().n, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM busca').get().n, 3);
  assert.equal(db.prepare('SELECT count(*) n FROM fichas').get().n, 3);
});

test('carga: versão movida para outro modelo com o mesmo endereço não quebra', (t) => {
  const v = (nome) => ({ ...base(), nome, anos: [2020, 2021] });
  const antes = { marca: { nome: 'Outra' }, modelos: [
    { nome: 'Classe A', categoria: 'Hatch', geracoes: [{ nome: 'G1', ano_inicio: 2020, ano_fim: null, versoes: [v('Sedan 200')] }] }] };
  const depois = { marca: { nome: 'Outra' }, modelos: [
    { nome: 'Classe A Sedan', categoria: 'Sedan', geracoes: [{ nome: 'G1', ano_inicio: 2020, ano_fim: null, versoes: [v('200')] }] }] };
  const { db, escrever, carregar } = cenario(t, { 'outra.json': antes });
  carregar();
  escrever({ 'outra.json': depois });
  const r = carregar();
  assert.equal(r.removidas, 2);
  assert.deepEqual(db.prepare('SELECT nome FROM modelos').all().map((x) => x.nome), ['Classe A Sedan']);
  assert.equal(db.prepare("SELECT count(*) n FROM versoes WHERE slug = 'outra-classe-a-sedan-200-2020'").get().n, 1);
});

test('carga: com erro em qualquer arquivo (inclusive fotos.json), nada muda no banco', (t) => {
  const { db, dir, escrever, carregar } = cenario(t, { 'teste.json': arquivo([base()]) });
  carregar();
  const outraMarca = { ...arquivo([{ ...base(), nome: 'X', transmissao: { cambio: 'Automatica', tracao: 'Dianteira' } }]), marca: { nome: 'Outra Marca' } };
  escrever({ 'teste.json': arquivo([{ ...base(), anos: [2018, 2019] }]), 'quebrado.json': outraMarca });
  assert.throws(() => carregar(), /nada foi gravado[\s\S]*cambio/);
  assert.equal(db.prepare('SELECT count(*) n FROM versoes').get().n, 4);
  // fotos.json inválido também barra a carga inteira antes de qualquer alteração
  escrever({ 'teste.json': arquivo([{ ...base(), anos: [2018, 2019] }]) });
  const fotosRuins = join(dir, '..', 'fotos-ruins.json');
  writeFileSync(fotosRuins, JSON.stringify({ 'marca-teste/carro': { url: 'https://x/y.jpg', autor: { nome: 'objeto' } } }));
  assert.throws(() => popular(db, dir, { arquivoFontes: join(dir, '..', 'fontes.json'), arquivoFotos: fotosRuins }), /autor deve ser texto/);
  assert.equal(db.prepare('SELECT count(*) n FROM versoes').get().n, 4);
});

test('carga: aviso quando uma ficha verificada deixa de estar verificada', (t) => {
  const { db, escrever, carregar } = cenario(t, { 'teste.json': arquivo([{ ...base(), status_dados: 'verificado' }]) });
  assert.deepEqual(carregar().desverificadas, []);
  escrever({ 'teste.json': arquivo([base()]) });
  const r = carregar();
  assert.equal(r.desverificadas.length, 4);
  assert.match(r.desverificadas[0], /Marca Teste Carro Highline 1.0 TSI 2018/);
  assert.equal(db.prepare("SELECT count(*) n FROM versoes WHERE status_dados = 'verificado'").get().n, 0);
});

test('conflitos entre arquivos: mesma versão em dois arquivos e endereços repetidos', (t) => {
  const raiz = mkdtempSync(join(tmpdir(), 'findcar-conf-'));
  t.after(() => rmSync(raiz, { recursive: true, force: true }));
  writeFileSync(join(raiz, 'a.json'), JSON.stringify(arquivo([base()])));
  writeFileSync(join(raiz, 'b.json'), JSON.stringify(arquivo([{ ...base(), anos: [2021, 2022] }])));
  const slug = { marca: { nome: 'Outra' }, modelos: [
    { nome: 'Classe A', categoria: 'Hatch', geracoes: [{ nome: 'G1', ano_inicio: 2020, ano_fim: null, versoes: [{ ...base(), nome: 'Sedan 200', anos: [2020, 2020] }] }] },
    { nome: 'Classe A Sedan', categoria: 'Sedan', geracoes: [{ nome: 'G1', ano_inicio: 2020, ano_fim: null, versoes: [{ ...base(), nome: '200', anos: [2020, 2020] }] }] },
  ] };
  writeFileSync(join(raiz, 'c.json'), JSON.stringify(slug));
  const { erros } = lerFichas(raiz, { arquivoFontes: join(raiz, 'nao-existe.json') });
  assert.ok(erros.some((e) => /b.json: a marca Marca Teste já está em a.json/.test(e)), erros.join(' | '));
  assert.ok(erros.some((e) => /mesmo endereço \(outra-classe-a-sedan-200-2020\)/.test(e)), erros.join(' | '));
});
