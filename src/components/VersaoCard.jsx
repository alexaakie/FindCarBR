import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useComparador } from '../lib/comparador.jsx';
import { com, motorCurto, nomeCompleto } from '../lib/formato.js';
import { IconeCategoria, StatusDados } from './ui.jsx';

export function BotaoComparar({ versao, grande = false }) {
  const { tem, alternar, cheio } = useComparador();
  const ativo = tem(versao.slug);
  const desabilitado = !ativo && cheio;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); alternar({ slug: versao.slug, nome: nomeCompleto(versao) }); }}
      disabled={desabilitado}
      title={desabilitado ? 'Limite de versões no comparador' : ativo ? 'Remover do comparador' : 'Adicionar ao comparador'}
      className={`flex items-center gap-1.5 rounded-xl border text-xs font-bold transition disabled:opacity-30 ${grande ? 'px-4 py-2.5' : 'p-2'} ${
        ativo ? 'border-marca-500 bg-marca-500 text-white' : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'}`}
    >
      {ativo ? <Check size={14} /> : <Plus size={14} />}
      {grande && (ativo ? 'No comparador' : 'Comparar')}
    </button>
  );
}

export default function VersaoCard({ v }) {
  const consumo = v.consumo_urbano_gasolina ?? v.consumo_urbano_etanol;
  const dados = [
    ['Potência', com(v.potencia_max_cv, 'cv')],
    ['0–100', com(v.zero_a_cem_s, 's', 1)],
    v.combustivel === 'Elétrico'
      ? ['Autonomia', com(v.autonomia_km, 'km')]
      : ['Cidade', com(consumo, 'km/l', 1)],
  ];
  return (
    <Link
      to={`/versao/${v.slug}`}
      className="group flex flex-col rounded-3xl border border-white/5 bg-painel p-5 transition hover:-translate-y-0.5 hover:border-marca-500/30 hover:bg-painel-2"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-white/5 p-2.5 text-zinc-400 group-hover:text-marca-400">
            <IconeCategoria categoria={v.categoria} combustivel={v.combustivel} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{v.marca} · {v.ano_modelo}</p>
            <h3 className="text-lg font-extrabold leading-tight tracking-tight">{v.modelo}</h3>
          </div>
        </div>
        <BotaoComparar versao={v} />
      </div>
      <p className="mb-1 font-semibold text-marca-400">{v.versao}</p>
      <p className="mb-5 text-sm text-zinc-500">
        {[motorCurto(v), v.cambio, v.tracao !== 'Dianteira' ? v.tracao : null].filter(Boolean).join(' · ')}
      </p>
      <div className="mt-auto grid grid-cols-3 gap-2">
        {dados.map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-2xl bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{rotulo}</p>
            <p className="text-sm font-bold">{valor}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-600">
        <span>{v.categoria}</span>
        <StatusDados status={v.status_dados} compacto />
      </div>
    </Link>
  );
}
