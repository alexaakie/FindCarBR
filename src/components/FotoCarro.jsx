import { useState } from 'react';

// Silhuetas laterais genéricas (viewBox 240×100) usadas quando o modelo não tem foto
const CARROCERIAS = {
  Hatch: 'M20 72 L26 54 Q32 45 48 43 L80 41 L106 24 Q112 20 124 20 L168 20 Q180 20 188 30 L204 46 Q222 48 226 58 L228 72 Z',
  Sedan: 'M12 72 L18 57 Q24 49 42 47 L76 45 L102 27 Q108 23 118 23 L158 23 Q168 23 176 31 L192 44 L220 48 Q230 50 230 60 L230 72 Z',
  SUV: 'M16 72 L18 50 Q20 41 34 39 L68 37 L88 17 Q92 13 100 13 L188 13 Q197 13 201 21 L212 39 Q226 41 228 52 L228 72 Z',
  Picape: 'M10 72 L12 52 Q14 44 28 42 L62 40 L80 20 Q84 16 92 16 L134 16 Q141 16 143 23 L145 42 L226 42 Q231 42 231 48 L231 72 Z',
  Esportivo: 'M10 72 L14 60 Q20 52 40 50 L84 46 L118 30 Q126 27 138 27 L170 27 Q182 27 192 36 L206 47 Q226 50 230 60 L230 72 Z',
  Minivan: 'M16 72 L18 46 Q20 34 34 30 L62 20 Q70 14 84 14 L196 14 Q206 14 210 24 L218 44 Q228 46 228 56 L228 72 Z',
};
const FORMA = { Cupê: 'Esportivo', Conversível: 'Esportivo', Utilitário: 'Minivan', Perua: 'Sedan' };

export function Silhueta({ categoria, className = '' }) {
  const d = CARROCERIAS[categoria] ?? CARROCERIAS[FORMA[categoria]] ?? CARROCERIAS.Hatch;
  const longo = categoria === 'Sedan' || categoria === 'Picape' || categoria === 'Esportivo';
  const [r1, r2] = longo ? [60, 192] : [62, 188];
  return (
    <svg viewBox="0 0 240 100" className={className} aria-hidden="true">
      <path d={d} fill="currentColor" />
      {[r1, r2].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="72" r="17" fill="var(--color-painel-2)" />
          <circle cx={cx} cy="72" r="13" fill="currentColor" />
          <circle cx={cx} cy="72" r="5" fill="var(--color-painel-2)" />
        </g>
      ))}
      <rect x="6" y="88" width="228" height="2" rx="1" fill="currentColor" opacity="0.25" />
    </svg>
  );
}

// Foto do modelo (Wikimedia Commons) com crédito; cai para a silhueta se não houver ou falhar
export default function FotoCarro({ foto, url, categoria, alt, credito = false, className = '', proporcao = 'aspect-[16/10]' }) {
  const src = foto?.url ?? url;
  const [falhou, setFalhou] = useState(false);
  const mostrarFoto = src && !falhou;
  return (
    <figure className={`relative overflow-hidden bg-gradient-to-b from-painel-2 to-[#e9ecf1] ${proporcao} ${className}`}>
      {mostrarFoto ? (
        <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFalhou(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-[10%]">
          <Silhueta categoria={categoria} className="w-full max-w-[320px] text-[#c5ccd6]" />
        </div>
      )}
      {mostrarFoto && credito && foto?.autor && (
        <figcaption className="absolute bottom-0 right-0 max-w-full truncate rounded-tl-md bg-black/55 px-2 py-0.5 text-[10px] text-white/90">
          Foto: <a href={foto.pagina} target="_blank" rel="noreferrer" className="underline">{foto.autor}</a> · {foto.licenca}
        </figcaption>
      )}
    </figure>
  );
}
