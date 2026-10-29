import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListaRanking } from '../components/Ranking.jsx';
import { RANKINGS } from '../lib/rankings.js';
import { Chip, Migalhas } from '../components/ui.jsx';

const FILTROS = [
  ['', 'Todas'], ['categoria=Hatch', 'Hatches'], ['categoria=Sedan', 'Sedãs'], ['categoria=SUV', 'SUVs'],
  ['categoria=Picape', 'Picapes'], ['combustivel=Elétrico', 'Elétricos'], ['pot_max=130', 'Até 130 cv'],
];

export default function Rankings() {
  const [filtro, setFiltro] = useState('');
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Migalhas itens={[['Rankings']]} />
      <h1 className="mt-2 text-3xl font-black">Rankings</h1>
      <p className="text-sm text-tinta-2">Os 10 primeiros de cada critério entre os modelos da linha atual. Versões sem o dado ficam de fora.</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {FILTROS.map(([qs, r]) => <Chip key={r} ativo={filtro === qs} onClick={() => setFiltro(qs)}>{r}</Chip>)}
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {RANKINGS.map((r) => (
          <section key={r.id} id={r.id} className="cartao scroll-mt-28 overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-tinta px-4 py-3">
              <h2 className="font-extrabold uppercase">{r.titulo}</h2>
              <Link to={`/catalogo?${r.qs}&apenas_atuais=1${filtro ? `&${filtro}` : ''}`} className="text-xs font-semibold text-marca-600 hover:underline">ver lista</Link>
            </div>
            <div className="px-3 py-1"><ListaRanking key={filtro} ranking={r} filtro={filtro} /></div>
          </section>
        ))}
      </div>
    </div>
  );
}
