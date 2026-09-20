'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useHent } from '@/lib/klient';
import { norskDato, timer as formaterTimer } from '@/lib/uke';
import type { JobbKort } from '@/lib/jobber';

const MERKE_TEKST: Record<string, string> = {
  i_dag: 'I dag',
  i_gar: 'I går',
  nylig: 'Nylig',
};

export default function JobberSide() {
  const { data, feil, laster } = useHent<{ jobber: JobbKort[] }>('/api/jobber');
  const [sok, setSok] = useState('');

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase();
    if (!q) return data?.jobber ?? [];
    return (data?.jobber ?? []).filter((j) =>
      [j.prosjekt.navn, j.prosjekt.nummer, j.prosjekt.kunde, j.prosjekt.adresse ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [data, sok]);

  return (
    <>
      <h1>Mine jobber</h1>

      <input
        type="text"
        inputMode="search"
        placeholder="Søk på prosjekt, kunde eller adresse"
        value={sok}
        onChange={(e) => setSok(e.target.value)}
        aria-label="Søk i jobber"
      />

      {laster && <p className="tom">Henter jobbene dine …</p>}
      {feil && <p className="melding feil">{feil}</p>}
      {data && treff.length === 0 && <p className="tom">Ingen jobber passer med søket.</p>}

      <div className="liste">
        {treff.map((j) => (
          <Link
            key={j.prosjekt.id}
            href={`/jobber/${j.prosjekt.id}`}
            className={`jobbkort ${j.merke === 'i_dag' ? 'i-dag' : ''}`}
          >
            <span className="jobbkort-navn">{j.prosjekt.navn}</span>
            <span className="jobbkort-under">
              <span className="nummer">{j.prosjekt.nummer}</span>
              <span>{j.prosjekt.kunde}</span>
              {j.merke && <span className="merkelapp merke">{MERKE_TEKST[j.merke]}</span>}
              {j.sisteDato && j.merke === 'nylig' && <span>Sist {norskDato(j.sisteDato)}</span>}
              {j.timerSiste30 > 0 && <span>{formaterTimer(j.timerSiste30)} t siste 30 dager</span>}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
