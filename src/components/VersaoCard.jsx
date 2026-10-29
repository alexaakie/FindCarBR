import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useComparador } from '../lib/comparador.jsx';
import { com, motorCurto, nomeCompleto, num, reaisCurto } from '../lib/formato.js';
import FotoCarro from './FotoCarro.jsx';
import { StatusDados } from './ui.jsx';

export function BotaoComparar({ versao, grande = false }) {
  const { tem, alternar, cheio } = useComparador();
  const ativo = tem(versao.slug);
  const desabilitado = !ativo && cheio;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); alternar({ slug: versao.slug, nome: nomeCompleto(versao) }); }}
      disabled={desabilitado}
      aria-pressed={ativo}
      title={desabilitado ? 'O comparador aceita até 4 versões' : ativo ? 'Remover do comparador' : 'Adicionar ao comparador'}
      className={`inline-flex items-center gap-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-40 ${grande ? 'px-4 py-2.5 text-sm' : 'px-2.5 py-1.5'} ${
        ativo ? 'border-marca-600 bg-marca-600 text-white' : 'border-borda bg-painel text-tinta-2 hover:border-tinta hover:text-tinta'}`}
    >
      {ativo ? <Check size={14} /> : <Plus size={14} />}
      {ativo ? 'Comparando' : 'Comparar'}
    </button>
  );
}

const consumoCidade = (v) => v.consumo_urbano_gasolina ?? v.consumo_urbano_etanol;

export default function VersaoCard({ v }) {
  const eletrico = v.combustivel === 'Elétrico';
  const dados = [
    ['Potência', com(v.potencia_max_cv, 'cv')],
    ['0–100 km/h', com(v.zero_a_cem_s, 's', 1)],
    eletrico ? ['Autonomia', com(v.autonomia_km, 'km')] : ['Cidade', com(consumoCidade(v), 'km/l', 1)],
    ['Porta-malas', com(v.porta_malas_l, 'L')],
  ];
  return (
    <article className="cartao group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <Link to={`/versao/${v.slug}`} className="block">
        <FotoCarro url={v.foto_url} categoria={v.categoria} alt={`${v.marca} ${v.modelo}`} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/versao/${v.slug}`} className="min-w-0">
            <p className="rotulo">{v.marca} · {v.categoria}</p>
            <h3 className="truncate text-lg font-extrabold leading-tight group-hover:text-marca-600">{v.modelo} <span className="font-semibold text-tinta-2">{v.ano_modelo}</span></h3>
            <p className="truncate text-sm font-semibold text-marca-700">{v.versao}</p>
          </Link>
          <StatusDados status={v.status_dados} compacto />
        </div>
        <p className="mt-1 truncate text-[13px] text-tinta-2">
          {[motorCurto(v), v.cambio, v.tracao && v.tracao !== 'Dianteira' ? `tração ${v.tracao.toLowerCase()}` : null].filter(Boolean).join(' · ')}
        </p>
        <dl className="mt-3 grid grid-cols-4 divide-x divide-borda rounded-lg border border-borda bg-painel-2 text-center">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo} className="px-1 py-2">
              <dt className="text-[10px] font-medium leading-tight text-tinta-3">{rotulo}</dt>
              <dd className={`text-[13px] font-bold ${valor === '—' ? 'text-tinta-3' : ''}`}>{valor}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div>
            <p className="text-[10px] font-medium text-tinta-3">Preço FIPE</p>
            <p className={`text-lg font-extrabold leading-none ${v.preco ? 'text-tinta' : 'text-tinta-3 text-sm font-semibold'}`}>{reaisCurto(v.preco) ?? 'sem preço'}</p>
          </div>
          <BotaoComparar versao={v} />
        </div>
      </div>
    </article>
  );
}

// Tabela densa de versões (catálogo em modo tabela, página do modelo)
export function TabelaVersoes({ versoes, mostrarModelo = true }) {
  const th = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-tinta-3 whitespace-nowrap';
  const td = 'px-3 py-2.5 whitespace-nowrap';
  return (
    <div className="cartao relative overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b border-borda bg-painel-2">
          <tr>
            <th className={th}>{mostrarModelo ? 'Modelo / versão' : 'Versão'}</th>
            <th className={th}>Ano</th>
            <th className={th}>Motor</th>
            <th className={`${th} text-right`}>Potência</th>
            <th className={`${th} text-right`}>Torque</th>
            <th className={th}>Câmbio</th>
            <th className={`${th} text-right`}>0–100</th>
            <th className={`${th} text-right`}>Cidade</th>
            <th className={`${th} text-right`}>Porta-malas</th>
            <th className={`${th} text-right`}>FIPE</th>
            <th className={th}><span className="sr-only">Comparar</span></th>
          </tr>
        </thead>
        <tbody>
          {versoes.map((v) => (
            <tr key={v.slug} className="border-b border-borda last:border-0 hover:bg-marca-50/50">
              <td className={`${td} max-w-[260px]`}>
                <Link to={`/versao/${v.slug}`} className="block truncate font-semibold hover:text-marca-600">
                  {mostrarModelo && <span className="text-tinta">{v.marca} {v.modelo} </span>}
                  <span className={mostrarModelo ? 'font-medium text-marca-700' : ''}>{v.versao}</span>
                </Link>
              </td>
              <td className={`${td} text-tinta-2`}>{v.ano_modelo}</td>
              <td className={`${td} text-tinta-2`}>{motorCurto(v) || '—'}</td>
              <td className={`${td} text-right font-semibold`}>{com(v.potencia_max_cv, 'cv')}</td>
              <td className={`${td} text-right text-tinta-2`}>{com(v.torque_kgfm_etanol ?? v.torque_kgfm, 'kgfm', 1)}</td>
              <td className={`${td} text-tinta-2`}>{v.cambio ?? '—'}{v.marchas && !['CVT', 'Redução única'].includes(v.cambio) ? ` ${v.marchas}m` : ''}</td>
              <td className={`${td} text-right text-tinta-2`}>{com(v.zero_a_cem_s, 's', 1)}</td>
              <td className={`${td} text-right text-tinta-2`}>{v.combustivel === 'Elétrico' ? com(v.autonomia_km, 'km') : com(consumoCidade(v), 'km/l', 1)}</td>
              <td className={`${td} text-right text-tinta-2`}>{com(v.porta_malas_l, 'L')}</td>
              <td className={`${td} text-right font-semibold`}>{v.preco ? `R$ ${num(v.preco)}` : <span className="font-normal text-tinta-3">—</span>}</td>
              <td className={`${td} text-right`}><BotaoComparar versao={v} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
