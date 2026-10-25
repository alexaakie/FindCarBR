import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { num, reais } from '../lib/formato.js';
import { Carregando, Erro, Paginacao, Vazio } from '../components/ui.jsx';

export default function Fipe() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const { dados: marcas } = useApi('/marcas');
  const { dados, erro, carregando } = useApi(`/fipe?${params.toString()}`);

  const definir = (k, v) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); if (k !== 'pagina') n.delete('pagina'); return n; }, { replace: true });
  useEffect(() => {
    if (texto === (params.get('q') ?? '')) return undefined;
    const t = setTimeout(() => definir('q', texto.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight">Tabela FIPE</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Preço médio de referência de todos os carros do mercado brasileiro.
        {dados?.itens[0]?.referencia && <> Referência: <b className="text-zinc-300">{dados.itens[0].referencia}</b>.</>}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Modelo, versão… ex.: onix 1.0 turbo" aria-label="Buscar na FIPE"
            className="w-full rounded-2xl border border-white/10 bg-painel py-3 pl-11 pr-4 outline-none focus:border-marca-500/50" />
        </div>
        <select value={params.get('marca') ?? ''} onChange={(e) => definir('marca', e.target.value)} aria-label="Marca"
          className="rounded-2xl border border-white/10 bg-painel px-4 py-3 text-sm outline-none">
          <option value="">Todas as marcas</option>
          {marcas?.filter((m) => m.fipe > 0).map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
        </select>
        <input type="number" value={params.get('ano') ?? ''} onChange={(e) => definir('ano', e.target.value)} placeholder="Ano" aria-label="Ano-modelo"
          className="w-full rounded-2xl border border-white/10 bg-painel px-4 py-3 text-sm outline-none sm:w-28" />
      </div>

      {erro && <Erro erro={erro} />}
      {!dados && carregando && <Carregando />}
      {dados && dados.total === 0 && !params.toString() && (
        <Vazio titulo="Tabela FIPE ainda não importada">
          Rode <code className="text-zinc-300">npm run db:fipe</code> (ou <code className="text-zinc-300">npm run db:fipe -- --marcas=fiat,volkswagen</code>) para importar.
        </Vazio>
      )}
      {dados && dados.total === 0 && params.toString() && <Vazio titulo="Nenhum veículo encontrado" />}
      {dados && dados.total > 0 && (
        <>
          <p className="mb-3 mt-6 text-sm text-zinc-500">{num(dados.total)} registros</p>
          <div className={`overflow-x-auto rounded-3xl border border-white/5 bg-painel ${carregando ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-white/5">{['Marca', 'Modelo', 'Ano', 'Combustível', 'Código', 'Preço médio'].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {dados.itens.map((v) => (
                  <tr key={`${v.codigo_fipe}-${v.ano_modelo}-${v.combustivel}`} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2.5 text-zinc-400">{v.marca_nome}</td>
                    <td className="px-4 py-2.5 font-semibold">{v.modelo_nome}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{v.ano_modelo === 32000 ? '0 km' : v.ano_modelo}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{v.combustivel}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">{v.codigo_fipe.startsWith('m') ? '—' : v.codigo_fipe}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-400">{reais(v.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacao pagina={dados.pagina} paginas={dados.paginas} irPara={(p) => definir('pagina', String(p))} />
        </>
      )}
    </div>
  );
}
