import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { apiPost } from '../lib/api.js';

// Botão + resultado da análise por IA. `pedido` = { rota, corpo }.
// O componente pai deve usar `key` para reiniciar quando o carro muda.
export default function AnaliseIA({ rotulo, rota, corpo, disponivel }) {
  const [estado, setEstado] = useState({ carregando: false, texto: '', erro: '' });

  const pedir = async () => {
    setEstado({ carregando: true, texto: '', erro: '' });
    try {
      const { texto } = await apiPost(rota, corpo);
      setEstado({ carregando: false, texto, erro: '' });
    } catch (e) {
      setEstado({ carregando: false, texto: '', erro: e.message });
    }
  };

  if (disponivel === false) {
    return <p className="text-sm text-tinta-2">A análise por IA está desativada. Defina <code className="text-tinta">GEMINI_API_KEY</code> no arquivo <code className="text-tinta">.env</code> do servidor para ativar.</p>;
  }
  return (
    <div>
      {!estado.texto && (
        <button
          onClick={pedir}
          disabled={estado.carregando}
          className="flex items-center gap-2 rounded-2xl border border-violet-300 bg-violet-50 px-5 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-100 disabled:opacity-50"
        >
          {estado.carregando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {estado.carregando ? 'Analisando…' : rotulo}
        </button>
      )}
      {estado.erro && <p className="mt-3 text-sm text-red-600" role="alert">{estado.erro}</p>}
      {estado.texto && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
          <p className="whitespace-pre-line leading-relaxed text-tinta">{estado.texto}</p>
          <p className="mt-3 text-[11px] text-tinta-3">Gerado por IA a partir da ficha técnica — pode conter imprecisões.</p>
        </div>
      )}
    </div>
  );
}
