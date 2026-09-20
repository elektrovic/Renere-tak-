'use client';

import { useMemo, useState } from 'react';
import { useHent } from '@/lib/klient';
import { norskDato, norskUkedag } from '@/lib/uke';
import type { KalenderHendelse } from '@/lib/types';

interface Svar {
  hendelser: KalenderHendelse[];
  montorer: Array<{ id: string; navn: string; farge: string; rolle: string }>;
}

function ukeStart(forskyvning: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const ukedag = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - ukedag + forskyvning * 7);
  return d;
}

function klokke(iso: string): string {
  return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

export default function KalenderSide() {
  const [uke, setUke] = useState(0);
  const start = useMemo(() => ukeStart(uke), [uke]);
  const slutt = useMemo(() => {
    const d = new Date(start);
    d.setDate(d.getDate() + 7);
    return d;
  }, [start]);

  const { data, feil, laster } = useHent<Svar>(
    `/api/kalender?fra=${start.toISOString()}&til=${slutt.toISOString()}`,
  );

  const dager = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [start],
  );

  const iDagIso = new Date().toISOString().slice(0, 10);
  const farge = new Map((data?.montorer ?? []).map((m) => [m.id, m.farge]));
  const navn = new Map((data?.montorer ?? []).map((m) => [m.id, m.navn]));

  return (
    <>
      <div className="rad">
        <h1>Kalender</h1>
        <div className="knapperad" style={{ flex: '0 0 auto' }}>
          <button type="button" className="knapp knapp-liten" onClick={() => setUke((u) => u - 1)}>
            ←
          </button>
          <button type="button" className="knapp knapp-liten" onClick={() => setUke(0)}>
            Denne uka
          </button>
          <button type="button" className="knapp knapp-liten" onClick={() => setUke((u) => u + 1)}>
            →
          </button>
        </div>
      </div>

      {laster && <p className="tom">Henter kalenderen …</p>}
      {feil && <p className="melding feil">{feil}</p>}

      <div className="liste">
        {dager.map((dag) => {
          const iso = dag.toISOString().slice(0, 10);
          const paDagen = (data?.hendelser ?? []).filter((h) => h.start.slice(0, 10) === iso);
          return (
            <div key={iso} className={`kalenderdag ${iso === iDagIso ? 'i-dag' : ''}`}>
              <h3 style={{ textTransform: 'capitalize' }}>
                {norskUkedag(iso)} {norskDato(iso)}
              </h3>
              {paDagen.length === 0 ? (
                <p className="hvisk" style={{ paddingTop: 6 }}>
                  Ingenting planlagt
                </p>
              ) : (
                paDagen.map((h) => (
                  <div key={h.id} className="oppdrag">
                    <span className="prikk" style={{ background: farge.get(h.profilId) ?? '#888' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{h.tittel}</div>
                      <div className="hvisk">
                        {navn.get(h.profilId) ?? 'Ukjent'} · {klokke(h.start)}–{klokke(h.slutt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {data && data.montorer.length > 0 && (
        <div className="kort kort-tett">
          <h3>Fargekoder</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
            {data.montorer.map((m) => (
              <span key={m.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} className="hvisk">
                <span className="prikk" style={{ background: m.farge }} />
                {m.navn}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
