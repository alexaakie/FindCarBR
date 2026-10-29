import { RotateCcw } from 'lucide-react';
import { usePreferencias } from '../lib/preferencias.jsx';
import { custoPorKm, ipvaAnual, IPVA_UF, melhorCombustivel } from '../lib/custos.js';
import { num, reais } from '../lib/formato.js';

function CampoNumero({ rotulo, valor, aoMudar, passo = 0.01, prefixo, sufixo, id }) {
  return (
    <label htmlFor={id} className="block">
      <span className="rotulo">{rotulo}</span>
      <span className="mt-1 flex items-center rounded-lg border border-borda bg-painel focus-within:border-marca-500 focus-within:ring-2 focus-within:ring-marca-100">
        {prefixo && <span className="pl-3 text-sm text-tinta-3">{prefixo}</span>}
        <input id={id} type="number" inputMode="decimal" step={passo} min="0" value={valor}
          onChange={(e) => aoMudar(e.target.value === '' ? 0 : Number(e.target.value))}
          className="w-full bg-transparent px-2 py-2 text-sm font-semibold outline-none" />
        {sufixo && <span className="pr-3 text-sm text-tinta-3">{sufixo}</span>}
      </span>
    </label>
  );
}

function Resultado({ rotulo, valor, detalhe, destaque }) {
  return (
    <div className={`rounded-lg border p-3 ${destaque ? 'border-marca-500 bg-marca-50' : 'border-borda bg-painel-2'}`}>
      <p className="rotulo">{rotulo}</p>
      <p className="text-xl font-extrabold">{valor}</p>
      {detalhe && <p className="text-xs text-tinta-2">{detalhe}</p>}
    </div>
  );
}

// Calculadora de custo de uso: combustível por km/mês e IPVA estimado pela FIPE
export default function Custos({ ficha }) {
  const { pref, definir, restaurar } = usePreferencias();
  const opcoes = custoPorKm(ficha, pref);
  const melhor = melhorCombustivel(opcoes);
  const principal = opcoes.find((o) => o.combustivel === melhor) ?? opcoes[0];
  const pctIpva = pref.ipva_pct ?? IPVA_UF[pref.uf];
  const ipva = ipvaAnual(ficha.preco, pctIpva);
  const comb = ficha.motor?.combustivel;
  const mensal = principal ? principal.custoKm * pref.km_mes : null;

  return (
    <div className="cartao p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="rotulo">Estado (IPVA)</span>
          <select value={pref.uf} onChange={(e) => { definir('uf', e.target.value); definir('ipva_pct', undefined); }} className="campo mt-1">
            {Object.keys(IPVA_UF).map((uf) => <option key={uf} value={uf}>{uf} — {num(IPVA_UF[uf], 2)}%</option>)}
          </select>
        </label>
        <CampoNumero id="c-km" rotulo="Rodagem por mês" valor={pref.km_mes} passo={100} sufixo="km" aoMudar={(v) => definir('km_mes', v)} />
        <CampoNumero id="c-pct" rotulo="Uso na cidade" valor={pref.pct_cidade} passo={5} sufixo="%" aoMudar={(v) => definir('pct_cidade', Math.min(100, v))} />
        <CampoNumero id="c-ipva" rotulo="Alíquota do IPVA" valor={pctIpva} passo={0.1} sufixo="%" aoMudar={(v) => definir('ipva_pct', v)} />
        {comb === 'Elétrico'
          ? <CampoNumero id="c-kwh" rotulo="Preço do kWh" valor={pref.preco_kwh} prefixo="R$" aoMudar={(v) => definir('preco_kwh', v)} />
          : comb === 'Diesel'
            ? <CampoNumero id="c-die" rotulo="Diesel (litro)" valor={pref.preco_diesel} prefixo="R$" aoMudar={(v) => definir('preco_diesel', v)} />
            : (
              <>
                <CampoNumero id="c-gas" rotulo="Gasolina (litro)" valor={pref.preco_gasolina} prefixo="R$" aoMudar={(v) => definir('preco_gasolina', v)} />
                {comb?.includes('Flex') && <CampoNumero id="c-eta" rotulo="Etanol (litro)" valor={pref.preco_etanol} prefixo="R$" aoMudar={(v) => definir('preco_etanol', v)} />}
              </>
            )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {opcoes.length === 0 && (
          <div className="rounded-lg border border-dashed border-borda p-3 text-sm text-tinta-2 sm:col-span-2">
            Sem dados de consumo nesta ficha, então não dá para calcular o custo por km.
          </div>
        )}
        {opcoes.map((o) => (
          <Resultado key={o.combustivel} destaque={opcoes.length > 1 && o.combustivel === melhor}
            rotulo={`Custo por km — ${o.combustivel.toLowerCase()}`}
            valor={`R$ ${num(o.custoKm, 2)}`}
            detalhe={`${num(o.kmPorUnidade, 1)} km/${o.unidade} no uso misto${opcoes.length > 1 && o.combustivel === melhor ? ' · compensa mais' : ''}`} />
        ))}
        {mensal != null && (
          <Resultado rotulo={`${principal.combustivel} por mês`} valor={reais(mensal)} detalhe={`${num(pref.km_mes)} km · ${reais(mensal * 12)} por ano`} />
        )}
        <Resultado rotulo={`IPVA estimado (${pref.uf})`} valor={ipva ? reais(ipva) : '—'}
          detalhe={ipva ? `${num(pctIpva, 2)}% sobre a FIPE de ${reais(ficha.preco)}` : 'Precisa do preço FIPE (npm run db:fipe)'} />
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-2 text-xs text-tinta-3">
        <p className="max-w-2xl">
          Preços de combustível e alíquotas são valores de referência: ajuste aos do seu posto e confira o IPVA na Secretaria da Fazenda do seu estado
          (elétricos e híbridos têm isenção ou desconto em vários estados). Os valores ficam salvos neste navegador.
        </p>
        <button onClick={restaurar} className="flex items-center gap-1 font-semibold text-tinta-2 hover:text-tinta"><RotateCcw size={12} /> Restaurar padrões</button>
      </div>
    </div>
  );
}
