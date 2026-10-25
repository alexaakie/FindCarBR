import { useEffect, useState } from 'react';

export async function apiGet(caminho, { signal } = {}) {
  const r = await fetch(`/api${caminho}`, { signal });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(corpo.erro ?? `Erro ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return corpo;
}

export async function apiPost(caminho, dados) {
  const r = await fetch(`/api${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo.erro ?? `Erro ${r.status}`);
  return corpo;
}

// Busca dados de um endpoint; refaz quando o caminho muda e cancela a anterior.
export function useApi(caminho) {
  const [estado, setEstado] = useState({ dados: null, erro: null, carregando: true, caminho: null });
  useEffect(() => {
    if (!caminho) return undefined;
    const ctrl = new AbortController();
    apiGet(caminho, { signal: ctrl.signal })
      .then((dados) => setEstado({ dados, erro: null, carregando: false, caminho }))
      .catch((erro) => { if (erro.name !== 'AbortError') setEstado({ dados: null, erro, carregando: false, caminho }); });
    return () => ctrl.abort();
  }, [caminho]);
  // Enquanto o novo caminho carrega, mantém os dados antigos (evita "piscar") mas sinaliza carregando
  return { ...estado, carregando: estado.caminho !== caminho || estado.carregando };
}
