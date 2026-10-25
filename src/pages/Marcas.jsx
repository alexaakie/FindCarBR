import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import { num } from '../lib/formato.js';
import { Carregando, Erro, IconeCategoria, Migalhas, Vazio } from '../components/ui.jsx';

export function Marcas() {
  const { dados, erro, carregando } = useApi('/marcas');
  const [filtro, setFiltro] = useState('');
  if (erro) return <Erro erro={erro} />;
  if (carregando && !dados) return <Carregando />;
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const lista = dados.filter((m) => norm(m.nome).includes(norm(filtro)));
  const comFicha = lista.filter((m) => m.versoes > 0);
  const soFipe = lista.filter((m) => m.versoes === 0);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight">Marcas</h1>
      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar marcas…" aria-label="Filtrar marcas"
        className="mt-6 w-full max-w-sm rounded-2xl border border-white/10 bg-painel px-4 py-3 outline-none focus:border-marca-500/50" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {comFicha.map((m) => (
          <Link key={m.slug} to={`/marca/${m.slug}`} className="rounded-2xl border border-white/5 bg-painel p-5 transition hover:border-marca-500/30 hover:bg-painel-2">
            <p className="text-lg font-extrabold">{m.nome}</p>
            <p className="text-xs text-zinc-500">{m.pais}</p>
            <p className="mt-3 text-sm text-zinc-400">{m.modelos} modelos · {m.versoes} fichas{m.fipe ? ` · ${num(m.fipe)} FIPE` : ''}</p>
          </Link>
        ))}
      </div>
      {soFipe.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-bold">Outras marcas (somente Tabela FIPE)</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {soFipe.map((m) => (
              <Link key={m.slug} to={`/fipe?marca=${m.slug}`} className="rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-400 hover:text-white">{m.nome}</Link>
            ))}
          </div>
        </>
      )}
      {!lista.length && <Vazio titulo="Nenhuma marca com esse nome" />}
    </div>
  );
}

export function Marca() {
  const { slug } = useParams();
  const { dados, erro, carregando } = useApi(`/marcas/${slug}`);
  if (erro) return <Erro erro={erro} />;
  if (carregando && !dados) return <Carregando />;
  const categorias = [...new Set(dados.modelos.map((m) => m.categoria))];
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Migalhas itens={[['Marcas', '/marcas'], [dados.nome]]} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{dados.nome}</h1>
          <p className="text-zinc-500">{dados.pais} · {dados.modelos.length} modelos com ficha técnica</p>
        </div>
        {dados.fipe_modelos > 0 && <Link to={`/fipe?marca=${slug}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5">Ver {num(dados.fipe_modelos)} modelos na FIPE</Link>}
      </div>
      {categorias.map((cat) => (
        <section key={cat} className="mt-10">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dados.modelos.filter((m) => m.categoria === cat).map((m) => (
              <Link key={m.slug} to={`/marca/${slug}/${m.slug}`} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-painel p-4 transition hover:border-marca-500/30 hover:bg-painel-2">
                <div className="rounded-2xl bg-white/5 p-3 text-zinc-400"><IconeCategoria categoria={m.categoria} combustivel={m.combustiveis === 'Elétrico' ? 'Elétrico' : null} /></div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold leading-tight">{m.nome}</p>
                  <p className="text-xs text-zinc-500">
                    {m.ano_min === m.ano_max ? m.ano_max : `${m.ano_min}–${m.ano_max}`} · {m.versoes} {m.versoes === 1 ? 'versão' : 'versões'}
                    {m.pot_max ? ` · ${m.pot_min === m.pot_max ? num(m.pot_max) : `${num(m.pot_min)}–${num(m.pot_max)}`} cv` : ''}
                  </p>
                  <p className="truncate text-xs text-zinc-600">{m.combustiveis?.split(',').join(' · ')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Modelo() {
  const { marca, modelo } = useParams();
  const { dados, erro, carregando } = useApi(`/modelos/${marca}/${modelo}`);
  if (erro) return <Erro erro={erro} />;
  if (carregando && !dados) return <Carregando />;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Migalhas itens={[['Marcas', '/marcas'], [dados.marca, `/marca/${marca}`], [dados.nome]]} />
      <h1 className="text-4xl font-black tracking-tight">{dados.marca} {dados.nome}</h1>
      <p className="text-zinc-500">{dados.categoria} · {dados.total_versoes} versões em {dados.geracoes.length} {dados.geracoes.length === 1 ? 'geração' : 'gerações'}</p>

      {dados.geracoes.map((g) => (
        <section key={g.nome} className="mt-10">
          <h2 className="text-xl font-extrabold">{g.nome}</h2>
          <p className="mb-4 text-sm text-zinc-500">{g.ano_inicio}{g.ano_fim ? `–${g.ano_fim}` : ' – atual'}</p>
          <div className="overflow-x-auto rounded-3xl border border-white/5 bg-painel">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-white/5">
                  {['Versão', 'Ano', 'Motor', 'Potência', 'Câmbio', 'Tração', '0–100'].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {g.versoes.map((v) => (
                  <tr key={v.slug} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3"><Link to={`/versao/${v.slug}`} className="font-semibold text-marca-400 hover:underline">{v.versao}</Link></td>
                    <td className="px-4 py-3 text-zinc-400">{v.ano_modelo}</td>
                    <td className="px-4 py-3 text-zinc-400">{v.motor_codigo ?? '—'}<span className="block text-xs text-zinc-600">{v.combustivel}</span></td>
                    <td className="px-4 py-3 font-semibold">{v.potencia_max_cv ? `${num(v.potencia_max_cv)} cv` : '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{v.cambio ?? '—'}{v.marchas && v.cambio !== 'CVT' ? ` ${v.marchas}m` : ''}</td>
                    <td className="px-4 py-3 text-zinc-400">{v.tracao ?? '—'}</td>
                    <td className="px-4 py-3 text-zinc-400">{v.zero_a_cem_s ? `${num(v.zero_a_cem_s, 1)} s` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
