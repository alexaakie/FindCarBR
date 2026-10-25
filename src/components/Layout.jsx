import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CarFront, Menu, Scale, Search, X } from 'lucide-react';
import { useComparador } from '../lib/comparador.jsx';

const LINKS = [['/catalogo', 'Catálogo'], ['/marcas', 'Marcas'], ['/comparar', 'Comparar'], ['/fipe', 'Tabela FIPE']];

function BuscaRapida({ aoBuscar }) {
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); navegar(`/catalogo?q=${encodeURIComponent(q.trim())}`); setQ(''); aoBuscar?.(); }}
      className="relative"
    >
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar versão…"
        aria-label="Buscar versão"
        className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-marca-500/50 lg:w-56"
      />
    </form>
  );
}

function BarraComparar() {
  const { itens, alternar, limpar } = useComparador();
  const { pathname } = useLocation();
  if (!itens.length || pathname === '/comparar') return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 px-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-painel-2/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-1 flex-wrap gap-2">
          {itens.map((i) => (
            <span key={i.slug} className="flex items-center gap-2 rounded-xl bg-white/5 py-1.5 pl-3 pr-1.5 text-xs font-semibold">
              <span className="max-w-[180px] truncate">{i.nome}</span>
              <button onClick={() => alternar(i)} className="rounded-lg p-1 text-zinc-500 hover:bg-white/10 hover:text-white" aria-label={`Remover ${i.nome}`}><X size={12} /></button>
            </span>
          ))}
        </div>
        <button onClick={limpar} className="px-2 text-xs font-semibold text-zinc-500 hover:text-white">Limpar</button>
        <Link
          to={`/comparar?v=${itens.map((i) => i.slug).join(',')}`}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${itens.length >= 2 ? 'bg-marca-600 text-white hover:bg-marca-500' : 'pointer-events-none bg-white/5 text-zinc-600'}`}
        >
          <Scale size={16} /> Comparar {itens.length}
        </Link>
      </div>
    </div>
  );
}

export default function Layout() {
  const [menu, setMenu] = useState(false);
  const linkCls = ({ isActive }) => `rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-white bg-white/5' : 'text-zinc-400 hover:text-white'}`;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-fundo/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenu(false)}>
            <span className="rounded-xl bg-gradient-to-br from-marca-500 to-marca-600 p-1.5 shadow-lg shadow-marca-600/20"><CarFront size={20} className="text-white" /></span>
            <span className="text-lg font-black tracking-tight">Find<span className="text-marca-500">Car</span>BR</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map(([para, rotulo]) => <NavLink key={para} to={para} className={linkCls}>{rotulo}</NavLink>)}
          </nav>
          <div className="ml-auto hidden md:block"><BuscaRapida /></div>
          <button className="ml-auto rounded-xl p-2 text-zinc-400 md:hidden" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menu && (
          <div className="space-y-3 border-t border-white/5 px-4 py-4 md:hidden">
            <BuscaRapida aoBuscar={() => setMenu(false)} />
            <nav className="flex flex-col">
              {LINKS.map(([para, rotulo]) => <NavLink key={para} to={para} className={linkCls} onClick={() => setMenu(false)}>{rotulo}</NavLink>)}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 pb-28"><Outlet /></main>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-600">
        <p>FindCarBR · fichas técnicas independentes. Preços de referência: Tabela FIPE.</p>
        <p className="mt-1">Dados marcados como “a verificar” são preliminares — confira com o fabricante antes de decidir uma compra.</p>
      </footer>
      <BarraComparar />
    </div>
  );
}
