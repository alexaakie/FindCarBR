import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { num } from '../lib/formato.js';
import VersaoCard from '../components/VersaoCard.jsx';
import { IconeCategoria } from '../components/ui.jsx';

const ATALHOS = [
  ['SUVs Flex', 'categoria=SUV&combustivel=Flex'],
  ['Elétricos', 'combustivel=Elétrico'],
  ['Híbridos', 'combustivel=Híbrido,Híbrido Flex,Híbrido Plug-in'],
  ['Picapes 4x4', 'categoria=Picape&tracao=Integral'],
  ['Mais rápidos', 'ordem=aceleracao'],
  ['Mais econômicos', 'ordem=consumo&combustivel=Flex,Gasolina'],
  ['Maior porta-malas', 'ordem=porta_malas&categoria=Hatch,Sedan,SUV'],
  ['Câmbio manual', 'cambio=Manual'],
];

export default function Home() {
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  const { dados: est } = useApi('/estatisticas');
  const { dados: marcas } = useApi('/marcas');
  const { dados: potentes } = useApi('/versoes?apenas_atuais=1&ordem=potencia_desc&por_pagina=6&categoria=Hatch,Sedan,SUV,Picape');

  return (
    <>
      <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:pt-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-3xl rounded-full bg-marca-600/10 blur-3xl" />
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-black leading-[1.05] tracking-tighter sm:text-6xl">
            Ficha técnica completa de <span className="bg-gradient-to-r from-marca-500 to-amber-300 bg-clip-text text-transparent">qualquer carro</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-zinc-400">Motor, câmbio, desempenho, consumo e dimensões, versão por versão. Compare lado a lado e consulte a Tabela FIPE. Sem anúncios atrapalhando.</p>
          <form
            role="search"
            onSubmit={(e) => { e.preventDefault(); navegar(`/catalogo?q=${encodeURIComponent(q.trim())}`); }}
            className="relative mx-auto mt-8 max-w-2xl"
          >
            <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: Polo TSI, Corolla Cross híbrido, Hilux diesel…"
              aria-label="Pesquisar"
              className="w-full rounded-3xl border border-white/10 bg-painel py-5 pl-14 pr-32 text-base outline-none shadow-2xl transition focus:border-marca-500/50 focus:ring-4 focus:ring-marca-500/10"
            />
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-2xl bg-marca-600 px-5 py-3 text-sm font-bold text-white hover:bg-marca-500">Buscar</button>
          </form>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {ATALHOS.map(([rotulo, qs]) => (
              <Link key={rotulo} to={`/catalogo?${qs}`} className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-marca-500/40 hover:text-white">{rotulo}</Link>
            ))}
          </div>
        </div>

        {est && (
          <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Marcas', est.marcas], ['Modelos', est.modelos], ['Versões com ficha', est.versoes], ['Preços FIPE', est.fipe]].map(([r, v]) => (
              <div key={r} className="rounded-2xl border border-white/5 bg-painel px-4 py-3 text-center">
                <dd className="text-2xl font-black">{num(v)}</dd>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{r}</dt>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">Navegue por marca</h2>
          <Link to="/marcas" className="flex items-center gap-1 text-sm font-semibold text-marca-400 hover:text-marca-500">Todas <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {marcas?.filter((m) => m.versoes > 0).map((m) => (
            <Link key={m.slug} to={`/marca/${m.slug}`} className="rounded-2xl border border-white/5 bg-painel px-4 py-4 transition hover:border-marca-500/30 hover:bg-painel-2">
              <p className="font-bold">{m.nome}</p>
              <p className="text-xs text-zinc-500">{m.modelos} modelos · {m.versoes} versões</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight"><IconeCategoria categoria="Esportivo" className="text-marca-500" /> Os mais potentes à venda</h2>
          <Link to="/catalogo?ordem=potencia_desc&apenas_atuais=1" className="flex items-center gap-1 text-sm font-semibold text-marca-400 hover:text-marca-500">Ver ranking <ArrowRight size={14} /></Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {potentes?.itens.map((v) => <VersaoCard key={v.slug} v={v} />)}
        </div>
      </section>
    </>
  );
}
