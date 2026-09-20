'use client';

import { useRef, useState } from 'react';

const MAKS_BILDER = 3;
const MAKS_KANT = 1280;

/** Krymper bildet før det legges i køen, så det går raskt å sende over dårlig nett. */
function krymp(fil: File): Promise<string> {
  return new Promise((løs, avvis) => {
    const leser = new FileReader();
    leser.onerror = () => avvis(new Error('Fikk ikke lest bildet.'));
    leser.onload = () => {
      const bilde = new Image();
      bilde.onerror = () => avvis(new Error('Fikk ikke åpnet bildet.'));
      bilde.onload = () => {
        const skala = Math.min(1, MAKS_KANT / Math.max(bilde.width, bilde.height));
        const lerret = document.createElement('canvas');
        lerret.width = Math.round(bilde.width * skala);
        lerret.height = Math.round(bilde.height * skala);
        const ctx = lerret.getContext('2d');
        if (!ctx) return avvis(new Error('Nettleseren klarte ikke å behandle bildet.'));
        ctx.drawImage(bilde, 0, 0, lerret.width, lerret.height);
        løs(lerret.toDataURL('image/jpeg', 0.7));
      };
      bilde.src = String(leser.result);
    };
    leser.readAsDataURL(fil);
  });
}

export function Kamera({
  bilder,
  onEndre,
}: {
  bilder: string[];
  onEndre: (bilder: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [feil, setFeil] = useState<string | null>(null);

  return (
    <div className="stabel">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const fil = e.target.files?.[0];
          e.target.value = '';
          if (!fil) return;
          setFeil(null);
          try {
            onEndre([...bilder, await krymp(fil)].slice(0, MAKS_BILDER));
          } catch (f) {
            setFeil(f instanceof Error ? f.message : 'Fikk ikke lagt til bildet.');
          }
        }}
      />

      {bilder.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {bilder.map((b, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b}
                alt={`Bilde ${i + 1}`}
                style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 8 }}
              />
              <button
                type="button"
                className="knapp knapp-liten"
                style={{ position: 'absolute', top: 2, right: 2, minHeight: 28, padding: '2px 7px' }}
                onClick={() => onEndre(bilder.filter((_, j) => j !== i))}
                aria-label={`Fjern bilde ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="knapp knapp-bred"
        onClick={() => input.current?.click()}
        disabled={bilder.length >= MAKS_BILDER}
      >
        {bilder.length === 0 ? 'Ta bilde' : `Ta ett til (${bilder.length}/${MAKS_BILDER})`}
      </button>
      {feil && <p className="melding feil">{feil}</p>}
    </div>
  );
}
