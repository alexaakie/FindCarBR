import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trophy, X } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { useComparador } from '../lib/comparador.jsx';
import { cambioTexto, com, nomeCompleto, num, potencia, reais, torque } from '../lib/formato.js';
import AnaliseIA from '../components/AnaliseIA.jsx';
import FotoCarro from '../components/FotoCarro.jsx';
import { usePreferencias } from '../lib/preferencias.jsx';
import { custoPorKm, ipvaAnual, IPVA_UF } from '../lib/custos.js';
import { Carregando, Erro, Migalhas, StatusDados, Vazio } from '../components/ui.jsx';

// [rótulo, extrator de valor numérico (para destacar o melhor), formatador, melhor = 'max' | 'min']
const GRUPOS = [
  ['Motor', [
    ['Motor', null, (f) => com(f.motor.codigo)],
    ['Combustível', null, (f) => com(f.motor.combustivel)],
    ['Cilindrada', (f) => f.motor.cilindrada_cc, (f) => com(f.motor.cilindrada_cc, 'cm³')],
    ['Potência', (f) => f.motor.potencia_max_cv, (f) => potencia(f.motor), 'max'],
    ['Torque', (f) => f.motor.torque_kgfm_etanol ?? f.motor.torque_kgfm, (f) => torque(f.motor), 'max'],
  ]],
  ['Transmissão', [
    ['Câmbio', null, (f) => cambioTexto(f.transmissao)],
    ['Tração', null, (f) => com(f.transmissao.tracao)],
  ]],
  ['Desempenho', [
    ['0 a 100 km/h', (f) => f.desempenho.zero_a_cem_s, (f) => com(f.desempenho.zero_a_cem_s, 's', 1), 'min'],
    ['Velocidade máxima', (f) => f.desempenho.vel_max_kmh, (f) => com(f.desempenho.vel_max_kmh, 'km/h'), 'max'],
    ['Peso/potência', (f) => f.desempenho.peso_potencia, (f) => com(f.desempenho.peso_potencia, 'kg/cv', 2), 'min'],
  ]],
  ['Consumo e autonomia', [
    ['Cidade (gasolina)', (f) => f.consumo.urbano_gasolina, (f) => com(f.consumo.urbano_gasolina, 'km/l', 1), 'max'],
    ['Estrada (gasolina)', (f) => f.consumo.estrada_gasolina, (f) => com(f.consumo.estrada_gasolina, 'km/l', 1), 'max'],
    ['Cidade (etanol)', (f) => f.consumo.urbano_etanol, (f) => com(f.consumo.urbano_etanol, 'km/l', 1), 'max'],
    ['Estrada (etanol)', (f) => f.consumo.estrada_etanol, (f) => com(f.consumo.estrada_etanol, 'km/l', 1), 'max'],
    ['Autonomia elétrica', (f) => f.eletrico?.autonomia_km, (f) => com(f.eletrico?.autonomia_km, 'km'), 'max'],
  ]],
  ['Dimensões', [
    ['Comprimento', (f) => f.dimensoes.comprimento_mm, (f) => com(f.dimensoes.comprimento_mm, 'mm')],
    ['Entre-eixos', (f) => f.dimensoes.entre_eixos_mm, (f) => com(f.dimensoes.entre_eixos_mm, 'mm'), 'max'],
    ['Porta-malas / caçamba', (f) => f.dimensoes.porta_malas_l, (f) => com(f.dimensoes.porta_malas_l, 'L'), 'max'],
    ['Tanque', (f) => f.dimensoes.tanque_l, (f) => com(f.dimensoes.tanque_l, 'L'), 'max'],
    ['Peso', (f) => f.dimensoes.peso_kg, (f) => com(f.dimensoes.peso_kg, 'kg')],
  ]],
  ['Preço', [
    ['Preço FIPE', (f) => f.preco, (f) => reais(f.preco), 'min'],
  ]],
];

function melhorIndice(fichas, extrair, criterio) {
  if (!extrair || !criterio) return -1;
  const vals = fichas.map(extrair);
  const validos = vals.filter((v) => v != null);
  if (validos.length < 2) return -1;
  const alvo = criterio === 'max' ? Math.max(...validos) : Math.min(...validos);
  return vals.filter((v) => v === alvo).length === 1 ? vals.indexOf(alvo) : -1;
}

export default function Comparar() {
  const [params, setParams] = useSearchParams();
  const { itens, alternar } = useComparador();
  const { pref } = usePreferencias();
  const [soDiferencas, setSoDiferencas] = useState(false);
  const slugsUrl = params.get('v');
  const slugs = slugsUrl ?? itens.map((i) => i.slug).join(',');

  // sem ?v= na URL, usa a seleção salva
  useEffect(() => { if (!slugsUrl && itens.length) setParams({ v: itens.map((i) => i.slug).join(',') }, { replace: true }); }, [slugsUrl, itens, setParams]);

  const { dados: fichas, erro, carregando } = useApi(slugs ? `/comparar?slugs=${slugs}` : null);
  const { dados: est } = useApi('/estatisticas');

  const remover = (f) => {
    if (itens.some((i) => i.slug === f.slug)) alternar({ slug: f.slug });
    const resto = slugs.split(',').filter((s) => s !== f.slug);
    setParams(resto.length ? { v: resto.join(',') } : {}, { replace: true });
  };

  if (!slugs) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <Migalhas itens={[['Comparador']]} />
        <h1 className="mb-6 mt-2 text-3xl font-black">Comparador</h1>
        <Vazio titulo="Nenhuma versão selecionada">
          Use o botão <b>Comparar</b> nos cards do <Link to="/catalogo" className="font-semibold text-marca-600 underline">catálogo</Link> para escolher até 4 versões.
        </Vazio>
      </div>
    );
  }
  if (erro) return <Erro erro={erro} />;
  if (carregando || !fichas) return <Carregando />;

  const pctIpva = pref.ipva_pct ?? IPVA_UF[pref.uf];
  const custoMin = (f) => Math.min(...custoPorKm(f, pref).map((o) => o.custoKm));
  const grupos = [...GRUPOS, ['Custos estimados', [
    ['Custo por km', (f) => (Number.isFinite(custoMin(f)) ? custoMin(f) : null), (f) => (Number.isFinite(custoMin(f)) ? `R$ ${num(custoMin(f), 2)}` : '—'), 'min'],
    [`Combustível por mês (${num(pref.km_mes)} km)`, (f) => (Number.isFinite(custoMin(f)) ? custoMin(f) * pref.km_mes : null), (f) => (Number.isFinite(custoMin(f)) ? reais(custoMin(f) * pref.km_mes) : '—'), 'min'],
    [`IPVA (${pref.uf}, ${num(pctIpva, 2)}%)`, (f) => ipvaAnual(f.preco, pctIpva), (f) => reais(ipvaAnual(f.preco, pctIpva)), 'min'],
  ]]];

  const colunas = `minmax(140px, 0.8fr) repeat(${fichas.length}, minmax(190px, 1fr))`;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Migalhas itens={[['Comparador']]} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Comparador</h1>
          <p className="text-sm text-tinta-2">O melhor valor de cada linha fica em verde. O link desta página guarda o comparativo.</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-marca-600)]" checked={soDiferencas} onChange={(e) => setSoDiferencas(e.target.checked)} />
          Mostrar só as diferenças
        </label>
      </div>

      <div className="cartao mt-5 overflow-x-auto">
        <div className="min-w-fit">
          <div className="grid border-b border-borda" style={{ gridTemplateColumns: colunas }}>
            <div className="flex items-end p-4 text-xs text-tinta-3">{fichas.length} de 4 versões</div>
            {fichas.map((f) => (
              <div key={f.slug} className="relative border-l border-borda p-3">
                <button onClick={() => remover(f)} className="absolute right-4 top-4 z-10 rounded-md bg-painel/90 p-1 text-tinta-2 shadow hover:text-tinta" aria-label={`Remover ${nomeCompleto(f)}`}><X size={14} /></button>
                <FotoCarro foto={f.foto} categoria={f.categoria} alt={`${f.marca} ${f.modelo}`} className="rounded-lg" />
                <p className="rotulo mt-3">{f.marca} · {f.ano_modelo}</p>
                <Link to={`/versao/${f.slug}`} className="block text-lg font-black leading-tight hover:text-marca-600">{f.modelo}</Link>
                <p className="text-sm font-semibold text-marca-700">{f.versao}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-titulo text-lg font-black">{f.preco ? reais(f.preco) : <span className="text-sm font-semibold text-tinta-3">sem preço FIPE</span>}</span>
                  <StatusDados status={f.status_dados} compacto />
                </div>
              </div>
            ))}
          </div>
          {grupos.map(([grupo, linhas]) => {
            const visiveis = linhas.filter(([, , formatar]) => !soDiferencas || new Set(fichas.map(formatar)).size > 1);
            if (!visiveis.length) return null;
            return (
              <div key={grupo}>
                <div className="border-b border-borda bg-painel-2 px-4 py-2 text-[12px] font-bold uppercase tracking-wide">{grupo}</div>
                {visiveis.map(([rotulo, extrair, formatar, criterio]) => {
                  const melhor = melhorIndice(fichas, extrair, criterio);
                  return (
                    <div key={rotulo} className="grid border-b border-borda text-sm last:border-0 hover:bg-painel-2/60" style={{ gridTemplateColumns: colunas }}>
                      <div className="px-4 py-2.5 text-tinta-2">{rotulo}</div>
                      {fichas.map((f, i) => {
                        const txt = formatar(f);
                        return (
                          <div key={f.slug} className={`flex items-center gap-1.5 border-l border-borda px-4 py-2.5 font-semibold ${i === melhor ? 'bg-ok-50 text-ok' : txt === '—' ? 'font-normal text-tinta-3' : ''}`}>
                            {i === melhor && <Trophy size={12} />} {txt}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-tinta-3">Custos usam os preços de combustível e o estado escolhidos na calculadora da página de cada versão.</p>

      {fichas.length >= 2 && est?.ia && (
        <section className="cartao mt-8 p-6">
          <h2 className="mb-4 text-lg font-extrabold uppercase">Veredito</h2>
          <AnaliseIA key={slugs} rotulo="Pedir veredito à IA" rota="/ia/comparar" corpo={{ slugs: fichas.map((f) => f.slug) }} disponivel />
        </section>
      )}
    </div>
  );
}
