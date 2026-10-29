// Cálculos de custo de uso. Todos os valores de referência são editáveis pelo usuário
// na página da versão (e ficam salvos no navegador).

// Alíquota de IPVA para automóveis a gasolina/flex, por UF (% do valor venal).
// Referência aproximada — as alíquotas mudam por lei estadual todo ano e há regras
// próprias para elétricos, híbridos e veículos antigos. Confira na Sefaz do seu estado.
export const IPVA_UF = {
  AC: 2, AL: 3, AM: 3, AP: 3, BA: 2.5, CE: 3, DF: 3.5, ES: 2, GO: 3.75, MA: 2.5,
  MG: 4, MS: 3, MT: 3, PA: 2.5, PB: 2.5, PE: 2.4, PI: 2.5, PR: 1.9, RJ: 4, RN: 3,
  RO: 3, RR: 3, RS: 3, SC: 2, SE: 2.5, SP: 4, TO: 2,
};

export const PREFERENCIAS_PADRAO = {
  uf: 'SP',
  km_mes: 1000,
  preco_gasolina: 6.29,
  preco_etanol: 4.29,
  preco_diesel: 6.09,
  preco_kwh: 0.95,
  pct_cidade: 60, // uso urbano vs. estrada
};

// Consumo médio ponderado (km/l); null se faltar dado
function misto(cidade, estrada, pctCidade) {
  if (cidade && estrada) return 1 / ((pctCidade / 100) / cidade + (1 - pctCidade / 100) / estrada);
  return cidade ?? estrada ?? null;
}

// Retorna as opções de combustível com custo por km. `v` = ficha (formato da API de versão)
export function custoPorKm(v, pref) {
  const c = v.consumo ?? {};
  const comb = v.motor?.combustivel;
  const opcoes = [];
  if (comb === 'Elétrico') {
    // estimativa: consumo típico de 0,15 kWh/km quando não há bateria/autonomia
    const kwhKm = v.eletrico?.bateria_kwh && v.eletrico?.autonomia_km ? v.eletrico.bateria_kwh / v.eletrico.autonomia_km : null;
    if (kwhKm) opcoes.push({ combustivel: 'Energia elétrica', kmPorUnidade: 1 / kwhKm, unidade: 'kWh', preco: pref.preco_kwh, custoKm: kwhKm * pref.preco_kwh });
    return opcoes;
  }
  const gas = misto(c.urbano_gasolina, c.estrada_gasolina, pref.pct_cidade);
  const eta = misto(c.urbano_etanol, c.estrada_etanol, pref.pct_cidade);
  if (comb === 'Diesel') {
    // as fichas guardam o consumo do diesel nos campos de gasolina quando informado
    if (gas) opcoes.push({ combustivel: 'Diesel', kmPorUnidade: gas, unidade: 'l', preco: pref.preco_diesel, custoKm: pref.preco_diesel / gas });
    return opcoes;
  }
  if (gas) opcoes.push({ combustivel: 'Gasolina', kmPorUnidade: gas, unidade: 'l', preco: pref.preco_gasolina, custoKm: pref.preco_gasolina / gas });
  if (eta && comb?.includes('Flex')) opcoes.push({ combustivel: 'Etanol', kmPorUnidade: eta, unidade: 'l', preco: pref.preco_etanol, custoKm: pref.preco_etanol / eta });
  return opcoes;
}

export const ipvaAnual = (valor, pctUf) => (valor ? valor * (pctUf / 100) : null);

// Regra dos 70%: etanol compensa se custar até 70% da gasolina (ou, com dados do carro, se o custo/km for menor)
export function melhorCombustivel(opcoes) {
  if (opcoes.length < 2) return null;
  return [...opcoes].sort((a, b) => a.custoKm - b.custoKm)[0].combustivel;
}
