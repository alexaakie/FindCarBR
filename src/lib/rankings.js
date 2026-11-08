import { com, reaisCurto } from './formato.js';

// Definições dos rankings (usadas no início e na página de rankings)
export const RANKINGS = [
  { id: 'potencia', titulo: 'Mais potentes', qs: 'ordem=potencia_desc', valor: (v) => com(v.potencia_max_cv, 'cv') },
  { id: 'aceleracao', titulo: 'Mais rápidos no 0–100', qs: 'ordem=aceleracao', valor: (v) => com(v.zero_a_cem_s, 's', 1) },
  { id: 'consumo', titulo: 'Mais econômicos na cidade', qs: 'ordem=consumo&combustivel=Flex,Gasolina,Híbrido,Híbrido Flex', valor: (v) => com(v.consumo_urbano_gasolina ?? v.consumo_urbano_etanol, 'km/l', 1) },
  { id: 'porta-malas', titulo: 'Maior porta-malas', qs: 'ordem=porta_malas&categoria=Hatch,Sedan,SUV,Minivan,Perua', valor: (v) => com(v.porta_malas_l, 'L') },
  { id: 'peso-potencia', titulo: 'Melhor peso/potência', qs: 'ordem=peso_potencia', valor: (v) => com(v.peso_potencia, 'kg/cv', 1) },
  { id: 'baratos', titulo: 'Mais baratos (FIPE)', qs: 'ordem=preco_asc&pot_min=1', valor: (v) => reaisCurto(v.preco) ?? '—', precisaPreco: true },
];
