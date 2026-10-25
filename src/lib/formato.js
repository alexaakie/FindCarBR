const nf = (casas = 0) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const num = (v, casas = 0) => (v == null || v === '' ? null : nf(casas).format(v));

// Valor + unidade, ou "—" quando não há dado
export function com(v, unidade = '', casas = 0) {
  const n = typeof v === 'number' ? num(v, casas) : v;
  return n == null || n === '' ? '—' : `${n}${unidade ? ` ${unidade}` : ''}`;
}

export const reais = (v) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v));

// "116 cv (E) / 109 cv (G)" para flex; valor único para os demais
export function potencia(m) {
  if (!m) return '—';
  const g = m.potencia_cv, e = m.potencia_cv_etanol;
  if (g && e && g !== e) return `${num(e)} cv (E) · ${num(g)} cv (G)`;
  return com(e ?? g, 'cv');
}

export function torque(m) {
  if (!m) return '—';
  const g = m.torque_kgfm, e = m.torque_kgfm_etanol;
  if (g && e && g !== e) return `${num(e, 1)} kgfm (E) · ${num(g, 1)} kgfm (G)`;
  return com(e ?? g, 'kgfm', 1);
}

export function cambioTexto(t) {
  if (!t?.cambio) return '—';
  return t.marchas && !['CVT', 'Redução única'].includes(t.cambio) ? `${t.cambio} de ${t.marchas} marchas` : t.cambio;
}

export const motorCurto = (v) =>
  [v.cilindrada_cc ? (v.cilindrada_cc / 1000).toFixed(1) : null, v.aspiracao === 'Turbo' || v.aspiracao === 'Biturbo' ? 'Turbo' : null, v.combustivel]
    .filter(Boolean).join(' ');

export const nomeCompleto = (v) => `${v.marca} ${v.modelo} ${v.versao} ${v.ano_modelo}`;
