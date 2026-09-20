'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SignaturStrok } from '@/lib/types';

/**
 * Signaturfelt. Signaturen lagres som strekpunkter, ikke som bilde – da kan den
 * tegnes både på skjermen og rett inn i PDF-en, og den tar nesten ingen plass
 * i køen når montøren er uten dekning.
 */
export function Signatur({
  verdi,
  onEndre,
}: {
  verdi: SignaturStrok | null;
  onEndre: (strok: SignaturStrok | null) => void;
}) {
  const lerret = useRef<HTMLCanvasElement>(null);
  const tegner = useRef(false);
  // Strekene holdes i en ref, slik at vi alltid melder fra om det som faktisk er
  // tegnet – også midt i en render. Tilstanden brukes bare til å tegne opp på nytt.
  const strokRef = useRef<SignaturStrok>(verdi ?? []);
  const [strok, setStrok] = useState<SignaturStrok>(strokRef.current);

  const tegnOpp = useCallback((data: SignaturStrok) => {
    const c = lerret.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const forhold = window.devicePixelRatio || 1;
    const bredde = c.clientWidth;
    const hoyde = c.clientHeight;
    if (c.width !== bredde * forhold || c.height !== hoyde * forhold) {
      c.width = bredde * forhold;
      c.height = hoyde * forhold;
    }

    ctx.setTransform(forhold, 0, 0, forhold, 0, 0);
    ctx.clearRect(0, 0, bredde, hoyde);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(c).color || '#000';

    for (const linje of data) {
      if (linje.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(linje[0][0], linje[0][1]);
      for (const [x, y] of linje.slice(1)) ctx.lineTo(x, y);
      if (linje.length === 1) ctx.lineTo(linje[0][0] + 0.6, linje[0][1]);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    tegnOpp(strok);
    const paEndring = () => tegnOpp(strokRef.current);
    window.addEventListener('resize', paEndring);
    return () => window.removeEventListener('resize', paEndring);
  }, [strok, tegnOpp]);

  const punkt = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const boks = e.currentTarget.getBoundingClientRect();
    return [
      Math.round((e.clientX - boks.left) * 10) / 10,
      Math.round((e.clientY - boks.top) * 10) / 10,
    ];
  };

  function oppdater(nye: SignaturStrok) {
    strokRef.current = nye;
    setStrok(nye);
  }

  return (
    <div>
      <canvas
        ref={lerret}
        className={`signaturfelt ${strok.length ? 'signert' : ''}`}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          tegner.current = true;
          oppdater([...strokRef.current, [punkt(e)]]);
        }}
        onPointerMove={(e) => {
          if (!tegner.current || strokRef.current.length === 0) return;
          const forrige = strokRef.current;
          const siste = [...forrige[forrige.length - 1], punkt(e)];
          oppdater([...forrige.slice(0, -1), siste]);
        }}
        onPointerUp={() => {
          if (!tegner.current) return;
          tegner.current = false;
          onEndre(strokRef.current.length ? strokRef.current : null);
        }}
        onPointerCancel={() => {
          tegner.current = false;
          onEndre(strokRef.current.length ? strokRef.current : null);
        }}
      />
      <div className="rad" style={{ marginTop: 8 }}>
        <span className="hvisk">
          {strok.length ? 'Signert' : 'Kunden signerer med fingeren i feltet over'}
        </span>
        <button
          type="button"
          className="knapp knapp-liten"
          onClick={() => {
            oppdater([]);
            onEndre(null);
          }}
        >
          Tøm
        </button>
      </div>
    </div>
  );
}
