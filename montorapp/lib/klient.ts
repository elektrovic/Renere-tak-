'use client';

import { useCallback, useEffect, useState } from 'react';

/** Henter fra våre egne API-ruter, med feilmeldinger montøren kan lese. */
export async function hent<T>(url: string, valg?: RequestInit): Promise<T> {
  const svar = await fetch(url, { ...valg, headers: { 'Content-Type': 'application/json', ...(valg?.headers ?? {}) } });

  if (svar.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/logg-inn';
    throw new Error('Ikke innlogget');
  }

  const tekst = await svar.text();
  const data = tekst ? (JSON.parse(tekst) as T & { feil?: string }) : ({} as T & { feil?: string });

  if (!svar.ok) throw new Error(data.feil ?? 'Noe gikk galt. Prøv igjen.');
  return data as T;
}

export interface HentTilstand<T> {
  data: T | null;
  feil: string | null;
  laster: boolean;
  hentPaNytt: () => void;
}

export function useHent<T>(url: string | null): HentTilstand<T> {
  const [data, setData] = useState<T | null>(null);
  const [feil, setFeil] = useState<string | null>(null);
  const [laster, setLaster] = useState(Boolean(url));
  const [teller, setTeller] = useState(0);

  useEffect(() => {
    if (!url) return;
    let avbrutt = false;
    setLaster(true);
    hent<T>(url)
      .then((d) => {
        if (!avbrutt) {
          setData(d);
          setFeil(null);
        }
      })
      .catch((f: unknown) => {
        if (!avbrutt) setFeil(f instanceof Error ? f.message : 'Noe gikk galt.');
      })
      .finally(() => {
        if (!avbrutt) setLaster(false);
      });
    return () => {
      avbrutt = true;
    };
  }, [url, teller]);

  const hentPaNytt = useCallback(() => setTeller((t) => t + 1), []);
  return { data, feil, laster, hentPaNytt };
}
