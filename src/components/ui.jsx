import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, CarFront, ChevronLeft, ChevronRight, Loader2, SearchX, Truck, Zap, Bus, Gauge } from 'lucide-react';

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-zinc-500" role="status">
      <Loader2 className="animate-spin" size={20} /> {texto}
    </div>
  );
}

export function Erro({ erro }) {
  const semApi = erro?.status === 500 || erro?.message?.includes('Failed to fetch') || erro?.status === 502;
  return (
    <div className="mx-auto my-16 max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 text-red-400" />
      <p className="font-semibold text-red-300">{erro?.status === 404 ? 'Não encontrado' : 'Não foi possível carregar'}</p>
      <p className="mt-1 text-sm text-zinc-400">
        {semApi ? 'Verifique se a API está rodando (npm run dev).' : erro?.message}
      </p>
    </div>
  );
}

export function Vazio({ titulo = 'Nada encontrado', children }) {
  return (
    <div className="py-20 text-center text-zinc-500">
      <SearchX className="mx-auto mb-3" size={28} />
      <p className="font-semibold text-zinc-300">{titulo}</p>
      {children && <div className="mt-1 text-sm">{children}</div>}
    </div>
  );
}

export function StatusDados({ status, compacto = false }) {
  if (status === 'verificado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400" title="Dados conferidos com fonte oficial">
        <BadgeCheck size={12} /> {!compacto && 'Verificado'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400" title="Dados preliminares — ainda não conferidos com o fabricante/Inmetro">
      <AlertTriangle size={12} /> {!compacto && 'A verificar'}
    </span>
  );
}

const ICONES = { Picape: Truck, Utilitário: Bus, Minivan: Bus, Esportivo: Gauge };
export function IconeCategoria({ categoria, combustivel, size = 18, className = '' }) {
  const Icone = combustivel === 'Elétrico' ? Zap : ICONES[categoria] ?? CarFront;
  return <Icone size={size} className={className} />;
}

export function Paginacao({ pagina, paginas, irPara }) {
  if (paginas <= 1) return null;
  const btn = 'flex h-10 min-w-10 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent';
  const vizinhas = [...new Set([1, pagina - 1, pagina, pagina + 1, paginas])].filter((p) => p >= 1 && p <= paginas).sort((a, b) => a - b);
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Paginação">
      <button className={btn} disabled={pagina <= 1} onClick={() => irPara(pagina - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button>
      {vizinhas.map((p, i) => (
        <span key={p} className="flex items-center gap-2">
          {i > 0 && p - vizinhas[i - 1] > 1 && <span className="text-zinc-600">…</span>}
          <button className={`${btn} ${p === pagina ? 'border-marca-500 bg-marca-500/10 text-marca-400' : ''}`} onClick={() => irPara(p)} aria-current={p === pagina ? 'page' : undefined}>{p}</button>
        </span>
      ))}
      <button className={btn} disabled={pagina >= paginas} onClick={() => irPara(pagina + 1)} aria-label="Próxima página"><ChevronRight size={16} /></button>
    </nav>
  );
}

export function Migalhas({ itens }) {
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500" aria-label="Você está em">
      {itens.map(([rotulo, para], i) => (
        <span key={rotulo} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={14} className="text-zinc-700" />}
          {para ? <Link to={para} className="hover:text-zinc-200">{rotulo}</Link> : <span className="text-zinc-300">{rotulo}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Secao({ titulo, icone: Icone, children, acao }) {
  return (
    <section className="rounded-3xl border border-white/5 bg-painel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-zinc-300">
          {Icone && <Icone size={18} className="text-marca-500" />} {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
