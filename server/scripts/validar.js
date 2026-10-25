// Valida os arquivos de fichas técnicas em server/data/fichas.
// Uso: node server/scripts/validar.js [arquivo.json ...]
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'fichas');

const ENUMS = {
  categoria: ['Hatch', 'Sedan', 'SUV', 'Picape', 'Minivan', 'Esportivo', 'Utilitário', 'Cupê', 'Conversível', 'Perua'],
  aspiracao: ['Aspirado', 'Turbo', 'Biturbo', 'Elétrico'],
  injecao: ['Direta', 'Multiponto', 'Indireta', 'Common-rail'],
  combustivel: ['Flex', 'Gasolina', 'Diesel', 'Elétrico', 'Híbrido', 'Híbrido Flex', 'Híbrido Plug-in'],
  cambio: ['Manual', 'Automático', 'CVT', 'Dupla embreagem', 'Automatizado', 'Redução única'],
  tracao: ['Dianteira', 'Traseira', 'Integral'],
};

// [min, max] plausíveis — pegam erros de digitação/unidade
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

const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

export function validarArquivo(dados, nome = '') {
  const erros = [];
  const err = (onde, msg) => erros.push(`${nome} › ${onde}: ${msg}`);
  if (!dados?.marca?.nome) err('marca', 'marca.nome obrigatório');
  if (!Array.isArray(dados?.modelos) || !dados.modelos.length) err('modelos', 'lista vazia');
  let versoes = 0;
  const chaves = new Set();
  for (const m of dados.modelos ?? []) {
    const mOnde = m.nome ?? '(modelo sem nome)';
    if (!m.nome) err(mOnde, 'nome obrigatório');
    if (!ENUMS.categoria.includes(m.categoria)) err(mOnde, `categoria inválida "${m.categoria}"`);
    if (!Array.isArray(m.geracoes) || !m.geracoes.length) err(mOnde, 'sem gerações');
    for (const g of m.geracoes ?? []) {
      const gOnde = `${mOnde} / ${g.nome}`;
      if (!g.nome) err(gOnde, 'geração sem nome');
      if (!Number.isInteger(g.ano_inicio)) err(gOnde, 'ano_inicio inválido');
      for (const v of g.versoes ?? []) {
        versoes++;
        const vOnde = `${gOnde} / ${v.nome} ${v.ano_modelo}`;
        const chave = `${m.nome}|${v.nome}|${v.ano_modelo}`;
        if (chaves.has(chave)) err(vOnde, 'versão duplicada');
        chaves.add(chave);
        if (!v.nome) err(vOnde, 'nome obrigatório');
        if (!Number.isInteger(v.ano_modelo) || v.ano_modelo < 1950 || v.ano_modelo > 2030) err(vOnde, 'ano_modelo inválido');
        for (const campo of ['aspiracao', 'injecao', 'combustivel']) {
          const val = v.motor?.[campo];
          if (val != null && !ENUMS[campo].includes(val)) err(vOnde, `motor.${campo} inválido "${val}"`);
        }
        if (!v.motor?.combustivel) err(vOnde, 'motor.combustivel obrigatório');
        for (const campo of ['cambio', 'tracao']) {
          const val = v.transmissao?.[campo];
          if (!ENUMS[campo].includes(val)) err(vOnde, `transmissao.${campo} inválido "${val}"`);
        }
        for (const [path, [min, max]] of Object.entries(FAIXAS)) {
          const val = get(v, path);
          if (val == null) continue;
          if (typeof val !== 'number' || val < min || val > max) err(vOnde, `${path}=${val} fora da faixa ${min}-${max}`);
        }
        const elet = v.motor?.combustivel === 'Elétrico';
        if (elet && !v.eletrico) err(vOnde, 'elétrico sem bloco "eletrico"');
      }
    }
  }
  return { erros, versoes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arquivos = process.argv.length > 2
    ? process.argv.slice(2)
    : readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => join(DIR, f));
  let total = 0, falhas = 0;
  for (const arq of arquivos) {
    let dados;
    try { dados = JSON.parse(readFileSync(arq, 'utf8')); }
    catch (e) { console.error(`✗ ${arq}: JSON inválido — ${e.message}`); falhas++; continue; }
    const { erros, versoes } = validarArquivo(dados, arq.split('/').pop());
    total += versoes;
    if (erros.length) { falhas += erros.length; erros.forEach((e) => console.error('✗', e)); }
    else console.log(`✓ ${arq.split('/').pop()} — ${versoes} versões`);
  }
  console.log(`\n${total} versões em ${arquivos.length} arquivos, ${falhas} problema(s).`);
  process.exit(falhas ? 1 : 0);
}
