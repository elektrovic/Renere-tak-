'use client';

import { useCallback, useEffect, useState } from 'react';

export interface HentValg extends RequestInit {
  /** Avbryter kallet etter så mange millisekunder, med en lesbar beskjed. */
  tidsgrenseMs?: number;
}

/** Henter fra våre egne API-ruter, med feilmeldinger montøren kan lese. */
export async function hent<T>(url: string, valg?: HentValg): Promise<T> {
  const { tidsgrenseMs, ...resten } = valg ?? {};
  const avbryter = tidsgrenseMs ? AbortSignal.timeout(tidsgrenseMs) : undefined;

  let svar: Response;
  try {
    svar = await fetch(url, {
      ...resten,
      signal: avbryter,
      headers: { 'Content-Type': 'application/json', ...(resten.headers ?? {}) },
    });
  } catch (feil) {
    if (feil instanceof DOMException && feil.name === 'TimeoutError') {
      throw new Error('Det tok for lang tid. Prøv igjen, eller gjør det for hånd.');
    }
    throw new Error('Fikk ikke kontakt. Sjekk dekningen og prøv igjen.');
  }

  if (svar.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/logg-inn';
    throw new Error('Ikke innlogget');
  }

  const tekst = await svar.text();

  // Et tidsavbrudd fra hostingen svarer med en HTML-side, ikke JSON.
  // Da skal montøren få en forståelig beskjed, ikke en parsefeil.
  let data: (T & { feil?: string }) | null = null;
  if (tekst) {
    try {
      data = JSON.parse(tekst) as T & { feil?: string };
    } catch {
      if (!svar.ok) {
        throw new Error(
          svar.status === 504 || svar.status === 502
            ? 'Serveren brukte for lang tid. Prøv igjen.'
            : 'Noe gikk galt hos oss. Prøv igjen.',
        );
      }
      throw new Error('Fikk et uventet svar fra serveren.');
    }
  }

  if (!svar.ok) throw new Error(data?.feil ?? 'Noe gikk galt. Prøv igjen.');
  return (data ?? {}) as T;
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
