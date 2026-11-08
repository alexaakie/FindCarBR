import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Scale, Search, X } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { useComparador } from '../lib/comparador.jsx';
import { CATEGORIAS_MENU } from '../lib/navegacao.js';


function Logo({ claro = true }) {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="FindCarBR — início">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-marca-500 font-titulo text-lg font-black text-white">F</span>
      <span className={`font-titulo text-xl font-black tracking-tight ${claro ? 'text-white' : 'text-tinta'}`}>
        FindCar<span className="text-marca-500">BR</span>
      </span>
    </Link>
  );
}

function Busca({ aoBuscar, className = '' }) {
  const navegar = useNavigate();
  const [q, setQ] = useState('');
  return (
    <form role="search" className={`relative ${className}`}
      onSubmit={(e) => { e.preventDefault(); navegar(`/catalogo?q=${encodeURIComponent(q.trim())}`); setQ(''); aoBuscar?.(); }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca, modelo ou versão" aria-label="Buscar"
        className="w-full rounded-lg border border-white/15 bg-white/10 py-2 pl-3 pr-10 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-marca-500 focus:bg-white/15" />
      <button className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/70 hover:text-white" aria-label="Buscar"><Search size={16} /></button>
    </form>
  );
}

// Menu suspenso com todas as marcas que têm ficha técnica
function MenuMarcas({ marcas }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const [pathAnterior, setPathAnterior] = useState(pathname);
  if (pathname !== pathAnterior) { setPathAnterior(pathname); setAberto(false); }
  useEffect(() => {
    const fechar = (e) => { if (!ref.current?.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);
  return (
    <div ref={ref} className="relative" onMouseLeave={() => setAberto(false)}>
      <button onClick={() => setAberto(!aberto)} onMouseEnter={() => setAberto(true)} aria-expanded={aberto}
        className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-white/80 hover:text-white">
        Marcas <ChevronDown size={14} className={`transition ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="absolute left-0 top-full z-50 w-[560px] pt-2">
          <div className="cartao grid grid-cols-3 gap-x-4 gap-y-0.5 p-4 shadow-xl">
            {marcas?.filter((m) => m.versoes > 0).map((m) => (
              <Link key={m.slug} to={`/marca/${m.slug}`} className="flex items-baseline justify-between rounded-md px-2 py-1.5 text-sm font-semibold text-tinta hover:bg-painel-2 hover:text-marca-600">
                {m.nome} <span className="text-xs font-normal text-tinta-3">{m.modelos}</span>
              </Link>
            ))}
            <Link to="/marcas" className="col-span-3 mt-2 border-t border-borda pt-3 text-center text-sm font-semibold text-marca-600 hover:underline">Ver todas as marcas</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function BarraComparar() {
  const { itens, alternar, limpar } = useComparador();
  const { pathname } = useLocation();
  if (!itens.length || pathname === '/comparar') return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-borda bg-painel/95 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2.5 sm:px-6">
        <span className="rotulo mr-1 hidden sm:inline">Comparar</span>
        <div className="flex flex-1 flex-wrap gap-1.5">
          {itens.map((i) => (
            <span key={i.slug} className="flex items-center gap-1 rounded-md border border-borda bg-painel-2 py-1 pl-2.5 pr-1 text-xs font-semibold">
              <span className="max-w-[200px] truncate">{i.nome}</span>
              <button onClick={() => alternar(i)} className="rounded p-0.5 text-tinta-3 hover:bg-borda hover:text-tinta" aria-label={`Remover ${i.nome}`}><X size={12} /></button>
            </span>
          ))}
          {itens.length < 2 && <span className="self-center text-xs text-tinta-3">Escolha mais uma versão para comparar</span>}
        </div>
        <button onClick={limpar} className="px-2 text-xs font-semibold text-tinta-3 hover:text-tinta">Limpar</button>
        <Link to={`/comparar?v=${itens.map((i) => i.slug).join(',')}`}
          className={`botao ${itens.length >= 2 ? 'bg-marca-600 text-white hover:bg-marca-700' : 'pointer-events-none bg-painel-2 text-tinta-3'}`}>
          <Scale size={15} /> Comparar ({itens.length})
        </Link>
      </div>
    </div>
  );
}

function Rodape({ marcas }) {
  const col = 'space-y-1.5 text-sm';
  const lk = 'text-white/60 hover:text-white';
  return (
    <footer className="mt-16 bg-noite text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.2fr_2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-white/60">Fichas técnicas independentes dos carros vendidos no Brasil. Sem anúncios, sem pop-ups.</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Marcas</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
            {marcas?.filter((m) => m.versoes > 0).map((m) => <li key={m.slug}><Link to={`/marca/${m.slug}`} className={lk}>{m.nome}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Categorias</p>
          <ul className={col}>{CATEGORIAS_MENU.map(([r, p]) => <li key={r}><Link to={p} className={lk}>{r}</Link></li>)}</ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">Ferramentas</p>
          <ul className={col}>
            <li><Link to="/catalogo" className={lk}>Catálogo completo</Link></li>
            <li><Link to="/rankings" className={lk}>Rankings</Link></li>
            <li><Link to="/comparar" className={lk}>Comparador</Link></li>
            <li><Link to="/fipe" className={lk}>Tabela FIPE</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/40 sm:px-6">
          Fichas marcadas como “a verificar” são preliminares: confira com o fabricante antes de decidir uma compra.
          Preços de referência: Tabela FIPE. Fotos: Wikimedia Commons, com crédito aos autores.
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const [menu, setMenu] = useState(false);
  const { dados: marcas } = useApi('/marcas');
  const navCls = ({ isActive }) => `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'text-white' : 'text-white/80 hover:text-white'}`;
  const { itens } = useComparador();
  return (
    <div className={`flex min-h-screen flex-col ${itens.length ? 'pb-16' : ''}`}>
      <header className="sticky top-0 z-30 shadow-sm">
        <div className="bg-noite">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
            <Logo />
            <nav className="ml-4 hidden items-center lg:flex">
              <NavLink to="/catalogo" className={navCls}>Catálogo</NavLink>
              <MenuMarcas marcas={marcas} />
              <NavLink to="/rankings" className={navCls}>Rankings</NavLink>
              <NavLink to="/comparar" className={navCls}>Comparar</NavLink>
              <NavLink to="/fipe" className={navCls}>Tabela FIPE</NavLink>
            </nav>
            <Busca className="ml-auto hidden w-72 md:block" />
            <button className="ml-auto rounded-md p-2 text-white lg:hidden md:ml-0" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
              {menu ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        <div className="hidden border-b border-borda bg-painel md:block">
          <nav className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
            {CATEGORIAS_MENU.map(([r, p]) => (
              <Link key={r} to={p} className="whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-semibold text-tinta-2 hover:border-marca-500 hover:text-tinta">{r}</Link>
            ))}
          </nav>
        </div>
        {menu && (
          <div className="space-y-3 border-b border-borda bg-noite px-4 pb-4 lg:hidden">
            <Busca className="md:hidden" aoBuscar={() => setMenu(false)} />
            <nav className="grid grid-cols-2 gap-1" onClick={() => setMenu(false)}>
              {[['/catalogo', 'Catálogo'], ['/marcas', 'Marcas'], ['/rankings', 'Rankings'], ['/comparar', 'Comparar'], ['/fipe', 'Tabela FIPE']].map(([p, r]) => (
                <NavLink key={p} to={p} className={navCls}>{r}</NavLink>
              ))}
              {CATEGORIAS_MENU.map(([r, p]) => <Link key={r} to={p} className="rounded-md px-3 py-2 text-sm text-white/60">{r}</Link>)}
            </nav>
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <Rodape marcas={marcas} />
      <BarraComparar />
    </div>
  );
}
