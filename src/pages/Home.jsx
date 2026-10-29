import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Calculator, ListOrdered, Scale, Search, Table2 } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { num } from '../lib/formato.js';
import VersaoCard from '../components/VersaoCard.jsx';
import { Silhueta } from '../components/FotoCarro.jsx';
import { ListaRanking } from '../components/Ranking.jsx';
import { RANKINGS } from '../lib/rankings.js';
import { Secao } from '../components/ui.jsx';

const CATEGORIAS = [
  ['Hatch', 'Hatches', 'categoria=Hatch'],
  ['Sedan', 'Sedãs', 'categoria=Sedan'],
  ['SUV', 'SUVs', 'categoria=SUV'],
  ['Picape', 'Picapes', 'categoria=Picape'],
  ['Esportivo', 'Esportivos', 'categoria=Esportivo,Cupê,Conversível'],
  ['Minivan', 'Minivans e utilitários', 'categoria=Minivan,Utilitário'],
  ['Hatch', 'Elétricos', 'combustivel=Elétrico'],
  ['SUV', 'Híbridos', 'combustivel=Híbrido,Híbrido Flex,Híbrido Plug-in'],
];

const FAIXAS = [
  ['Até R$ 100 mil', 'preco_max=100000'],
  ['R$ 100 a 150 mil', 'preco_min=100000&preco_max=150000'],
  ['R$ 150 a 250 mil', 'preco_min=150000&preco_max=250000'],
  ['R$ 250 a 500 mil', 'preco_min=250000&preco_max=500000'],
  ['Acima de R$ 500 mil', 'preco_min=500000'],
];

// Busca guiada "marca → modelo", como nos portais clássicos
function BuscaGuiada() {
  const navegar = useNavigate();
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [texto, setTexto] = useState('');
  const { dados: marcas } = useApi('/marcas');
  const { dados: detalhe } = useApi(marca ? `/marcas/${marca}` : null);
  const modelos = marca && detalhe?.slug === marca ? detalhe.modelos : [];

  const ir = (e) => {
    e.preventDefault();
    if (marca && modelo) navegar(`/marca/${marca}/${modelo}`);
    else if (marca) navegar(`/marca/${marca}`);
    else navegar(`/catalogo${texto.trim() ? `?q=${encodeURIComponent(texto.trim())}` : ''}`);
  };

  return (
    <form onSubmit={ir} className="rounded-xl bg-painel p-4 text-tinta shadow-2xl sm:p-5">
      <p className="mb-3 font-titulo text-base font-extrabold">Encontre a ficha técnica</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select aria-label="Marca" value={marca} onChange={(e) => { setMarca(e.target.value); setModelo(''); }} className="campo py-2.5">
          <option value="">Marca</option>
          {marcas?.filter((m) => m.versoes > 0).map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
        </select>
        <select aria-label="Modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} disabled={!marca} className="campo py-2.5 disabled:bg-painel-2 disabled:text-tinta-3">
          <option value="">{marca ? 'Todos os modelos' : 'Modelo'}</option>
          {modelos.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
        </select>
        <button className="botao bg-marca-600 py-2.5 text-white hover:bg-marca-700">Ver fichas</button>
      </div>
      <div className="my-3 flex items-center gap-3 text-xs text-tinta-3"><span className="h-px flex-1 bg-borda" /> ou busque por nome <span className="h-px flex-1 bg-borda" /></div>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tinta-3" />
        <input value={texto} onChange={(e) => { setTexto(e.target.value); setMarca(''); setModelo(''); }} placeholder="Ex.: Polo TSI, Corolla Cross híbrido, Hilux diesel"
          aria-label="Buscar por nome" className="campo py-2.5 pl-9" />
      </div>
    </form>
  );
}

export default function Home() {
  const [ranking, setRanking] = useState(RANKINGS[0]);
  const { dados: est } = useApi('/estatisticas');
  const { dados: marcas } = useApi('/marcas');
  const { dados: destaques } = useApi('/versoes?apenas_atuais=1&ordem=destaque&categoria=SUV,Hatch,Sedan,Picape&por_pagina=8');

  return (
    <>
      <section className="bg-noite text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-14">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-marca-500">Catálogo técnico automotivo</p>
            <h1 className="font-titulo text-4xl font-black leading-[1.05] sm:text-5xl">Todos os números de cada versão, sem anúncio no caminho.</h1>
            <p className="mt-4 max-w-xl text-white/70">Motor, câmbio, desempenho, consumo Inmetro, dimensões, preço FIPE e custo de uso. Compare até quatro versões lado a lado.</p>
            {est && (
              <dl className="mt-7 grid max-w-lg grid-cols-4 divide-x divide-white/10 border-y border-white/10 py-3">
                {[['marcas', est.marcas], ['modelos', est.modelos], ['versões', est.versoes], ['preços FIPE', est.fipe]].map(([r, v]) => (
                  <div key={r} className="px-3 first:pl-0">
                    <dd className="font-titulo text-2xl font-black">{num(v)}</dd>
                    <dt className="text-xs text-white/50">{r}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <BuscaGuiada />
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 pt-10 sm:px-6">
        <Secao titulo="Por categoria">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CATEGORIAS.map(([forma, rotulo, qs]) => (
              <Link key={rotulo} to={`/catalogo?${qs}`} className="cartao group flex items-center gap-3 p-3 transition hover:border-marca-500">
                <Silhueta categoria={forma} className="w-20 shrink-0 text-[#b9c1cc] transition group-hover:text-marca-500" />
                <span className="text-sm font-bold">{rotulo}</span>
              </Link>
            ))}
          </div>
        </Secao>

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <Secao titulo="Rankings" acao={<Link to={`/rankings#${ranking.id}`} className="flex items-center gap-1 text-sm font-semibold text-marca-600 hover:underline">Ranking completo <ArrowRight size={14} /></Link>}>
            <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
              {RANKINGS.map((r) => (
                <button key={r.id} role="tab" aria-selected={r.id === ranking.id} onClick={() => setRanking(r)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${r.id === ranking.id ? 'bg-tinta text-white' : 'bg-painel text-tinta-2 ring-1 ring-borda hover:text-tinta'}`}>
                  {r.titulo}
                </button>
              ))}
            </div>
            <div className="cartao px-3 py-1">
              <ListaRanking key={ranking.id} ranking={ranking} limite={10} comFoto />
            </div>
          </Secao>

          <div className="space-y-8">
            <Secao titulo="Por preço">
              <ul className="cartao divide-y divide-borda">
                {FAIXAS.map(([r, qs]) => (
                  <li key={r}><Link to={`/catalogo?${qs}&ordem=preco_asc`} className="flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-painel-2">{r} <ArrowRight size={14} className="text-tinta-3" /></Link></li>
                ))}
              </ul>
              {est && !est.fipe && <p className="mt-2 text-xs text-tinta-3">Os filtros por preço funcionam depois de importar a Tabela FIPE.</p>}
            </Secao>
            <Secao titulo="Ferramentas">
              <div className="grid gap-2">
                {[
                  [Scale, 'Comparador', 'Até 4 versões lado a lado, com o melhor de cada item destacado', '/comparar'],
                  [Table2, 'Catálogo em tabela', 'Todas as versões com filtros técnicos e ordenação', '/catalogo?vista=tabela'],
                  [Calculator, 'Custo de uso', 'Combustível por km e IPVA na ficha de cada versão', '/catalogo'],
                  [ListOrdered, 'Tabela FIPE', 'Preço médio de todo o mercado brasileiro', '/fipe'],
                ].map(([Icone, t, d, p]) => (
                  <Link key={t} to={p} className="cartao flex gap-3 p-3 hover:border-marca-500">
                    <Icone size={20} className="mt-0.5 shrink-0 text-marca-600" />
                    <span><span className="block text-sm font-bold">{t}</span><span className="block text-xs text-tinta-2">{d}</span></span>
                  </Link>
                ))}
              </div>
            </Secao>
          </div>
        </div>

        <Secao titulo="Na linha atual" subtitulo="Versões dos modelos à venda agora" acao={<Link to="/catalogo?apenas_atuais=1" className="flex items-center gap-1 text-sm font-semibold text-marca-600 hover:underline">Ver todas <ArrowRight size={14} /></Link>}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destaques?.itens.map((v) => <VersaoCard key={v.slug} v={v} />)}
          </div>
        </Secao>

        <Secao titulo="Marcas" acao={<Link to="/marcas" className="flex items-center gap-1 text-sm font-semibold text-marca-600 hover:underline">Todas <ArrowRight size={14} /></Link>}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {marcas?.filter((m) => m.versoes > 0).map((m) => (
              <Link key={m.slug} to={`/marca/${m.slug}`} className="cartao px-4 py-3 transition hover:border-marca-500">
                <p className="font-titulo font-extrabold">{m.nome}</p>
                <p className="text-xs text-tinta-3">{m.modelos} modelos · {m.versoes} versões</p>
              </Link>
            ))}
          </div>
        </Secao>
      </div>
    </>
  );
}
