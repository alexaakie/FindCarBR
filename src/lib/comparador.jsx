/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const MAX_COMPARAR = 4;
const CHAVE = 'findcarbr:comparar';
const Ctx = createContext(null);

function lerSalvo() {
  try { const v = JSON.parse(localStorage.getItem(CHAVE)); return Array.isArray(v) ? v.slice(0, MAX_COMPARAR) : []; }
  catch { return []; }
}

// Lista de versões selecionadas para comparar: { slug, nome }
export function ComparadorProvider({ children }) {
  const [itens, setItens] = useState(lerSalvo);
  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch { /* sem storage */ } }, [itens]);

  const tem = useCallback((slug) => itens.some((i) => i.slug === slug), [itens]);
  const alternar = useCallback((item) => setItens((atual) => {
    if (atual.some((i) => i.slug === item.slug)) return atual.filter((i) => i.slug !== item.slug);
    if (atual.length >= MAX_COMPARAR) return atual;
    return [...atual, { slug: item.slug, nome: item.nome }];
  }), []);
  const limpar = useCallback(() => setItens([]), []);

  const valor = useMemo(() => ({ itens, tem, alternar, limpar, cheio: itens.length >= MAX_COMPARAR }), [itens, tem, alternar, limpar]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export const useComparador = () => useContext(Ctx);
