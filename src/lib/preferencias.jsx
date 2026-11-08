/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PREFERENCIAS_PADRAO } from './custos.js';

const CHAVE = 'findcarbr:preferencias';
const Ctx = createContext(null);

function ler() {
  try { return { ...PREFERENCIAS_PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) ?? '{}') }; }
  catch { return { ...PREFERENCIAS_PADRAO }; }
}

// Preferências de cálculo de custos (UF, km/mês, preços de combustível)
export function PreferenciasProvider({ children }) {
  const [pref, setPref] = useState(ler);
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(pref)); } catch { /* sem storage */ } }, [pref]);
  const definir = useCallback((chave, valor) => setPref((p) => ({ ...p, [chave]: valor })), []);
  const restaurar = useCallback(() => setPref({ ...PREFERENCIAS_PADRAO }), []);
  const valor = useMemo(() => ({ pref, definir, restaurar }), [pref, definir, restaurar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const usePreferencias = () => useContext(Ctx);
