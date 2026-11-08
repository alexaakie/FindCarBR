import { Link, useParams } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useApi } from '../lib/api.js';
import { anoFipe, cambioTexto, com, num, potencia, reais, torque } from '../lib/formato.js';
import VersaoCard, { BotaoComparar } from '../components/VersaoCard.jsx';
import FotoCarro from '../components/FotoCarro.jsx';
import Custos from '../components/Custos.jsx';
import AnaliseIA from '../components/AnaliseIA.jsx';
import { Carregando, Erro, Migalhas, Secao, StatusDados, TabelaFicha } from '../components/ui.jsx';

function Numero({ rotulo, valor, unidade }) {
  return (
    <div className="rounded-lg border border-borda bg-painel-2 px-3 py-2.5">
      <dt className="text-[11px] font-medium text-tinta-3">{rotulo}</dt>
      <dd className={`font-titulo text-xl font-black ${valor == null ? 'text-tinta-3' : ''}`}>
        {valor ?? '—'}{valor != null && unidade && <span className="ml-1 font-sans text-xs font-semibold text-tinta-2">{unidade}</span>}
      </dd>
    </div>
  );
}

const ANCORAS = [['ficha', 'Ficha técnica'], ['fontes', 'Fontes'], ['custos', 'Custos'], ['fipe', 'Preços FIPE'], ['versoes', 'Outras versões'], ['concorrentes', 'Concorrentes']];

// Mesma ordem dos blocos da ficha técnica na página
const NOME_SECAO = { motor: 'Motor', eletrico: 'Bateria', transmissao: 'Transmissão', desempenho: 'Desempenho', consumo: 'Consumo', dimensoes: 'Dimensões', geral: 'Carroceria', chassi: 'Chassi' };
const ORDEM_SECOES = Object.keys(NOME_SECAO);
const NOME_TIPO = { fabricante: 'Fabricante', inmetro: 'Inmetro', 'latin-ncap': 'Latin NCAP', imprensa: 'Imprensa', outro: 'Outra fonte' };

function Fontes({ fontes }) {
  return (
    <ul className="cartao divide-y divide-borda">
      {fontes.map((fo) => (
        <li key={fo.chave} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="font-semibold">
              {fo.url ? <a href={fo.url} target="_blank" rel="noreferrer" className="hover:text-marca-600 hover:underline">{fo.titulo}</a> : fo.titulo}
            </p>
            <p className="text-xs text-tinta-3">{NOME_TIPO[fo.tipo] ?? fo.tipo}{fo.data_referencia ? ` · ${fo.data_referencia}` : ''}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {[...fo.secoes].sort((a, b) => ORDEM_SECOES.indexOf(a) - ORDEM_SECOES.indexOf(b)).map((s) => <span key={s} className="rounded bg-painel-2 px-1.5 py-0.5 text-[11px] font-semibold text-tinta-2 ring-1 ring-borda">{NOME_SECAO[s] ?? s}</span>)}
          </div>
        </li>
      ))}
    </ul>
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
  const picape = f.categoria === 'Picape';
  const fipeAtual = f.fipe.find((p) => p.ano_modelo === f.ano_modelo) ?? f.fipe.find((p) => p.ano_modelo === 32000);
  const nome = `${f.marca} ${f.modelo} ${f.versao} ${f.ano_modelo}`;

  return (
    <>
      <div className="border-b border-borda bg-painel">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Migalhas itens={[['Marcas', '/marcas'], [f.marca, `/marca/${f.marca_slug}`], [f.modelo, `/marca/${f.marca_slug}/${f.modelo_slug}`], [`${f.versao} ${f.ano_modelo}`]]} />
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
            <FotoCarro foto={f.foto} categoria={f.categoria} alt={`${f.marca} ${f.modelo}`} credito className="rounded-xl" />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="rotulo">{f.marca} · {f.categoria} · {f.geracao.nome}</p>
                <StatusDados status={f.status_dados} />
              </div>
              <h1 className="mt-1 text-4xl font-black leading-none sm:text-5xl">{f.modelo}</h1>
              <p className="mt-1 text-xl font-bold text-marca-700">{f.versao} <span className="font-semibold text-tinta-2">· {f.ano_modelo}</span></p>
              <p className="mt-2 text-sm text-tinta-2">
                {[m.codigo, m.combustivel, cambioTexto(t), t.tracao && `tração ${t.tracao.toLowerCase()}`].filter((x) => x && x !== '—').join(' · ')}
              </p>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-noite p-4 text-white">
                <div>
                  <p className="text-xs text-white/60">Preço médio FIPE {fipeAtual ? `(${anoFipe(fipeAtual.ano_modelo)})` : ''}</p>
                  <p className="font-titulo text-3xl font-black">{fipeAtual ? reais(fipeAtual.valor) : '—'}</p>
                  <p className="text-xs text-white/50">
                    {fipeAtual ? `${fipeAtual.referencia} · código ${f.fipe_codigo}${f.fipe_auto ? ' (vínculo automático)' : ''}` : 'Versão ainda não ligada à Tabela FIPE'}
                  </p>
                </div>
                <BotaoComparar versao={f} grande />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Numero rotulo="Potência máxima" valor={num(m.potencia_max_cv)} unidade="cv" />
                <Numero rotulo="Torque máximo" valor={num(m.torque_kgfm_etanol ?? m.torque_kgfm, 1)} unidade="kgfm" />
                <Numero rotulo="0 a 100 km/h" valor={num(d.zero_a_cem_s, 1)} unidade="s" />
                <Numero rotulo="Velocidade máxima" valor={num(d.vel_max_kmh)} unidade="km/h" />
                {el ? <Numero rotulo="Autonomia" valor={num(el.autonomia_km)} unidade="km" />
                  : <Numero rotulo="Consumo cidade" valor={num(c.urbano_gasolina ?? c.urbano_etanol, 1)} unidade="km/l" />}
                <Numero rotulo={picape ? 'Caçamba' : 'Porta-malas'} valor={num(dim.porta_malas_l)} unidade="L" />
              </dl>
            </div>
          </div>
        </div>
        <nav className="border-t border-borda" aria-label="Seções da página">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
            {ANCORAS.filter(([id]) => (id !== 'versoes' || f.outras_versoes.length) && (id !== 'concorrentes' || f.similares.length) && (id !== 'fontes' || f.fontes?.length)).map(([id, r]) => (
              <a key={id} href={`#${id}`} className="whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13px] font-semibold text-tinta-2 hover:border-marca-500 hover:text-tinta">{r}</a>
            ))}
          </div>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 pt-8 sm:px-6">
        {f.status_dados !== 'verificado' && (
          <p className="flex items-start gap-2 rounded-lg border border-[#f3d48a] bg-aviso-50 px-4 py-3 text-sm text-[#6b4600]">
            <Info size={16} className="mt-0.5 shrink-0" />
            Ficha preliminar, ainda não conferida com o manual do fabricante ou o Inmetro{f.fontes?.length ? '' : ', e sem fonte registrada'}. Campos com “—” ainda não têm dado confirmado.
          </p>
        )}

        <Secao id="ficha" titulo="Ficha técnica" subtitulo={nome}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TabelaFicha titulo="Motor" linhas={[
              ['Código / família', com(m.codigo)],
              ['Combustível', com(m.combustivel)],
              ['Cilindrada', com(m.cilindrada_cc, 'cm³')],
              ['Cilindros', com(m.cilindros)],
              ['Válvulas', com(m.valvulas)],
              ['Aspiração', com(m.aspiracao)],
              ['Injeção', com(m.injecao)],
              ['Potência', potencia(m)],
              ['Rotação da potência', com(m.potencia_rpm, 'rpm')],
              ['Torque', torque(m)],
              ['Rotação do torque', com(m.torque_rpm, 'rpm')],
            ]} />
            <div className="space-y-4">
              <TabelaFicha titulo="Transmissão" linhas={[
                ['Câmbio', com(t.cambio)],
                ['Marchas', com(t.marchas)],
                ['Tração', com(t.tracao)],
              ]} />
              <TabelaFicha titulo="Desempenho" linhas={[
                ['0 a 100 km/h', com(d.zero_a_cem_s, 's', 1)],
                ['Velocidade máxima', com(d.vel_max_kmh, 'km/h')],
                ['Peso/potência', com(d.peso_potencia, 'kg/cv', 2)],
                ['Peso/torque', dim.peso_kg && (m.torque_kgfm_etanol ?? m.torque_kgfm) ? `${num(dim.peso_kg / (m.torque_kgfm_etanol ?? m.torque_kgfm), 1)} kg/kgfm` : '—'],
              ]} />
              {el && (
                <TabelaFicha titulo="Bateria e recarga" linhas={[
                  ['Capacidade', com(el.bateria_kwh, 'kWh', 1)],
                  ['Autonomia', com(el.autonomia_km, 'km')],
                  ['Recarga rápida (DC)', com(el.recarga_dc_kw, 'kW')],
                ]} />
              )}
            </div>
            <TabelaFicha titulo="Consumo (Inmetro)" linhas={[
              ['Cidade — gasolina', com(c.urbano_gasolina, 'km/l', 1)],
              ['Estrada — gasolina', com(c.estrada_gasolina, 'km/l', 1)],
              flex && ['Cidade — etanol', com(c.urbano_etanol, 'km/l', 1)],
              flex && ['Estrada — etanol', com(c.estrada_etanol, 'km/l', 1)],
              ['Tanque', com(dim.tanque_l, 'L')],
              ['Autonomia na estrada', dim.tanque_l && c.estrada_gasolina ? `${num(dim.tanque_l * c.estrada_gasolina)} km` : '—'],
            ]} />
            <TabelaFicha titulo="Dimensões" linhas={[
              ['Comprimento', com(dim.comprimento_mm, 'mm')],
              ['Largura', com(dim.largura_mm, 'mm')],
              ['Altura', com(dim.altura_mm, 'mm')],
              ['Entre-eixos', com(dim.entre_eixos_mm, 'mm')],
              ['Peso em ordem de marcha', com(dim.peso_kg, 'kg')],
            ]} />
            <TabelaFicha titulo="Capacidades e carroceria" linhas={[
              [picape ? 'Caçamba' : 'Porta-malas', com(dim.porta_malas_l, 'L')],
              ['Carroceria', com(f.carroceria)],
              ['Portas', com(f.portas)],
              ['Lugares', com(f.lugares)],
            ]} />
            <TabelaFicha titulo="Chassi" linhas={[
              ['Suspensão dianteira', com(ch.suspensao_dianteira)],
              ['Suspensão traseira', com(ch.suspensao_traseira)],
              ['Freios dianteiros', com(ch.freios_dianteiros)],
              ['Freios traseiros', com(ch.freios_traseiros)],
              ['Pneus', com(ch.pneus)],
            ]} />
          </div>
        </Secao>

        {f.fontes?.length > 0 && (
          <Secao id="fontes" titulo="Fontes" subtitulo="De onde vieram os dados de cada parte desta ficha">
            <Fontes fontes={f.fontes} />
          </Secao>
        )}

        <Secao id="custos" titulo="Quanto custa rodar" subtitulo="Combustível por km e IPVA estimado. Ajuste os valores à sua realidade.">
          <Custos ficha={f} />
        </Secao>

        <Secao id="fipe" titulo="Preços FIPE" subtitulo={f.fipe_codigo ? `Código FIPE ${f.fipe_codigo}` : undefined}>
          {f.fipe.length ? (
            <div className="cartao overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead className="border-b border-borda bg-painel-2 text-left text-[11px] uppercase tracking-wider text-tinta-3">
                  <tr><th className="px-4 py-2.5">Ano-modelo</th><th className="px-4 py-2.5">Combustível</th><th className="px-4 py-2.5">Referência</th><th className="px-4 py-2.5 text-right">Preço médio</th></tr>
                </thead>
                <tbody>
                  {f.fipe.map((p) => (
                    <tr key={`${p.ano_modelo}-${p.combustivel}`} className={`border-b border-borda last:border-0 ${p === fipeAtual ? 'bg-marca-50' : ''}`}>
                      <td className="px-4 py-2.5 font-semibold">{anoFipe(p.ano_modelo)}</td>
                      <td className="px-4 py-2.5 text-tinta-2">{p.combustivel}</td>
                      <td className="px-4 py-2.5 text-tinta-2">{p.referencia}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{reais(p.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cartao p-4 text-sm text-tinta-2">
              Esta versão ainda não está ligada à Tabela FIPE. Rode <code className="rounded bg-painel-2 px-1">npm run db:fipe -- --marcas={f.marca_slug}</code> para importar
              os preços; o vínculo é feito automaticamente. Para fixar o código à mão, adicione <code className="rounded bg-painel-2 px-1">"fipe_codigo"</code> na versão, no JSON da marca.
            </div>
          )}
        </Secao>

        {f.outras_versoes.length > 0 && (
          <Secao id="versoes" titulo={`Outras versões do ${f.modelo}`}>
            <div className="cartao overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b border-borda bg-painel-2 text-left text-[11px] uppercase tracking-wider text-tinta-3">
                  <tr><th className="px-4 py-2.5">Versão</th><th className="px-4 py-2.5">Ano</th><th className="px-4 py-2.5">Câmbio</th><th className="px-4 py-2.5 text-right">Potência</th><th className="px-4 py-2.5 text-right">FIPE</th></tr>
                </thead>
                <tbody>
                  {f.outras_versoes.map((o) => (
                    <tr key={o.slug} className="border-b border-borda last:border-0 hover:bg-marca-50/50">
                      <td className="px-4 py-2.5"><Link to={`/versao/${o.slug}`} className="font-semibold hover:text-marca-600">{o.versao}</Link></td>
                      <td className="px-4 py-2.5 text-tinta-2">{o.ano_modelo}</td>
                      <td className="px-4 py-2.5 text-tinta-2">{o.cambio ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{com(o.potencia_max_cv, 'cv')}</td>
                      <td className="px-4 py-2.5 text-right">{o.preco ? reais(o.preco) : <span className="text-tinta-3">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        )}

        {f.similares.length > 0 && (
          <Secao id="concorrentes" titulo="Concorrentes diretos" subtitulo="Mesma categoria, mesma época (±2 anos) e potência parecida (±15%)">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{f.similares.map((v) => <VersaoCard key={v.slug} v={v} />)}</div>
          </Secao>
        )}

        {est?.ia && (
          <Secao titulo="Análise de especialista">
            <AnaliseIA key={f.slug} rotulo="Gerar perfil desta versão" rota="/ia/analise" corpo={{ slug: f.slug }} disponivel />
          </Secao>
        )}
      </div>
    </>
  );
}
