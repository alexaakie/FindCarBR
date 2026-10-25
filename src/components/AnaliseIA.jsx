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
    return <p className="text-sm text-zinc-500">A análise por IA está desativada. Defina <code className="text-zinc-300">GEMINI_API_KEY</code> no arquivo <code className="text-zinc-300">.env</code> do servidor para ativar.</p>;
  }
  return (
    <div>
      {!estado.texto && (
        <button
          onClick={pedir}
          disabled={estado.carregando}
          className="flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-50"
        >
          {estado.carregando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {estado.carregando ? 'Analisando…' : rotulo}
        </button>
      )}
      {estado.erro && <p className="mt-3 text-sm text-red-400" role="alert">{estado.erro}</p>}
      {estado.texto && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
          <p className="whitespace-pre-line leading-relaxed text-zinc-300">{estado.texto}</p>
          <p className="mt-3 text-[11px] text-zinc-600">Gerado por IA a partir da ficha técnica — pode conter imprecisões.</p>
        </div>
      )}
    </div>
  );
}
