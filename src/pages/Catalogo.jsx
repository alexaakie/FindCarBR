import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Search, SlidersHorizontal, Table2, X } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { num } from '../lib/formato.js';
import VersaoCard, { TabelaVersoes } from '../components/VersaoCard.jsx';
import { Carregando, Chip, Erro, Migalhas, Paginacao, Vazio } from '../components/ui.jsx';

const ORDENS = [
  ['relevancia', 'Marca e modelo (A–Z)'],
  ['ano_desc', 'Mais novos'],
  ['preco_asc', 'Menor preço FIPE'],
  ['preco_desc', 'Maior preço FIPE'],
  ['potencia_desc', 'Mais potentes'],
  ['potencia_asc', 'Menos potentes'],
  ['aceleracao', 'Mais rápidos (0–100)'],
  ['peso_potencia', 'Melhor peso/potência'],
  ['consumo', 'Mais econômicos (cidade)'],
  ['porta_malas', 'Maior porta-malas'],
];
const NAO_FILTROS = ['pagina', 'ordem', 'vista'];
const ROTULOS = { q: 'Busca', marca: 'Marca', categoria: 'Categoria', combustivel: 'Combustível', tracao: 'Tração', cambio: 'Câmbio',
  ano_min: 'Ano a partir de', ano_max: 'Ano até', pot_min: 'Potência mín.', pot_max: 'Potência máx.', preco_min: 'Preço mín.', preco_max: 'Preço máx.', apenas_atuais: 'Só linha atual' };

function Grupo({ titulo, children }) {
  return (
    <fieldset className="border-b border-borda py-4 first:pt-0 last:border-0">
      <legend className="rotulo mb-2 float-left w-full">{titulo}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function Faixa({ chaveMin, chaveMax, params, definir, placeholder, passo }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" inputMode="numeric" step={passo} className="campo" placeholder={placeholder[0]} aria-label="mínimo"
        value={params.get(chaveMin) ?? ''} onChange={(e) => definir(chaveMin, e.target.value)} />
      <span className="text-tinta-3">a</span>
      <input type="number" inputMode="numeric" step={passo} className="campo" placeholder={placeholder[1]} aria-label="máximo"
        value={params.get(chaveMax) ?? ''} onChange={(e) => definir(chaveMax, e.target.value)} />
    </div>
  );
}

export default function Catalogo() {
  const [params, setParams] = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const { dados: opcoes } = useApi('/filtros');
  const vista = params.get('vista') === 'tabela' ? 'tabela' : 'cards';

  const qParam = params.get('q') ?? '';
  const [qAnterior, setQAnterior] = useState(qParam);
  if (qParam !== qAnterior) { setQAnterior(qParam); setTexto(qParam); }

  const atualizar = (fn) => setParams((p) => { const n = new URLSearchParams(p); fn(n); n.delete('pagina'); return n; }, { replace: true });
  const definir = (chave, valor) => atualizar((n) => (valor ? n.set(chave, valor) : n.delete(chave)));
  const lista = (chave) => (params.get(chave) ?? '').split(',').filter(Boolean);
  const alternar = (chave, valor) => {
    const atual = lista(chave);
    definir(chave, (atual.includes(valor) ? atual.filter((x) => x !== valor) : [...atual, valor]).join(','));
  };

  useEffect(() => {
    if (texto === qParam) return undefined;
    const t = setTimeout(() => definir('q', texto.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  const consulta = new URLSearchParams(params);
  consulta.delete('vista');
  consulta.set('por_pagina', vista === 'tabela' ? '50' : '24');
  const { dados, erro, carregando } = useApi(`/versoes?${consulta.toString()}`);

  const ativos = [...params.entries()].filter(([k]) => !NAO_FILTROS.includes(k));
  const irPara = (p) => { setParams((a) => { const n = new URLSearchParams(a); n.set('pagina', p); return n; }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const limpar = () => { setTexto(''); setParams(Object.fromEntries([...params.entries()].filter(([k]) => k === 'ordem' || k === 'vista'))); };
  const marcaAtual = opcoes?.marcas.find((m) => m.slug === params.get('marca'));

  const chips = (chave, valores) => (
    <div className="flex flex-wrap gap-1.5">
      {valores?.map((o) => <Chip key={o} ativo={lista(chave).includes(o)} onClick={() => alternar(chave, o)}>{o}</Chip>)}
    </div>
  );

  const painel = (
    <div>
      <Grupo titulo="Marca">
        <select value={params.get('marca') ?? ''} onChange={(e) => definir('marca', e.target.value)} className="campo" aria-label="Marca">
          <option value="">Todas as marcas</option>
          {opcoes?.marcas.map((m) => <option key={m.slug} value={m.slug}>{m.nome} ({m.versoes})</option>)}
        </select>
      </Grupo>
      <Grupo titulo="Categoria">{chips('categoria', opcoes?.categorias)}</Grupo>
      <Grupo titulo="Preço FIPE (R$)"><Faixa chaveMin="preco_min" chaveMax="preco_max" params={params} definir={definir} placeholder={['de', 'até']} passo={10000} /></Grupo>
      <Grupo titulo="Combustível">{chips('combustivel', opcoes?.combustiveis)}</Grupo>
      <Grupo titulo="Câmbio">{chips('cambio', opcoes?.cambios)}</Grupo>
      <Grupo titulo="Tração">{chips('tracao', opcoes?.tracoes)}</Grupo>
      <Grupo titulo="Potência (cv)"><Faixa chaveMin="pot_min" chaveMax="pot_max" params={params} definir={definir} placeholder={['mín.', 'máx.']} passo={10} /></Grupo>
      <Grupo titulo="Ano-modelo"><Faixa chaveMin="ano_min" chaveMax="ano_max" params={params} definir={definir} placeholder={[opcoes?.anos.min ?? 'de', opcoes?.anos.max ?? 'até']} /></Grupo>
      <Grupo titulo="Linha">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-marca-600)]" checked={params.get('apenas_atuais') === '1'}
            onChange={(e) => definir('apenas_atuais', e.target.checked ? '1' : '')} />
          Só modelos da linha atual
        </label>
      </Grupo>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Migalhas itens={[['Catálogo']]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">{marcaAtual ? `Catálogo ${marcaAtual.nome}` : 'Catálogo de versões'}</h1>
          <p className="text-sm text-tinta-2">{dados ? `${num(dados.total)} versões encontradas` : 'Carregando…'} · os filtros ficam no link, dá para compartilhar.</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Marca, modelo, versão ou motor" aria-label="Buscar no catálogo" className="campo py-2.5 pl-9 pr-9" />
          {texto && <button onClick={() => setTexto('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-tinta-3 hover:text-tinta" aria-label="Limpar busca"><X size={16} /></button>}
        </div>
        <div className="flex gap-2">
          <select value={params.get('ordem') ?? 'relevancia'} onChange={(e) => definir('ordem', e.target.value === 'relevancia' ? '' : e.target.value)} aria-label="Ordenar por" className="campo flex-1 py-2.5 sm:w-60">
            {ORDENS.map(([v, r]) => <option key={v} value={v}>Ordenar: {r}</option>)}
          </select>
          <div className="flex rounded-lg border border-borda bg-painel p-0.5" role="group" aria-label="Visualização">
            {[['cards', LayoutGrid, 'Cards'], ['tabela', Table2, 'Tabela']].map(([v, Icone, r]) => (
              <button key={v} onClick={() => setParams((p) => { const n = new URLSearchParams(p); if (v === 'tabela') n.set('vista', v); else n.delete('vista'); n.delete('pagina'); return n; }, { replace: true })}
                aria-pressed={vista === v} title={r}
                className={`flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold ${vista === v ? 'bg-tinta text-white' : 'text-tinta-2 hover:text-tinta'}`}>
                <Icone size={15} /> <span className="hidden sm:inline">{r}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setFiltrosAbertos(true)} className="botao border border-borda bg-painel lg:hidden">
            <SlidersHorizontal size={15} /> Filtros {ativos.length > 0 && <span className="rounded-full bg-marca-600 px-1.5 text-[10px] text-white">{ativos.length}</span>}
          </button>
        </div>
      </div>

      {ativos.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {ativos.map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 rounded-md bg-marca-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-marca-700">
              {ROTULOS[k] ?? k}: {k === 'marca' ? marcaAtual?.nome ?? v : k === 'apenas_atuais' ? 'sim' : v.split(',').join(', ')}
              <button onClick={() => { if (k === 'q') setTexto(''); definir(k, ''); }} className="rounded p-0.5 hover:bg-marca-100" aria-label={`Remover filtro ${ROTULOS[k] ?? k}`}><X size={12} /></button>
            </span>
          ))}
          <button onClick={limpar} className="px-2 text-xs font-semibold text-tinta-2 underline hover:text-tinta">Limpar tudo</button>
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="cartao hidden h-fit p-4 lg:block">{painel}</aside>
        {filtrosAbertos && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 lg:hidden" onClick={() => setFiltrosAbertos(false)}>
            <div className="flex h-full w-80 max-w-full flex-col bg-painel" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-borda px-4 py-3">
                <h2 className="font-bold">Filtros</h2>
                <button onClick={() => setFiltrosAbertos(false)} aria-label="Fechar filtros"><X /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">{painel}</div>
              <div className="border-t border-borda p-3">
                <button onClick={() => setFiltrosAbertos(false)} className="botao w-full bg-marca-600 py-3 text-white">Ver {dados ? num(dados.total) : ''} versões</button>
              </div>
            </div>
          </div>
        )}

        <section aria-live="polite" className={`min-w-0 ${carregando && dados ? 'opacity-60 transition' : ''}`}>
          {erro && <Erro erro={erro} />}
          {!dados && carregando && <Carregando />}
          {dados && dados.itens.length === 0 && (
            <Vazio titulo="Nenhuma versão com esses filtros">
              Tente remover algum filtro.{(params.get('preco_min') || params.get('preco_max') || params.get('ordem')?.startsWith('preco')) && ' Filtros de preço só encontram versões ligadas à Tabela FIPE.'}
            </Vazio>
          )}
          {dados && dados.itens.length > 0 && (vista === 'tabela'
            ? <TabelaVersoes versoes={dados.itens} />
            : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{dados.itens.map((v) => <VersaoCard key={v.slug} v={v} />)}</div>)}
          {dados && <Paginacao pagina={dados.pagina} paginas={dados.paginas} irPara={irPara} />}
        </section>
      </div>
    </div>
  );
}
