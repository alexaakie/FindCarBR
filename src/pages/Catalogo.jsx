import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { num } from '../lib/formato.js';
import VersaoCard from '../components/VersaoCard.jsx';
import { Carregando, Erro, Paginacao, Vazio } from '../components/ui.jsx';

const ORDENS = [
  ['relevancia', 'Marca e modelo'],
  ['ano_desc', 'Mais novos'],
  ['potencia_desc', 'Mais potentes'],
  ['potencia_asc', 'Menos potentes'],
  ['aceleracao', 'Mais rápidos (0–100)'],
  ['peso_potencia', 'Melhor peso/potência'],
  ['consumo', 'Mais econômicos (cidade)'],
  ['porta_malas', 'Maior porta-malas'],
];

function Chips({ titulo, opcoes, selecionados, alternar }) {
  if (!opcoes?.length) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{titulo}</legend>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map((o) => {
          const ativo = selecionados.includes(o);
          return (
            <button key={o} type="button" onClick={() => alternar(o)} aria-pressed={ativo}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${ativo ? 'border-marca-500 bg-marca-500/15 text-marca-400' : 'border-white/10 text-zinc-400 hover:text-white'}`}>
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Faixa({ titulo, chaveMin, chaveMax, params, definir, placeholder }) {
  const campo = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-marca-500/50';
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{titulo}</legend>
      <div className="flex items-center gap-2">
        <input type="number" inputMode="numeric" className={campo} placeholder={placeholder[0]} aria-label={`${titulo} mínimo`}
          value={params.get(chaveMin) ?? ''} onChange={(e) => definir(chaveMin, e.target.value)} />
        <span className="text-zinc-600">–</span>
        <input type="number" inputMode="numeric" className={campo} placeholder={placeholder[1]} aria-label={`${titulo} máximo`}
          value={params.get(chaveMax) ?? ''} onChange={(e) => definir(chaveMax, e.target.value)} />
      </div>
    </fieldset>
  );
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { dados: opcoes } = useApi('/filtros');

  const qParam = params.get('q') ?? '';
  // sincroniza o campo quando a URL muda por fora (ex.: busca do cabeçalho)
  const [qAnterior, setQAnterior] = useState(qParam);
  if (qParam !== qAnterior) { setQAnterior(qParam); setTexto(qParam); }

  const atualizar = (fn) => setParams((p) => { const n = new URLSearchParams(p); fn(n); n.delete('pagina'); return n; }, { replace: true });
  const definir = (chave, valor) => atualizar((n) => (valor ? n.set(chave, valor) : n.delete(chave)));
  const lista = (chave) => (params.get(chave) ?? '').split(',').filter(Boolean);
  const alternar = (chave) => (valor) => {
    const atual = lista(chave);
    const novo = atual.includes(valor) ? atual.filter((x) => x !== valor) : [...atual, valor];
    definir(chave, novo.join(','));
  };

  // busca textual com atraso (debounce)
  useEffect(() => {
    if (texto === qParam) return undefined;
    const t = setTimeout(() => definir('q', texto.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const { dados, erro, carregando } = useApi(`/versoes?${params.toString()}`);
  const ativos = [...params.keys()].filter((k) => !['pagina', 'ordem'].includes(k)).length;
  const irPara = (p) => { setParams((atual) => { const n = new URLSearchParams(atual); n.set('pagina', p); return n; }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const painel = (
    <div className="space-y-6">
      <div>
        <label htmlFor="f-marca" className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">Marca</label>
        <select id="f-marca" value={params.get('marca') ?? ''} onChange={(e) => definir('marca', e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-painel-2 px-3 py-2 text-sm outline-none focus:border-marca-500/50">
          <option value="">Todas as marcas</option>
          {opcoes?.marcas.map((m) => <option key={m.slug} value={m.slug}>{m.nome} ({m.versoes})</option>)}
        </select>
      </div>
      <Chips titulo="Categoria" opcoes={opcoes?.categorias} selecionados={lista('categoria')} alternar={alternar('categoria')} />
      <Chips titulo="Combustível" opcoes={opcoes?.combustiveis} selecionados={lista('combustivel')} alternar={alternar('combustivel')} />
      <Chips titulo="Câmbio" opcoes={opcoes?.cambios} selecionados={lista('cambio')} alternar={alternar('cambio')} />
      <Chips titulo="Tração" opcoes={opcoes?.tracoes} selecionados={lista('tracao')} alternar={alternar('tracao')} />
      <Faixa titulo="Ano-modelo" chaveMin="ano_min" chaveMax="ano_max" params={params} definir={definir}
        placeholder={[opcoes?.anos.min ?? 'de', opcoes?.anos.max ?? 'até']} />
      <Faixa titulo="Potência (cv)" chaveMin="pot_min" chaveMax="pot_max" params={params} definir={definir} placeholder={['mín.', 'máx.']} />
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input type="checkbox" className="accent-orange-500" checked={params.get('apenas_atuais') === '1'} onChange={(e) => definir('apenas_atuais', e.target.checked ? '1' : '')} />
        Só modelos atuais
      </label>
      {ativos > 0 && (
        <button onClick={() => { setTexto(''); setParams(params.get('ordem') ? { ordem: params.get('ordem') } : {}); }}
          className="w-full rounded-xl border border-white/10 py-2 text-sm font-semibold text-zinc-400 hover:text-white">Limpar filtros</button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight">Catálogo de versões</h1>
      <p className="mt-1 text-sm text-zinc-500">Filtre por qualquer característica técnica. Os filtros ficam no link — dá para compartilhar a busca.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Marca, modelo, versão ou motor…" aria-label="Buscar no catálogo"
            className="w-full rounded-2xl border border-white/10 bg-painel py-3 pl-11 pr-10 outline-none focus:border-marca-500/50" />
          {texto && <button onClick={() => setTexto('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white" aria-label="Limpar busca"><X size={16} /></button>}
        </div>
        <div className="flex gap-3">
          <select value={params.get('ordem') ?? 'relevancia'} onChange={(e) => definir('ordem', e.target.value === 'relevancia' ? '' : e.target.value)} aria-label="Ordenar por"
            className="flex-1 rounded-2xl border border-white/10 bg-painel px-4 py-3 text-sm outline-none focus:border-marca-500/50">
            {ORDENS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
          <button onClick={() => setFiltrosAbertos(true)} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-painel px-4 text-sm font-semibold lg:hidden">
            <SlidersHorizontal size={16} /> Filtros {ativos > 0 && <span className="rounded-full bg-marca-600 px-1.5 text-[10px]">{ativos}</span>}
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">{painel}</aside>
        {filtrosAbertos && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 lg:hidden" onClick={() => setFiltrosAbertos(false)}>
            <div className="h-full w-80 max-w-full overflow-y-auto bg-fundo p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-bold">Filtros</h2>
                <button onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros"><X /></button>
              </div>
              {painel}
              <button onClick={() => setFiltrosAbertos(false)} className="mt-6 w-full rounded-xl bg-marca-600 py-3 font-bold">
                Ver {dados ? num(dados.total) : ''} resultados
              </button>
            </div>
          </div>
        )}

        <section aria-live="polite" className={carregando && dados ? 'opacity-60 transition' : ''}>
          {erro && <Erro erro={erro} />}
          {!dados && carregando && <Carregando />}
          {dados && (
            <>
              <p className="mb-4 text-sm text-zinc-500">{num(dados.total)} versões encontradas</p>
              {dados.itens.length === 0
                ? <Vazio titulo="Nenhuma versão com esses filtros">Tente remover algum filtro ou buscar outro termo.</Vazio>
                : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{dados.itens.map((v) => <VersaoCard key={v.slug} v={v} />)}</div>}
              <Paginacao pagina={dados.pagina} paginas={dados.paginas} irPara={irPara} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

