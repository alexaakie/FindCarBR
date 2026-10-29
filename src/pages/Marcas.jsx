import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Scale } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { useComparador, MAX_COMPARAR } from '../lib/comparador.jsx';
import { faixaPreco, nomeCompleto, num } from '../lib/formato.js';
import FotoCarro from '../components/FotoCarro.jsx';
import { TabelaVersoes } from '../components/VersaoCard.jsx';
import { Carregando, Erro, Migalhas, Secao, StatusDados, Vazio } from '../components/ui.jsx';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Marcas() {
  const { dados, erro, carregando } = useApi('/marcas');
  const [filtro, setFiltro] = useState('');
  if (erro) return <Erro erro={erro} />;
  if (carregando && !dados) return <Carregando />;
  const lista = dados.filter((m) => norm(m.nome).includes(norm(filtro)));
  const comFicha = lista.filter((m) => m.versoes > 0);
  const soFipe = lista.filter((m) => m.versoes === 0);
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Migalhas itens={[['Marcas']]} />
      <h1 className="mt-2 text-3xl font-black">Marcas</h1>
      <p className="text-sm text-tinta-2">{comFicha.length} marcas com ficha técnica{soFipe.length ? ` e ${soFipe.length} só com Tabela FIPE` : ''}.</p>
      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar marcas" aria-label="Filtrar marcas" className="campo mt-5 max-w-sm py-2.5" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {comFicha.map((m) => (
          <Link key={m.slug} to={`/marca/${m.slug}`} className="cartao group p-4 transition hover:border-marca-500">
            <p className="font-titulo text-xl font-black group-hover:text-marca-600">{m.nome}</p>
            <p className="text-xs text-tinta-3">{m.pais}</p>
            <p className="mt-3 text-sm text-tinta-2">{m.modelos} modelos · {m.versoes} fichas{m.fipe ? ` · ${num(m.fipe)} FIPE` : ''}</p>
          </Link>
        ))}
      </div>
      {soFipe.length > 0 && (
        <Secao titulo="Outras marcas" subtitulo="Ainda sem ficha técnica; veja os preços na Tabela FIPE" className="mt-10">
          <div className="flex flex-wrap gap-2">
            {soFipe.map((m) => <Link key={m.slug} to={`/fipe?marca=${m.slug}`} className="rounded-md border border-borda bg-painel px-3 py-1.5 text-sm hover:border-tinta-3">{m.nome}</Link>)}
          </div>
        </Secao>
      )}
      {!lista.length && <Vazio titulo="Nenhuma marca com esse nome" />}
    </div>
  );
}

export function Marca() {
  const { slug } = useParams();
  const { dados, erro, carregando } = useApi(`/marcas/${slug}`);
  const [categoria, setCategoria] = useState('');
  if (erro) return <Erro erro={erro} />;
  if (carregando && !dados) return <Carregando />;
  const categorias = [...new Set(dados.modelos.map((m) => m.categoria))];
  const visiveis = dados.modelos.filter((m) => !categoria || m.categoria === categoria);
  const atuais = visiveis.filter((m) => m.ano_max >= Math.max(...dados.modelos.map((x) => x.ano_max)) - 1);
  const antigos = visiveis.filter((m) => !atuais.includes(m));
  const totalVersoes = dados.modelos.reduce((s, m) => s + m.versoes, 0);

  const grade = (modelos) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {modelos.map((m) => (
        <Link key={m.slug} to={`/marca/${slug}/${m.slug}`} className="cartao group overflow-hidden transition hover:shadow-lg hover:shadow-black/5">
          <FotoCarro url={m.foto_url} categoria={m.categoria} alt={`${dados.nome} ${m.nome}`} />
          <div className="p-4">
            <p className="rotulo">{m.categoria} · {m.ano_min === m.ano_max ? m.ano_max : `${m.ano_min}–${m.ano_max}`}</p>
            <h3 className="text-xl font-black group-hover:text-marca-600">{m.nome}</h3>
            <dl className="mt-2 space-y-0.5 text-[13px]">
              <div className="flex justify-between"><dt className="text-tinta-3">Versões</dt><dd className="font-semibold">{m.versoes}</dd></div>
              <div className="flex justify-between"><dt className="text-tinta-3">Potência</dt><dd className="font-semibold">{m.pot_max ? (m.pot_min === m.pot_max ? `${num(m.pot_max)} cv` : `${num(m.pot_min)} a ${num(m.pot_max)} cv`) : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-tinta-3">Combustível</dt><dd className="truncate pl-2 font-semibold">{m.combustiveis?.split(',').join(', ') ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-tinta-3">Preço FIPE</dt><dd className="font-semibold">{faixaPreco(m.preco_min, m.preco_max) ?? '—'}</dd></div>
            </dl>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <div className="border-b border-borda bg-painel">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Migalhas itens={[['Marcas', '/marcas'], [dados.nome]]} />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black">{dados.nome}</h1>
              <p className="text-tinta-2">{dados.pais} · {dados.modelos.length} modelos · {totalVersoes} versões com ficha técnica</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/catalogo?marca=${slug}&vista=tabela`} className="botao border border-borda bg-painel hover:border-tinta">Todas as versões em tabela</Link>
              {dados.fipe_modelos > 0 && <Link to={`/fipe?marca=${slug}`} className="botao border border-borda bg-painel hover:border-tinta">{num(dados.fipe_modelos)} na FIPE</Link>}
            </div>
          </div>
          {categorias.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {['', ...categorias].map((c) => (
                <button key={c || 'todas'} onClick={() => setCategoria(c)} aria-pressed={categoria === c}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${categoria === c ? 'bg-tinta text-white' : 'bg-painel-2 text-tinta-2 ring-1 ring-borda hover:text-tinta'}`}>
                  {c || 'Todas'} <span className="opacity-60">{c ? dados.modelos.filter((m) => m.categoria === c).length : dados.modelos.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl space-y-10 px-4 pt-8 sm:px-6">
        {atuais.length > 0 && <Secao titulo="Linha atual">{grade(atuais)}</Secao>}
        {antigos.length > 0 && <Secao titulo="Modelos anteriores" subtitulo="Fora de linha ou com ficha apenas de anos anteriores">{grade(antigos)}</Secao>}
      </div>
    </>
  );
}

function Resumo({ rotulo, valor }) {
  return (
    <div className="border-l-2 border-marca-500 pl-3">
      <dt className="rotulo">{rotulo}</dt>
      <dd className="text-lg font-extrabold">{valor ?? '—'}</dd>
    </div>
  );
}

export function Modelo() {
  const { marca, modelo } = useParams();
  const { dados, erro, carregando } = useApi(`/modelos/${marca}/${modelo}`);
  const { itens, alternar, limpar } = useComparador();
  if (erro) return <Erro erro={erro} />;
  if (carregando && !dados) return <Carregando />;

  const todas = dados.geracoes.flatMap((g) => g.versoes);
  const pots = todas.map((v) => v.potencia_max_cv).filter(Boolean);
  const consumos = todas.map((v) => v.consumo_urbano_gasolina ?? v.consumo_urbano_etanol).filter(Boolean);
  const combustiveis = [...new Set(todas.map((v) => v.combustivel).filter(Boolean))];
  const cambios = [...new Set(todas.map((v) => v.cambio).filter(Boolean))];
  const atual = dados.geracoes[0];
  const foto = dados.foto_url ? { url: dados.foto_url, autor: dados.foto_autor, licenca: dados.foto_licenca, pagina: dados.foto_pagina } : null;

  const compararGeracao = (g) => {
    limpar();
    g.versoes.slice(0, MAX_COMPARAR).forEach((v) => alternar({ slug: v.slug, nome: nomeCompleto(v) }));
  };

  return (
    <>
      <div className="border-b border-borda bg-painel">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Migalhas itens={[['Marcas', '/marcas'], [dados.marca, `/marca/${marca}`], [dados.nome]]} />
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <FotoCarro foto={foto} categoria={dados.categoria} alt={`${dados.marca} ${dados.nome}`} credito className="rounded-xl" />
            <div className="flex flex-col">
              <p className="rotulo">{dados.marca} · {dados.categoria}</p>
              <h1 className="text-4xl font-black sm:text-5xl">{dados.nome}</h1>
              <p className="mt-1 text-tinta-2">{dados.total_versoes} versões em {dados.geracoes.length} {dados.geracoes.length === 1 ? 'geração' : 'gerações'} · geração atual: {atual?.nome}</p>
              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
                <Resumo rotulo="Preço FIPE" valor={faixaPreco(dados.preco_min, dados.preco_max)} />
                <Resumo rotulo="Potência" valor={pots.length ? (Math.min(...pots) === Math.max(...pots) ? `${num(pots[0])} cv` : `${num(Math.min(...pots))} a ${num(Math.max(...pots))} cv`) : null} />
                <Resumo rotulo="Consumo na cidade" valor={consumos.length ? `até ${num(Math.max(...consumos), 1)} km/l` : null} />
                <Resumo rotulo="Combustível" valor={combustiveis.join(', ')} />
                <Resumo rotulo="Câmbio" valor={cambios.join(', ')} />
                <Resumo rotulo="Anos com ficha" valor={`${Math.min(...todas.map((v) => v.ano_modelo))}–${Math.max(...todas.map((v) => v.ano_modelo))}`} />
              </dl>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {atual && atual.versoes.length > 1 && (
                  <button onClick={() => compararGeracao(atual)} className="botao bg-marca-600 text-white hover:bg-marca-700">
                    <Scale size={15} /> Comparar versões {atual.versoes.length > MAX_COMPARAR ? `(${MAX_COMPARAR} primeiras)` : ''}
                  </button>
                )}
                <Link to={`/catalogo?q=${encodeURIComponent(dados.nome)}&marca=${marca}`} className="botao border border-borda bg-painel hover:border-tinta">Ver no catálogo <ArrowRight size={14} /></Link>
              </div>
              {itens.length > 0 && <p className="mt-2 text-xs text-tinta-3">As versões selecionadas aparecem na barra do comparador, embaixo.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 pt-8 sm:px-6">
        {dados.geracoes.length > 1 && (
          <Secao titulo="Gerações">
            <ol className="flex gap-0 overflow-x-auto pb-2">
              {[...dados.geracoes].reverse().map((g, i, arr) => (
                <li key={g.nome} className="relative min-w-[200px] flex-1 pr-4">
                  <div className="flex items-center">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${i === arr.length - 1 ? 'bg-marca-600 ring-4 ring-marca-100' : 'bg-tinta-3'}`} />
                    {i < arr.length - 1 && <span className="h-0.5 flex-1 bg-borda" />}
                  </div>
                  <p className="mt-2 font-bold">{g.nome}</p>
                  <p className="text-sm text-tinta-2">{g.ano_inicio}{g.ano_fim ? `–${g.ano_fim}` : ' até hoje'} · {g.versoes.length} {g.versoes.length === 1 ? 'versão' : 'versões'}</p>
                </li>
              ))}
            </ol>
          </Secao>
        )}

        {dados.geracoes.map((g) => (
          <Secao key={g.nome} titulo={`Versões · ${g.nome}`} subtitulo={`${g.ano_inicio}${g.ano_fim ? `–${g.ano_fim}` : ' até hoje'}`}
            acao={g.versoes.some((v) => v.status_dados !== 'verificado') && <StatusDados status="verificar" />}>
            <TabelaVersoes versoes={g.versoes} mostrarModelo={false} />
          </Secao>
        ))}
        {todas.some((v) => !v.preco) && <p className="text-xs text-tinta-3">Preço “—”: versão ainda não ligada à Tabela FIPE.</p>}
      </div>
    </>
  );
}
