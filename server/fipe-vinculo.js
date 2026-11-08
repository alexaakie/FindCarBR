// Liga cada versão com ficha técnica ao veículo correspondente da Tabela FIPE.
// A FIPE descreve versões como texto livre ("Polo Highline 1.0 TSI Flex 12V Aut."),
// então a ligação é feita por pontuação de palavras em comum. Códigos definidos à mão
// no JSON da ficha ("fipe_codigo") nunca são sobrescritos.
import { slugify, transacao } from './db.js';

const tokens = (s) => slugify(s).split('-').filter((t) => t.length > 0);

// Palavras genéricas que não ajudam a distinguir versões
const IGNORAR = new Set(['flex', 'gasolina', 'diesel', 'aut', 'mec', 'v', '4p', '5p', '2p', 'cd', 'cs', 'de', 'e', 'c', 'p']);

function pontuar(versao, fipeNome) {
  const fipe = new Set(tokens(fipeNome));
  const nomeModelo = tokens(versao.modelo);
  // o nome do modelo precisa estar todo presente ("onix plus" ≠ "onix")
  if (!nomeModelo.every((t) => fipe.has(t))) return -1;
  let pontos = 0;
  for (const t of tokens(versao.versao)) {
    if (IGNORAR.has(t)) continue;
    if (fipe.has(t)) pontos += /^\d/.test(t) ? 2 : 3;
  }
  if (versao.cilindrada_cc) {
    const litros = (versao.cilindrada_cc / 1000).toFixed(1).replace('.', '-');
    if (slugify(fipeNome).includes(litros)) pontos += 2;
  }
  const automatico = /aut|cvt|dsg|tiptronic|s-tronic|steptronic/i.test(fipeNome);
  if (versao.cambio === 'Manual' && !automatico) pontos += 1;
  if (versao.cambio && versao.cambio !== 'Manual' && automatico) pontos += 1;
  if (versao.cambio === 'Manual' && automatico) pontos -= 3;
  // nomes FIPE com muitas palavras extras indicam outra versão: pequena penalidade
  pontos -= Math.max(0, fipe.size - nomeModelo.length - 6) * 0.25;
  return pontos;
}

// emTransacao = false quando quem chama já abriu uma transação (ex.: popular)
export function vincularFipe(db, { emTransacao = true } = {}) {
  const temFipe = db.prepare('SELECT count(*) n FROM fipe_veiculos').get().n;
  if (!temFipe) return { vinculadas: 0, total: 0 };
  const versoes = db.prepare(`SELECT v.id, v.nome AS versao, v.ano_modelo, mo.nome AS modelo, mo.marca_id,
      f.cilindrada_cc, f.cambio, f.combustivel
    FROM versoes v JOIN modelos mo ON mo.id = v.modelo_id LEFT JOIN fichas f ON f.versao_id = v.id
    WHERE v.fipe_codigo IS NULL OR v.fipe_auto = 1`).all();
  const anoMax = db.prepare('SELECT max(ano_modelo) m FROM versoes').get().m;
  const candidatos = db.prepare(`SELECT codigo_fipe, modelo_nome, ano_modelo FROM fipe_veiculos
    WHERE marca_id = ? AND ano_modelo IN (?, ?) GROUP BY codigo_fipe, ano_modelo`);
  const definir = db.prepare('UPDATE versoes SET fipe_codigo = ?, fipe_auto = 1 WHERE id = ?');

  let vinculadas = 0;
  const executar = () => {
    for (const v of versoes) {
      // carro do ano corrente pode aparecer na FIPE como "zero km" (32000)
      const anoZero = v.ano_modelo >= anoMax ? 32000 : v.ano_modelo;
      let melhor = null;
      for (const c of candidatos.all(v.marca_id, v.ano_modelo, anoZero)) {
        const p = pontuar(v, c.modelo_nome) + (c.ano_modelo === v.ano_modelo ? 0.5 : 0);
        if (p >= 3 && (!melhor || p > melhor.p)) melhor = { p, codigo: c.codigo_fipe };
      }
      definir.run(melhor?.codigo ?? null, v.id);
      if (melhor) vinculadas++;
    }
  };
  if (emTransacao) transacao(db, executar);
  else executar();
  return { vinculadas, total: versoes.length };
}

export { pontuar };
