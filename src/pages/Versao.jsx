import { Link, useParams } from 'react-router-dom';
import { BatteryCharging, Cog, Fuel, Gauge, Info, Ruler, Sparkles, Tag, Wrench } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { cambioTexto, com, num, potencia, reais, torque } from '../lib/formato.js';
import { BotaoComparar } from '../components/VersaoCard.jsx';
import VersaoCard from '../components/VersaoCard.jsx';
import AnaliseIA from '../components/AnaliseIA.jsx';
import { Carregando, Erro, IconeCategoria, Migalhas, Secao, StatusDados } from '../components/ui.jsx';

function Tabela({ linhas }) {
  const visiveis = linhas.filter(([, v]) => v !== undefined);
  return (
    <dl className="divide-y divide-white/5">
      {visiveis.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
          <dt className="text-zinc-500">{rotulo}</dt>
          <dd className={`text-right font-semibold ${valor === '—' ? 'text-zinc-700' : ''}`}>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Destaque({ rotulo, valor, unidade }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-painel px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{rotulo}</p>
      <p className="text-2xl font-black">{valor ?? '—'}{valor != null && unidade && <span className="ml-1 text-xs font-bold text-zinc-500">{unidade}</span>}</p>
    </div>
  );
}

export default function Versao() {
  const { slug } = useParams();
  const { dados: f, erro, carregando } = useApi(`/versoes/${slug}`);
  const { dados: est } = useApi('/estatisticas');
  if (erro) return <Erro erro={erro} />;
  if (carregando || !f) return <Carregando />;

  const { motor: m, transmissao: t, desempenho: d, consumo: c, dimensoes: dim, chassi: ch, eletrico: el } = f;
  const flex = m.combustivel === 'Flex' || m.combustivel === 'Híbrido Flex';
  const temConsumo = Object.values(c).some((x) => x != null);
  const ultimaFipe = f.fipe[0];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <Migalhas itens={[['Marcas', '/marcas'], [f.marca, `/marca/${f.marca_slug}`], [f.modelo, `/marca/${f.marca_slug}/${f.modelo_slug}`], [`${f.versao} ${f.ano_modelo}`]]} />

      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="hidden rounded-3xl bg-gradient-to-br from-marca-500/20 to-transparent p-4 text-marca-400 sm:block">
            <IconeCategoria categoria={f.categoria} combustivel={m.combustivel} size={36} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-marca-500">{f.marca} · {f.categoria}</p>
            <h1 className="text-4xl font-black leading-none tracking-tight sm:text-5xl">{f.modelo}</h1>
            <p className="mt-2 text-xl font-semibold text-zinc-400">{f.versao} <span className="text-zinc-600">· {f.ano_modelo}</span></p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <StatusDados status={f.status_dados} />
              <span>{f.geracao.nome} ({f.geracao.ano_inicio}{f.geracao.ano_fim ? `–${f.geracao.ano_fim}` : '–atual'})</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <BotaoComparar versao={{ ...f, slug: f.slug }} grande />
          {ultimaFipe && (
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">FIPE {ultimaFipe.ano_modelo === 32000 ? '0 km' : ultimaFipe.ano_modelo}</p>
              <p className="text-2xl font-black text-emerald-400">{reais(ultimaFipe.valor)}</p>
              <p className="text-[11px] text-zinc-600">{ultimaFipe.referencia}</p>
            </div>
          )}
        </div>
      </header>

      {f.status_dados !== 'verificado' && (
        <p className="mt-6 flex items-start gap-2 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-sm text-amber-200/80">
          <Info size={16} className="mt-0.5 shrink-0" />
          Ficha preliminar, ainda não conferida com o manual do fabricante ou o Inmetro. Campos com “—” não têm dado confirmado.
        </p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Destaque rotulo="Potência máx." valor={num(m.potencia_max_cv)} unidade="cv" />
        <Destaque rotulo="Torque" valor={num(m.torque_kgfm_etanol ?? m.torque_kgfm, 1)} unidade="kgfm" />
        <Destaque rotulo="0 a 100 km/h" valor={num(d.zero_a_cem_s, 1)} unidade="s" />
        {el ? <Destaque rotulo="Autonomia" valor={num(el.autonomia_km)} unidade="km" />
          : <Destaque rotulo="Consumo cidade" valor={num(c.urbano_gasolina ?? c.urbano_etanol, 1)} unidade="km/l" />}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Secao titulo="Motor" icone={Cog}>
          <Tabela linhas={[
            ['Código / família', com(m.codigo)],
            ['Combustível', com(m.combustivel)],
            ['Cilindrada', com(m.cilindrada_cc, 'cm³')],
            ['Cilindros / válvulas', m.cilindros ? `${m.cilindros} cil. · ${m.valvulas ?? '—'} válv.` : '—'],
            ['Aspiração', com(m.aspiracao)],
            ['Injeção', com(m.injecao)],
            ['Potência', potencia(m)],
            ['Rotação de potência', com(m.potencia_rpm, 'rpm')],
            ['Torque', torque(m)],
            ['Rotação de torque', com(m.torque_rpm, 'rpm')],
          ]} />
        </Secao>

        <div className="space-y-6">
          <Secao titulo="Transmissão" icone={Wrench}>
            <Tabela linhas={[['Câmbio', cambioTexto(t)], ['Tração', com(t.tracao)]]} />
          </Secao>
          <Secao titulo="Desempenho" icone={Gauge}>
            <Tabela linhas={[
              ['0 a 100 km/h', com(d.zero_a_cem_s, 's', 1)],
              ['Velocidade máxima', com(d.vel_max_kmh, 'km/h')],
              ['Relação peso/potência', com(d.peso_potencia, 'kg/cv', 2)],
            ]} />
          </Secao>
          {el && (
            <Secao titulo="Bateria e recarga" icone={BatteryCharging}>
              <Tabela linhas={[
                ['Capacidade da bateria', com(el.bateria_kwh, 'kWh', 1)],
                ['Autonomia', com(el.autonomia_km, 'km')],
                ['Recarga rápida (DC)', com(el.recarga_dc_kw, 'kW')],
              ]} />
            </Secao>
          )}
        </div>

        {(temConsumo || !el) && (
          <Secao titulo="Consumo (Inmetro)" icone={Fuel}>
            <Tabela linhas={[
              ['Cidade — gasolina', com(c.urbano_gasolina, 'km/l', 1)],
              ['Estrada — gasolina', com(c.estrada_gasolina, 'km/l', 1)],
              ...(flex ? [['Cidade — etanol', com(c.urbano_etanol, 'km/l', 1)], ['Estrada — etanol', com(c.estrada_etanol, 'km/l', 1)]] : []),
              ['Autonomia estimada (estrada)', dim.tanque_l && c.estrada_gasolina ? `${num(dim.tanque_l * c.estrada_gasolina)} km` : '—'],
            ]} />
          </Secao>
        )}

        <Secao titulo="Dimensões e capacidades" icone={Ruler}>
          <Tabela linhas={[
            ['Comprimento', com(dim.comprimento_mm, 'mm')],
            ['Largura', com(dim.largura_mm, 'mm')],
            ['Altura', com(dim.altura_mm, 'mm')],
            ['Entre-eixos', com(dim.entre_eixos_mm, 'mm')],
            [f.categoria === 'Picape' ? 'Caçamba' : 'Porta-malas', com(dim.porta_malas_l, 'litros')],
            ['Tanque', com(dim.tanque_l, 'litros')],
            ['Peso em ordem de marcha', com(dim.peso_kg, 'kg')],
            ['Portas / lugares', f.portas ? `${f.portas} portas · ${f.lugares ?? '—'} lugares` : '—'],
          ]} />
        </Secao>

        <Secao titulo="Chassi" icone={Tag}>
          <Tabela linhas={[
            ['Suspensão dianteira', com(ch.suspensao_dianteira)],
            ['Suspensão traseira', com(ch.suspensao_traseira)],
            ['Freios dianteiros', com(ch.freios_dianteiros)],
            ['Freios traseiros', com(ch.freios_traseiros)],
            ['Pneus', com(ch.pneus)],
          ]} />
        </Secao>

        {/* A seção de IA só aparece quando o servidor tem GEMINI_API_KEY configurada */}
        {est?.ia && (
          <Secao titulo="Análise de especialista" icone={Sparkles}>
            <AnaliseIA key={f.slug} rotulo="Gerar perfil desta versão" rota="/ia/analise" corpo={{ slug: f.slug }} disponivel />
          </Secao>
        )}
      </div>

      {f.fipe.length > 1 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold">Preços FIPE por ano</h2>
          <div className="flex flex-wrap gap-2">
            {f.fipe.map((p) => (
              <div key={`${p.ano_modelo}-${p.combustivel}`} className="rounded-2xl border border-white/5 bg-painel px-4 py-2 text-sm">
                <span className="text-zinc-500">{p.ano_modelo === 32000 ? '0 km' : p.ano_modelo}</span> <span className="font-bold">{reais(p.valor)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {f.outras_versoes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-extrabold">Outras versões do {f.modelo}</h2>
          <div className="flex flex-wrap gap-2">
            {f.outras_versoes.map((o) => (
              <Link key={o.slug} to={`/versao/${o.slug}`} className="rounded-xl border border-white/10 px-3 py-2 text-sm transition hover:border-marca-500/40">
                <span className="font-semibold">{o.versao}</span> <span className="text-zinc-500">{o.ano_modelo}{o.potencia_max_cv ? ` · ${num(o.potencia_max_cv)} cv` : ''}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {f.similares.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-extrabold">Concorrentes diretos</h2>
          <p className="-mt-3 mb-4 text-sm text-zinc-500">Mesma categoria e potência parecida (±15%).</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.similares.map((v) => <VersaoCard key={v.slug} v={v} />)}</div>
        </section>
      )}
    </div>
  );
}
