import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { anoFipe, num, reais } from '../lib/formato.js';
import { Carregando, Erro, Migalhas, Paginacao, Vazio } from '../components/ui.jsx';

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

  const vazioTotal = dados && dados.total === 0 && !params.toString();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Migalhas itens={[['Tabela FIPE']]} />
      <h1 className="mt-2 text-3xl font-black">Tabela FIPE</h1>
      <p className="text-sm text-tinta-2">
        Preço médio de referência dos carros do mercado brasileiro.
        {dados?.itens[0]?.referencia && <> Mês de referência: <b className="text-tinta">{dados.itens[0].referencia}</b>.</>}
      </p>

      <div className="cartao mt-5 grid gap-2 p-3 sm:grid-cols-[1fr_220px_120px]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Modelo ou versão, ex.: onix 1.0 turbo" aria-label="Buscar na FIPE" className="campo py-2.5 pl-9" />
        </div>
        <select value={params.get('marca') ?? ''} onChange={(e) => definir('marca', e.target.value)} aria-label="Marca" className="campo py-2.5">
          <option value="">Todas as marcas</option>
          {marcas?.filter((m) => m.fipe > 0).map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
        </select>
        <input type="number" value={params.get('ano') ?? ''} onChange={(e) => definir('ano', e.target.value)} placeholder="Ano" aria-label="Ano-modelo" className="campo py-2.5" />
      </div>

      <div className="mt-5">
        {erro && <Erro erro={erro} />}
        {!dados && carregando && <Carregando />}
        {vazioTotal && (
          <Vazio titulo="Tabela FIPE ainda não importada">
            No terminal, com o site parado, rode <code className="rounded bg-painel-2 px-1 text-tinta">npm run db:fipe -- --marcas=fiat,volkswagen</code> para
            algumas marcas, ou <code className="rounded bg-painel-2 px-1 text-tinta">npm run db:fipe</code> para todas (demora, mas pode ser interrompido e retomado).
          </Vazio>
        )}
        {dados && dados.total === 0 && !vazioTotal && <Vazio titulo="Nenhum veículo encontrado" />}
        {dados && dados.total > 0 && (
          <>
            <p className="mb-2 text-sm text-tinta-2">{num(dados.total)} registros</p>
            <div className={`cartao overflow-x-auto ${carregando ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[680px] text-sm">
                <thead className="border-b border-borda bg-painel-2 text-left text-[11px] uppercase tracking-wider text-tinta-3">
                  <tr>{['Marca', 'Modelo', 'Ano', 'Combustível', 'Código FIPE', 'Preço médio'].map((h, i) => <th key={h} className={`px-4 py-2.5 ${i === 5 ? 'text-right' : ''}`}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {dados.itens.map((v) => (
                    <tr key={`${v.codigo_fipe}-${v.ano_modelo}-${v.combustivel}`} className="border-b border-borda last:border-0 odd:bg-painel even:bg-painel-2/50">
                      <td className="px-4 py-2 text-tinta-2">{v.marca_nome}</td>
                      <td className="px-4 py-2 font-semibold">{v.modelo_nome}</td>
                      <td className="px-4 py-2 text-tinta-2">{anoFipe(v.ano_modelo)}</td>
                      <td className="px-4 py-2 text-tinta-2">{v.combustivel}</td>
                      <td className="px-4 py-2 font-mono text-xs text-tinta-3">{v.codigo_fipe.startsWith('m') ? '—' : v.codigo_fipe}</td>
                      <td className="px-4 py-2 text-right font-bold">{reais(v.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacao pagina={dados.pagina} paginas={dados.paginas} irPara={(p) => definir('pagina', String(p))} />
          </>
        )}
      </div>
    </div>
  );
}
