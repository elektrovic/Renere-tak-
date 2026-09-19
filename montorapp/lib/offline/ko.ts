'use client';

import type { KoJobb, KoResultat } from './typer';

/**
 * Køen på telefonen.
 *
 * Alt montøren registrerer havner her først, i nettleserens egen database
 * (IndexedDB). Den overlever at appen lukkes, at telefonen restartes og at
 * nettet er borte. Så snart det er dekning sendes køen til serveren.
 */

const DB_NAVN = 'montorapp';
const DB_VERSJON = 1;
const BUTIKK = 'ko';

export type KoRad = KoJobb & {
  status: 'i_ko' | 'sender' | 'sendt' | 'feilet';
  feilmelding?: string;
  referanse?: string;
  forsok: number;
};

function apne(): Promise<IDBDatabase> {
  return new Promise((løs, avvis) => {
    const forespørsel = indexedDB.open(DB_NAVN, DB_VERSJON);
    forespørsel.onupgradeneeded = () => {
      const db = forespørsel.result;
      if (!db.objectStoreNames.contains(BUTIKK)) {
        db.createObjectStore(BUTIKK, { keyPath: 'localId' });
      }
    };
    forespørsel.onsuccess = () => løs(forespørsel.result);
    forespørsel.onerror = () => avvis(forespørsel.error);
  });
}

async function medButikk<T>(
  modus: IDBTransactionMode,
  arbeid: (butikk: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await apne();
  return new Promise<T>((løs, avvis) => {
    const transaksjon = db.transaction(BUTIKK, modus);
    const forespørsel = arbeid(transaksjon.objectStore(BUTIKK));
    forespørsel.onsuccess = () => løs(forespørsel.result);
    forespørsel.onerror = () => avvis(forespørsel.error);
    transaksjon.oncomplete = () => db.close();
  });
}

export function nyLocalId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function leggIKo(jobb: KoJobb): Promise<KoRad> {
  const rad: KoRad = { ...jobb, status: 'i_ko', forsok: 0 };
  await medButikk('readwrite', (b) => b.put(rad));
  varsleEndring();
  return rad;
}

export async function alleIKo(): Promise<KoRad[]> {
  const rader = await medButikk<KoRad[]>('readonly', (b) => b.getAll() as IDBRequest<KoRad[]>);
  return rader.sort((a, b) => a.opprettet.localeCompare(b.opprettet));
}

export async function slettSendte(eldreEnnTimer = 24): Promise<void> {
  const grense = Date.now() - eldreEnnTimer * 60 * 60 * 1000;
  for (const rad of await alleIKo()) {
    if (rad.status === 'sendt' && new Date(rad.opprettet).getTime() < grense) {
      await medButikk('readwrite', (b) => b.delete(rad.localId));
    }
  }
  varsleEndring();
}

export async function slettRad(localId: string): Promise<void> {
  await medButikk('readwrite', (b) => b.delete(localId));
  varsleEndring();
}

async function oppdater(localId: string, endring: Partial<KoRad>): Promise<void> {
  const rad = await medButikk<KoRad | undefined>(
    'readonly',
    (b) => b.get(localId) as IDBRequest<KoRad | undefined>,
  );
  if (!rad) return;
  await medButikk('readwrite', (b) => b.put({ ...rad, ...endring }));
}

/** Enkel beskjed til grensesnittet om at køen har endret seg. */
const HENDELSE = 'montorapp-ko-endret';
export function varsleEndring(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HENDELSE));
}
export function lyttPaKo(lytter: () => void): () => void {
  window.addEventListener(HENDELSE, lytter);
  return () => window.removeEventListener(HENDELSE, lytter);
}

let sendingPagar = false;

export interface SynkResultat {
  sendt: number;
  feilet: number;
  utenNett: boolean;
}

/**
 * Køen sendes i små puljer, ikke alt på én gang.
 *
 * Grunnen er todelt: mange hosting-tjenester kutter en forespørsel etter ti
 * sekunder, og en montør på dårlig 4G rekker uansett ikke å sende ti
 * registreringer med bilder i ett jafs. Små puljer betyr at det som går
 * gjennom, blir stående som sendt – og bare resten prøves på nytt.
 */
const MAKS_JOBBER_PER_PULJE = 4;
const MAKS_BYTE_PER_PULJE = 2_000_000;

function delIPuljer(rader: KoRad[]): KoRad[][] {
  const puljer: KoRad[][] = [];
  let gjeldende: KoRad[] = [];
  let storrelse = 0;

  for (const rad of rader) {
    const radStorrelse = JSON.stringify(rad.data).length;
    const forFull =
      gjeldende.length >= MAKS_JOBBER_PER_PULJE ||
      (gjeldende.length > 0 && storrelse + radStorrelse > MAKS_BYTE_PER_PULJE);

    if (forFull) {
      puljer.push(gjeldende);
      gjeldende = [];
      storrelse = 0;
    }
    gjeldende.push(rad);
    storrelse += radStorrelse;
  }

  if (gjeldende.length > 0) puljer.push(gjeldende);
  return puljer;
}

async function sendPulje(pulje: KoRad[]): Promise<SynkResultat> {
  for (const rad of pulje) await oppdater(rad.localId, { status: 'sender' });
  varsleEndring();

  const tilbakeIKo = async () => {
    for (const rad of pulje) {
      await oppdater(rad.localId, { status: 'i_ko', forsok: rad.forsok + 1 });
    }
    varsleEndring();
  };

  let svar: Response;
  try {
    svar = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobber: pulje.map(({ type, localId, opprettet, data }) => ({
          type,
          localId,
          opprettet,
          data,
        })),
      }),
    });
  } catch {
    await tilbakeIKo();
    return { sendt: 0, feilet: 0, utenNett: true };
  }

  if (!svar.ok) {
    await tilbakeIKo();
    // 4xx er noe vi ikke retter opp ved å prøve igjen med det samme, men vi lar
    // raden stå i kø slik at montøren kan prøve manuelt.
    return { sendt: 0, feilet: 0, utenNett: svar.status >= 500 };
  }

  let resultater: KoResultat[];
  try {
    ({ resultater } = (await svar.json()) as { resultater: KoResultat[] });
  } catch {
    await tilbakeIKo();
    return { sendt: 0, feilet: 0, utenNett: true };
  }

  let sendt = 0;
  let feilet = 0;
  for (const r of resultater) {
    if (r.status === 'sendt') {
      sendt++;
      await oppdater(r.localId, { status: 'sendt', referanse: r.referanse, feilmelding: undefined });
    } else {
      feilet++;
      await oppdater(r.localId, { status: 'feilet', feilmelding: r.feilmelding });
    }
  }

  // Svarte serveren for færre enn vi sendte, står resten fortsatt i kø.
  const besvart = new Set(resultater.map((r) => r.localId));
  for (const rad of pulje) {
    if (!besvart.has(rad.localId)) {
      await oppdater(rad.localId, { status: 'i_ko', forsok: rad.forsok + 1 });
    }
  }

  varsleEndring();
  return { sendt, feilet, utenNett: false };
}

/**
 * Sender køen, pulje for pulje. Trygg å kalle så ofte man vil – den gjør
 * ingenting hvis en sending allerede pågår, eller hvis telefonen er uten nett.
 */
export async function synk(inkluderFeilede = false): Promise<SynkResultat> {
  if (sendingPagar) return { sendt: 0, feilet: 0, utenNett: false };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sendt: 0, feilet: 0, utenNett: true };
  }

  const alle = await alleIKo();
  const skalSendes = alle.filter(
    (r) => r.status === 'i_ko' || r.status === 'sender' || (inkluderFeilede && r.status === 'feilet'),
  );
  if (skalSendes.length === 0) return { sendt: 0, feilet: 0, utenNett: false };

  sendingPagar = true;
  try {
    let sendt = 0;
    let feilet = 0;

    for (const pulje of delIPuljer(skalSendes)) {
      const resultat = await sendPulje(pulje);
      sendt += resultat.sendt;
      feilet += resultat.feilet;
      // Mistet vi nettet midtveis, stopper vi. Resten står trygt i kø.
      if (resultat.utenNett) return { sendt, feilet, utenNett: true };
    }

    return { sendt, feilet, utenNett: false };
  } finally {
    sendingPagar = false;
  }
}
