import { Link } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import FotoCarro from './FotoCarro.jsx';

export function ListaRanking({ ranking, filtro = '', limite = 10, comFoto = false }) {
  const { dados, carregando } = useApi(`/versoes?${ranking.qs}${filtro ? `&${filtro}` : ''}&apenas_atuais=1&por_pagina=${limite}`);
  const itens = (dados?.itens ?? []).filter((v) => ranking.valor(v) !== '—');
  if (!carregando && itens.length === 0) {
    return <p className="py-6 text-center text-sm text-tinta-3">{ranking.precisaPreco ? 'Importe a Tabela FIPE para ver este ranking.' : 'Sem dados suficientes.'}</p>;
  }
  return (
    <ol className={`divide-y divide-borda ${carregando ? 'opacity-50' : ''}`}>
      {itens.map((v, i) => (
        <li key={v.slug}>
          <Link to={`/versao/${v.slug}`} className="flex items-center gap-3 px-1 py-2.5 hover:bg-painel-2">
            <span className={`w-6 shrink-0 text-center font-titulo text-lg font-black ${i < 3 ? 'text-marca-600' : 'text-tinta-3'}`}>{i + 1}</span>
            {comFoto && <FotoCarro url={v.foto_url} categoria={v.categoria} alt="" className="w-16 shrink-0 rounded" proporcao="aspect-[16/10]" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{v.marca} {v.modelo}</span>
              <span className="block truncate text-xs text-tinta-2">{v.versao} · {v.ano_modelo}</span>
            </span>
            <span className="shrink-0 text-sm font-extrabold">{ranking.valor(v)}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
