import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, ChevronLeft, ChevronRight, Loader2, SearchX } from 'lucide-react';

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-24 text-tinta-3" role="status">
      <Loader2 className="animate-spin" size={20} /> {texto}
    </div>
  );
}

export function Erro({ erro }) {
  const semApi = !erro?.status || erro.status >= 500;
  return (
    <div className="cartao mx-auto my-16 max-w-lg p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 text-red-600" />
      <p className="font-semibold">{erro?.status === 404 ? 'Página não encontrada' : 'Não foi possível carregar'}</p>
      <p className="mt-1 text-sm text-tinta-2">
        {erro?.status === 404 ? 'O endereço pode ter mudado.' : semApi ? 'Verifique se a API está rodando (npm run dev).' : erro?.message}
      </p>
      <Link to="/" className="botao mt-4 bg-tinta text-white hover:bg-noite-2">Ir para o início</Link>
    </div>
  );
}

export function Vazio({ titulo = 'Nada encontrado', children }) {
  return (
    <div className="cartao px-6 py-16 text-center">
      <SearchX className="mx-auto mb-3 text-tinta-3" size={28} />
      <p className="font-semibold">{titulo}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-tinta-2">{children}</div>}
    </div>
  );
}

export function StatusDados({ status, compacto = false }) {
  if (status === 'verificado') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-ok-50 px-1.5 py-0.5 text-[11px] font-semibold text-ok" title="Dados conferidos com fonte oficial">
        <BadgeCheck size={12} /> {!compacto && 'Ficha verificada'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-aviso-50 px-1.5 py-0.5 text-[11px] font-semibold text-aviso" title="Dados preliminares — ainda não conferidos com o fabricante/Inmetro">
      <AlertTriangle size={12} /> {!compacto && 'Ficha a verificar'}
    </span>
  );
}

export function Paginacao({ pagina, paginas, irPara }) {
  if (paginas <= 1) return null;
  const btn = 'flex h-9 min-w-9 items-center justify-center rounded-lg border border-borda bg-painel px-3 text-sm font-semibold transition hover:border-tinta-3 disabled:opacity-40 disabled:hover:border-borda';
  const vizinhas = [...new Set([1, pagina - 1, pagina, pagina + 1, paginas])].filter((p) => p >= 1 && p <= paginas).sort((a, b) => a - b);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginação">
      <button className={btn} disabled={pagina <= 1} onClick={() => irPara(pagina - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button>
      {vizinhas.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - vizinhas[i - 1] > 1 && <span className="px-1 text-tinta-3">…</span>}
          <button className={`${btn} ${p === pagina ? 'border-tinta bg-tinta text-white hover:border-tinta' : ''}`} onClick={() => irPara(p)} aria-current={p === pagina ? 'page' : undefined}>{p}</button>
        </span>
      ))}
      <button className={btn} disabled={pagina >= paginas} onClick={() => irPara(pagina + 1)} aria-label="Próxima página"><ChevronRight size={16} /></button>
    </nav>
  );
}

export function Migalhas({ itens }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-[13px] text-tinta-3" aria-label="Você está em">
      <Link to="/" className="hover:text-tinta">Início</Link>
      {itens.map(([rotulo, para]) => (
        <span key={rotulo} className="flex items-center gap-1">
          <ChevronRight size={13} />
          {para ? <Link to={para} className="hover:text-tinta">{rotulo}</Link> : <span className="text-tinta-2">{rotulo}</span>}
        </span>
      ))}
    </nav>
  );
}

// Bloco com título no estilo "seção de revista": barra laranja + título condensado
export function Secao({ id, titulo, subtitulo, children, acao, className = '' }) {
  return (
    <section id={id} className={`scroll-mt-28 ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-tinta pb-2">
        <div>
          <h2 className="text-lg font-extrabold uppercase tracking-tight sm:text-xl">{titulo}</h2>
          {subtitulo && <p className="text-sm text-tinta-2">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

// Tabela de especificações "rótulo → valor"
export function TabelaFicha({ linhas, titulo }) {
  return (
    <div className="cartao overflow-hidden">
      {titulo && <h3 className="border-b border-borda bg-painel-2 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide">{titulo}</h3>}
      <dl>
        {linhas.filter(Boolean).map(([rotulo, valor]) => (
          <div key={rotulo} className="flex items-baseline justify-between gap-4 border-b border-borda px-4 py-2 text-sm last:border-0 odd:bg-painel even:bg-painel-2/60">
            <dt className="text-tinta-2">{rotulo}</dt>
            <dd className={`text-right font-semibold ${valor === '—' ? 'font-normal text-tinta-3' : ''}`}>{valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Chip({ ativo, children, ...props }) {
  return (
    <button type="button" aria-pressed={ativo} {...props}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${ativo ? 'border-tinta bg-tinta text-white' : 'border-borda bg-painel text-tinta-2 hover:border-tinta-3 hover:text-tinta'}`}>
      {children}
    </button>
  );
}
