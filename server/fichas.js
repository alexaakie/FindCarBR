// Formato das fichas técnicas (server/data/fichas/*.json): leitura, validação e expansão.
//
// Uma versão pode ser escrita de dois jeitos (ver data/FORMATO.md):
//   - formato 1: "ano_modelo": 2025                          → uma ficha
//   - formato 2: "anos": [2018, 2022] + "mudancas": {...}   → uma ficha por ano-modelo
// A expansão gera, para cada ano da faixa, a ficha base com as mudanças daquele ano e dos
// anteriores aplicadas em ordem. O banco continua com uma linha por versão e ano.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugify } from './db.js';

const DATA = join(dirname(fileURLToPath(import.meta.url)), 'data');
export const DIR_FICHAS = join(DATA, 'fichas');
export const ARQUIVO_FONTES = join(DATA, 'fontes.json');

export const ENUMS = {
  categoria: ['Hatch', 'Sedan', 'SUV', 'Picape', 'Minivan', 'Esportivo', 'Utilitário', 'Cupê', 'Conversível', 'Perua'],
  aspiracao: ['Aspirado', 'Turbo', 'Biturbo', 'Elétrico'],
  injecao: ['Direta', 'Multiponto', 'Indireta', 'Common-rail'],
  combustivel: ['Flex', 'Gasolina', 'Diesel', 'Elétrico', 'Híbrido', 'Híbrido Flex', 'Híbrido Plug-in'],
  cambio: ['Manual', 'Automático', 'CVT', 'Dupla embreagem', 'Automatizado', 'Redução única'],
  tracao: ['Dianteira', 'Traseira', 'Integral'],
  status_dados: ['verificar', 'verificado'],
  tipo_fonte: ['fabricante', 'inmetro', 'latin-ncap', 'imprensa', 'outro'],
};

// Campos de cada bloco da versão e o tipo esperado: num | txt | txt/num | nome de um ENUM
export const BLOCOS = {
  motor: {
    codigo: 'txt', cilindrada_cc: 'num', cilindros: 'num', valvulas: 'num', aspiracao: 'aspiracao', injecao: 'injecao',
    combustivel: 'combustivel', potencia_cv: 'num', potencia_cv_etanol: 'num', potencia_rpm: 'txt/num',
    torque_kgfm: 'num', torque_kgfm_etanol: 'num', torque_rpm: 'txt/num',
  },
  eletrico: { bateria_kwh: 'num', autonomia_km: 'num', recarga_dc_kw: 'num' },
  transmissao: { cambio: 'cambio', marchas: 'num', tracao: 'tracao' },
  desempenho: { zero_a_cem_s: 'num', vel_max_kmh: 'num' },
  consumo: { urbano_gasolina: 'num', estrada_gasolina: 'num', urbano_etanol: 'num', estrada_etanol: 'num' },
  dimensoes: {
    comprimento_mm: 'num', largura_mm: 'num', altura_mm: 'num', entre_eixos_mm: 'num',
    porta_malas_l: 'num', tanque_l: 'num', peso_kg: 'num',
  },
  suspensao: { dianteira: 'txt', traseira: 'txt' },
  freios: { dianteiros: 'txt', traseiros: 'txt' },
};
const ESCALARES = { carroceria: 'txt', portas: 'num', lugares: 'num', pneus: 'txt', status_dados: 'status_dados', fipe_codigo: 'txt' };

// Seções usadas para registrar fontes (e, no futuro, a verificação por seção)
export const SECOES = {
  geral: ['carroceria', 'portas', 'lugares'],
  motor: ['motor'],
  eletrico: ['eletrico'],
  transmissao: ['transmissao'],
  desempenho: ['desempenho'],
  consumo: ['consumo'],
  dimensoes: ['dimensoes'],
  chassi: ['suspensao', 'freios', 'pneus'],
};

// [mín, máx] plausíveis — pegam erros de digitação e de unidade
const FAIXAS = {
  'motor.cilindrada_cc': [600, 7000],
  'motor.potencia_cv': [40, 1000],
  'motor.potencia_cv_etanol': [40, 1000],
  'motor.torque_kgfm': [5, 120],
  'motor.torque_kgfm_etanol': [5, 120],
  'desempenho.zero_a_cem_s': [2, 25],
  'desempenho.vel_max_kmh': [100, 350],
  'consumo.urbano_gasolina': [3, 30],
  'consumo.estrada_gasolina': [3, 30],
  'consumo.urbano_etanol': [2, 25],
  'consumo.estrada_etanol': [2, 25],
  'dimensoes.comprimento_mm': [2500, 6500],
  'dimensoes.largura_mm': [1400, 2300],
  'dimensoes.altura_mm': [1000, 2200],
  'dimensoes.entre_eixos_mm': [1800, 4000],
  'dimensoes.porta_malas_l': [50, 2500],
  'dimensoes.tanque_l': [20, 150],
  'dimensoes.peso_kg': [600, 4000],
  'transmissao.marchas': [1, 10],
  'eletrico.bateria_kwh': [5, 150],
  'eletrico.autonomia_km': [30, 900],
};

const CHAVES_CONTROLE = ['nome', 'ano_modelo', 'anos', 'mudancas', 'fontes'];
const MAX_ANOS_FAIXA = 40;

const objeto = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

// Mescla profunda: objetos se combinam campo a campo; listas, números, textos e null substituem.
export function mesclar(base, delta) {
  const saida = structuredClone(base);
  for (const [k, v] of Object.entries(delta ?? {})) {
    saida[k] = objeto(v) && objeto(saida[k]) ? mesclar(saida[k], v) : structuredClone(v);
  }
  return saida;
}

// Lista de fichas (uma por ano-modelo) a partir de uma versão em qualquer dos dois formatos
export function expandirVersao(v) {
  const { anos, mudancas, ano_modelo: anoUnico, ...base } = v;
  if (anoUnico !== undefined && !anos) return [{ ...structuredClone(base), ano_modelo: anoUnico }];
  const [inicio, fim] = anos;
  const fichas = [];
  let atual = base;
  for (let ano = inicio; ano <= fim; ano++) {
    if (mudancas?.[ano]) atual = mesclar(atual, mudancas[ano]);
    fichas.push({ ...structuredClone(atual), ano_modelo: ano });
  }
  return fichas;
}

// [2018, 2019, 2020, 2022] → "2018–2020, 2022"
export function anosTexto(anos) {
  const ord = [...new Set(anos)].sort((a, b) => a - b);
  const partes = [];
  for (let i = 0; i < ord.length; i++) {
    let j = i;
    while (j + 1 < ord.length && ord[j + 1] === ord[j] + 1) j++;
    partes.push(i === j ? `${ord[i]}` : `${ord[i]}–${ord[j]}`);
    i = j;
  }
  return partes.join(', ');
}

function tipoOk(valor, tipo) {
  if (valor === null) return true;
  if (tipo === 'num') return typeof valor === 'number' && Number.isFinite(valor);
  if (tipo === 'txt') return typeof valor === 'string';
  if (tipo === 'txt/num') return typeof valor === 'string' || (typeof valor === 'number' && Number.isFinite(valor));
  return ENUMS[tipo].includes(valor);
}

// Confere chaves e tipos de um objeto de versão (base ou mudança). Não exige campos obrigatórios.
function checarCampos(v, err, { mudanca = false } = {}) {
  for (const [k, valor] of Object.entries(v)) {
    if (CHAVES_CONTROLE.includes(k)) {
      if (mudanca && k !== 'fontes') err(`"${k}" não pode aparecer dentro de "mudancas"`);
      continue;
    }
    if (k in ESCALARES) {
      if (!tipoOk(valor, ESCALARES[k])) err(`${k} inválido ${JSON.stringify(valor)}`);
      if (k === 'fipe_codigo' && valor !== null && !/^\d{6}-\d$/.test(valor)) err(`fipe_codigo deve ter o formato 000000-0 (veio ${JSON.stringify(valor)})`);
    } else if (k in BLOCOS) {
      if (valor === null) continue;
      if (!objeto(valor)) { err(`"${k}" deve ser um objeto`); continue; }
      for (const [campo, x] of Object.entries(valor)) {
        const tipo = BLOCOS[k][campo];
        if (!tipo) err(`campo desconhecido "${k}.${campo}"`);
        else if (!tipoOk(x, tipo)) err(`${k}.${campo} inválido ${JSON.stringify(x)}`);
      }
    } else {
      err(`campo desconhecido "${k}"`);
    }
  }
}

function checarFontesVersao(fontes, registro, err) {
  if (fontes === undefined || fontes === null) return;
  if (!objeto(fontes)) { err('"fontes" deve ser um objeto { seção: [chaves] }'); return; }
  for (const [secao, lista] of Object.entries(fontes)) {
    if (secao !== '*' && !(secao in SECOES)) err(`seção de fonte desconhecida "${secao}" (use ${Object.keys(SECOES).join(', ')} ou "*")`);
    if (lista === null) continue;
    if (!Array.isArray(lista) || !lista.every((x) => typeof x === 'string')) { err(`fontes.${secao} deve ser uma lista de chaves`); continue; }
    if (registro) for (const chave of lista) if (!(chave in registro)) err(`fonte "${chave}" não existe em fontes.json`);
  }
}

// Valores obrigatórios, enums e faixas plausíveis numa ficha já expandida (um ano)
function checarFicha(f, err) {
  if (!f.nome) err('nome obrigatório');
  if (!f.motor?.combustivel) err('motor.combustivel obrigatório');
  for (const campo of ['cambio', 'tracao']) {
    if (!ENUMS[campo].includes(f.transmissao?.[campo])) err(`transmissao.${campo} obrigatório (veio ${JSON.stringify(f.transmissao?.[campo] ?? null)})`);
  }
  for (const [path, [min, max]] of Object.entries(FAIXAS)) {
    const val = get(f, path);
    if (typeof val === 'number' && (val < min || val > max)) err(`${path}=${val} fora da faixa ${min}–${max}`);
  }
  if (f.motor?.combustivel === 'Elétrico' && !f.eletrico) err('elétrico sem bloco "eletrico"');
}

// Valida um arquivo de marca e devolve a versão expandida (uma ficha por ano) para carga no banco.
export function validarArquivo(dados, nome = '', { fontes: registro } = {}) {
  const erros = [];
  const em = (onde) => (msg) => erros.push(`${nome} › ${onde}: ${msg}`);
  if (!objeto(dados)) return { erros: [`${nome}: o arquivo deve conter um objeto JSON`], versoes: 0, expandido: null };
  for (const k of Object.keys(dados)) if (!['marca', 'modelos'].includes(k)) em('arquivo')(`campo desconhecido "${k}"`);
  if (!objeto(dados.marca) || typeof dados.marca.nome !== 'string' || !dados.marca.nome) em('marca')('marca.nome obrigatório');
  for (const k of Object.keys(objeto(dados.marca) ? dados.marca : {})) if (!['nome', 'pais'].includes(k)) em('marca')(`campo desconhecido "${k}"`);
  if (!Array.isArray(dados.modelos) || !dados.modelos.length) em('modelos')('lista vazia');

  const expandido = { marca: dados.marca, modelos: [] };
  let total = 0;
  const modelosVistos = new Set();
  for (const m of Array.isArray(dados.modelos) ? dados.modelos : []) {
    if (!objeto(m)) { em('modelos')('cada modelo deve ser um objeto'); continue; }
    const mOnde = m.nome ?? '(modelo sem nome)';
    const errM = em(mOnde);
    // dois blocos com o mesmo modelo fariam um sobrescrever o outro na carga
    if (m.nome && modelosVistos.has(slugify(m.nome))) errM('modelo repetido no arquivo: junte as gerações num bloco só');
    if (m.nome) modelosVistos.add(slugify(m.nome));
    if (!m.nome) errM('nome obrigatório');
    for (const k of Object.keys(m)) if (!['nome', 'categoria', 'geracoes'].includes(k)) errM(`campo desconhecido "${k}"`);
    if (!ENUMS.categoria.includes(m.categoria)) errM(`categoria inválida "${m.categoria}"`);
    if (!Array.isArray(m.geracoes) || !m.geracoes.length) errM('sem gerações');
    const chaves = new Map(); // nome|ano → onde apareceu (duplicatas no modelo)
    const geracoesVistas = new Set();
    const modeloExp = { nome: m.nome, categoria: m.categoria, geracoes: [] };

    for (const g of Array.isArray(m.geracoes) ? m.geracoes : []) {
      if (!objeto(g)) { errM('cada geração deve ser um objeto'); continue; }
      const gOnde = `${mOnde} / ${g.nome}`;
      const errG = em(gOnde);
      if (g.nome && geracoesVistas.has(g.nome)) errG('geração repetida no modelo: junte as versões num bloco só');
      geracoesVistas.add(g.nome);
      if (!g.nome) errG('geração sem nome');
      for (const k of Object.keys(g)) if (!['nome', 'ano_inicio', 'ano_fim', 'versoes'].includes(k)) errG(`campo desconhecido "${k}"`);
      if (!Number.isInteger(g.ano_inicio)) errG('ano_inicio inválido');
      if (g.ano_fim !== null && g.ano_fim !== undefined && (!Number.isInteger(g.ano_fim) || g.ano_fim < g.ano_inicio)) errG('ano_fim inválido');
      if (g.versoes !== undefined && !Array.isArray(g.versoes)) errG('"versoes" deve ser uma lista');
      const geracaoExp = { nome: g.nome, ano_inicio: g.ano_inicio, ano_fim: g.ano_fim ?? null, versoes: [] };

      for (const v of Array.isArray(g.versoes) ? g.versoes : []) {
        if (!objeto(v)) { errG('cada versão deve ser um objeto'); continue; }
        const temFaixa = v.anos !== undefined;
        const rotulo = temFaixa && Array.isArray(v.anos) ? `${v.anos[0]}–${v.anos[1]}` : (v.ano_modelo ?? '');
        const vOnde = `${gOnde} / ${v.nome} ${rotulo}`;
        const errV = em(vOnde);
        const errosAntes = erros.length;

        // estrutura dos dois formatos
        if (temFaixa === (v.ano_modelo !== undefined)) { errV('use "ano_modelo" (um ano) ou "anos" (faixa), não os dois nem nenhum'); continue; }
        if (temFaixa) {
          const [ini, fim] = Array.isArray(v.anos) ? v.anos : [];
          if (!Array.isArray(v.anos) || v.anos.length !== 2 || !Number.isInteger(ini) || !Number.isInteger(fim) || fim < ini) { errV('"anos" deve ser [primeiro, último], com primeiro ≤ último'); continue; }
          if (fim - ini > MAX_ANOS_FAIXA) { errV(`faixa de anos longa demais (${fim - ini + 1} anos)`); continue; }
        } else if (!Number.isInteger(v.ano_modelo)) { errV('ano_modelo inválido'); continue; }
        if (v.mudancas !== undefined) {
          if (!temFaixa) errV('"mudancas" só pode ser usado com "anos"');
          else if (!objeto(v.mudancas)) errV('"mudancas" deve ser um objeto { "ano": { campos } }');
          else {
            for (const [ano, delta] of Object.entries(v.mudancas)) {
              const n = Number(ano);
              if (!/^\d{4}$/.test(ano) || n <= v.anos[0] || n > v.anos[1]) errV(`mudança em "${ano}" fora da faixa: use um ano entre ${v.anos[0] + 1} e ${v.anos[1]} (o primeiro ano vai na base)`);
              if (!objeto(delta)) { errV(`mudança de ${ano} deve ser um objeto`); continue; }
              checarCampos(delta, (msg) => errV(`mudança de ${ano}: ${msg}`), { mudanca: true });
              checarFontesVersao(delta.fontes, registro, (msg) => errV(`mudança de ${ano}: ${msg}`));
            }
          }
        }
        checarCampos(v, errV);
        checarFontesVersao(v.fontes, registro, errV);
        if (erros.length > errosAntes) continue; // estrutura desta versão quebrada: não expande

        // valores de cada ano (erros iguais em vários anos viram uma linha só)
        const porMensagem = new Map();
        for (const f of expandirVersao(v)) {
          const errAno = (msg) => porMensagem.set(msg, [...(porMensagem.get(msg) ?? []), f.ano_modelo]);
          checarFicha(f, errAno);
          if (f.ano_modelo < 1950 || f.ano_modelo > 2030) errAno('ano-modelo fora de 1950–2030');
          if (f.ano_modelo < g.ano_inicio || (g.ano_fim != null && f.ano_modelo > g.ano_fim)) errAno(`ano fora da geração (${g.ano_inicio}–${g.ano_fim ?? 'atual'})`);
          const chave = `${f.nome}|${f.ano_modelo}`;
          if (chaves.has(chave)) errAno(`versão duplicada (já existe em ${chaves.get(chave)})`);
          else chaves.set(chave, g.nome);
          geracaoExp.versoes.push(f);
          total++;
        }
        for (const [msg, anos] of porMensagem) erros.push(`${nome} › ${gOnde} / ${v.nome} ${anosTexto(anos)}: ${msg}`);
      }
      modeloExp.geracoes.push(geracaoExp);
    }
    expandido.modelos.push(modeloExp);
  }
  return { erros, versoes: total, expandido: erros.length ? null : expandido };
}

// fontes.json: { "chave": { tipo, titulo, url?, data?, observacao? } }
export function validarFontes(registro, nome = 'fontes.json') {
  const erros = [];
  if (!objeto(registro)) return [`${nome}: deve conter um objeto { chave: { ... } }`];
  for (const [chave, f] of Object.entries(registro)) {
    const err = (msg) => erros.push(`${nome} › ${chave}: ${msg}`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(chave)) err('a chave deve ter só letras minúsculas, números e hífens');
    if (!objeto(f)) { err('deve ser um objeto'); continue; }
    for (const k of Object.keys(f)) if (!['tipo', 'titulo', 'url', 'data', 'observacao'].includes(k)) err(`campo desconhecido "${k}"`);
    if (!ENUMS.tipo_fonte.includes(f.tipo)) err(`tipo inválido "${f.tipo}" (use ${ENUMS.tipo_fonte.join(', ')})`);
    if (typeof f.titulo !== 'string' || !f.titulo.trim()) err('titulo obrigatório');
    if (f.url != null && !/^https?:\/\/\S+$/.test(f.url)) err('url deve começar com http:// ou https://');
    if (f.data != null && !/^\d{4}-\d{2}(-\d{2})?$/.test(f.data)) err('data deve ser AAAA-MM ou AAAA-MM-DD');
  }
  return erros;
}

export function lerFontes(arquivo = ARQUIVO_FONTES) {
  if (!existsSync(arquivo)) return { registro: {}, erros: [] };
  let registro;
  try { registro = JSON.parse(readFileSync(arquivo, 'utf8')); }
  catch (e) { return { registro: {}, erros: [`fontes.json: JSON inválido — ${e.message}`] }; }
  return { registro, erros: validarFontes(registro) };
}

// Lê e valida todas as marcas + fontes. Também confere conflitos entre arquivos
// (mesma versão/ano em dois arquivos, ou nomes diferentes que viram o mesmo endereço).
export function lerFichas(dir = DIR_FICHAS, { arquivoFontes = ARQUIVO_FONTES, arquivos: soEstes } = {}) {
  const { registro, erros } = lerFontes(arquivoFontes);
  const nomes = soEstes ?? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f));
  const marcas = [];
  let versoes = 0;
  const vistos = new Map(); // chave da versão → arquivo
  const slugs = new Map();
  for (const caminho of nomes) {
    const arq = caminho.split('/').pop();
    let dados;
    try { dados = JSON.parse(readFileSync(caminho, 'utf8')); }
    catch (e) { erros.push(`${arq}: JSON inválido — ${e.message}`); continue; }
    const r = validarArquivo(dados, arq, { fontes: registro });
    erros.push(...r.erros);
    versoes += r.versoes;
    if (!r.expandido) continue;
    const marcaSlug = slugify(r.expandido.marca.nome);
    const outroArquivo = marcas.find((x) => slugify(x.dados.marca.nome) === marcaSlug);
    if (outroArquivo) { erros.push(`${arq}: a marca ${r.expandido.marca.nome} já está em ${outroArquivo.arquivo} (use um arquivo por marca)`); continue; }
    for (const m of r.expandido.modelos) {
      for (const g of m.geracoes) {
        for (const f of g.versoes) {
          const chave = `${marcaSlug}|${slugify(m.nome)}|${f.nome}|${f.ano_modelo}`;
          if (vistos.has(chave) && vistos.get(chave) !== arq) erros.push(`${arq} › ${m.nome} / ${f.nome} ${f.ano_modelo}: também está em ${vistos.get(chave)}`);
          vistos.set(chave, arq);
          const slug = slugify(`${r.expandido.marca.nome} ${m.nome} ${f.nome} ${f.ano_modelo}`);
          const dono = `${m.nome} / ${f.nome}`;
          if (slugs.has(slug) && slugs.get(slug) !== dono) erros.push(`${arq} › ${dono} ${f.ano_modelo}: gera o mesmo endereço (${slug}) que "${slugs.get(slug)}" — renomeie uma das versões`);
          slugs.set(slug, dono);
        }
      }
    }
    marcas.push({ arquivo: arq, dados: r.expandido });
  }
  return { marcas, fontes: registro, erros, versoes };
}

// Fontes de uma ficha expandida, por seção: { motor: ['chave', ...], ... }.
// "*" vale para as seções que não estiverem listadas; uma seção listada substitui o "*"
// (assim uma mudança de um ano pode trocar só a fonte do consumo, por exemplo).
export function fontesPorSecao(fontes) {
  if (!objeto(fontes)) return {};
  const saida = {};
  for (const secao of Object.keys(SECOES)) {
    const lista = secao in fontes ? fontes[secao] : fontes['*'];
    if (Array.isArray(lista) && lista.length) saida[secao] = [...new Set(lista)];
  }
  return saida;
}
