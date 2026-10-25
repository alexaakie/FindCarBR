import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Scale, Trophy, X } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { useComparador } from '../lib/comparador.jsx';
import { cambioTexto, com, nomeCompleto, potencia, reais, torque } from '../lib/formato.js';
import AnaliseIA from '../components/AnaliseIA.jsx';
import { Carregando, Erro, StatusDados, Vazio } from '../components/ui.jsx';

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
    ['FIPE (mais recente)', (f) => f.fipe[0]?.valor, (f) => reais(f.fipe[0]?.valor), 'min'],
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
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <h1 className="text-3xl font-black tracking-tight">Comparador</h1>
        <Vazio titulo="Nenhuma versão selecionada">
          Use o botão <b>+</b> nos cards do <Link to="/catalogo" className="text-marca-400 underline">catálogo</Link> para escolher até 4 versões.
        </Vazio>
      </div>
    );
  }
  if (erro) return <Erro erro={erro} />;
  if (carregando || !fichas) return <Carregando />;

  const colunas = `minmax(150px, 1fr) repeat(${fichas.length}, minmax(180px, 1fr))`;
  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight"><Scale className="text-marca-500" /> Comparador</h1>
      <p className="mt-1 text-sm text-zinc-500">O melhor valor de cada linha fica destacado. Copie o link para compartilhar este comparativo.</p>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-white/5 bg-painel">
        <div className="min-w-fit">
          <div className="sticky top-0 grid border-b border-white/5 bg-painel-2" style={{ gridTemplateColumns: colunas }}>
            <div />
            {fichas.map((f) => (
              <div key={f.slug} className="relative p-4">
                <button onClick={() => remover(f)} className="absolute right-2 top-2 rounded-lg p-1 text-zinc-600 hover:bg-white/10 hover:text-white" aria-label={`Remover ${nomeCompleto(f)}`}><X size={14} /></button>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{f.marca} · {f.ano_modelo}</p>
                <Link to={`/versao/${f.slug}`} className="block text-lg font-extrabold leading-tight hover:text-marca-400">{f.modelo}</Link>
                <p className="text-sm font-semibold text-marca-400">{f.versao}</p>
                <div className="mt-2"><StatusDados status={f.status_dados} compacto /></div>
              </div>
            ))}
          </div>
          {GRUPOS.map(([grupo, linhas]) => (
            <div key={grupo}>
              <div className="border-b border-white/5 bg-white/[0.02] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{grupo}</div>
              {linhas.map(([rotulo, extrair, formatar, criterio]) => {
                const melhor = melhorIndice(fichas, extrair, criterio);
                return (
                  <div key={rotulo} className="grid border-b border-white/5 text-sm last:border-0" style={{ gridTemplateColumns: colunas }}>
                    <div className="px-4 py-2.5 text-zinc-500">{rotulo}</div>
                    {fichas.map((f, i) => {
                      const txt = formatar(f);
                      return (
                        <div key={f.slug} className={`flex items-center gap-1.5 px-4 py-2.5 font-semibold ${i === melhor ? 'text-emerald-400' : txt === '—' ? 'text-zinc-700' : ''}`}>
                          {i === melhor && <Trophy size={12} />} {txt}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {fichas.length >= 2 && (
        <section className="mt-8 rounded-3xl border border-white/5 bg-painel p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-300">Veredito</h2>
          <AnaliseIA key={slugs} rotulo="Pedir veredito à IA" rota="/ia/comparar" corpo={{ slugs: fichas.map((f) => f.slug) }} disponivel={est?.ia} />
        </section>
      )}
    </div>
  );
}
