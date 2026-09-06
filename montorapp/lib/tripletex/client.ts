import { config } from '@/lib/config';

/**
 * Lavnivå-klient mot Tripletex API 2.
 *
 * All kunnskap om innlogging, kø, ny-forsøk og feilhåndtering ligger her, slik at
 * resten av koden bare kaller navngitte funksjoner i api.ts.
 *
 * Innloggingsflyten er dokumentert av Tripletex slik:
 *   PUT /v2/token/session/:create?consumerToken=..&employeeToken=..&expirationDate=..
 *   → { value: { token } }
 * Deretter Basic Auth der brukernavn er selskaps-id (0 = eget selskap) og
 * passord er session-token.
 */

export class TripletexError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detaljer?: unknown,
  ) {
    super(message);
    this.name = 'TripletexError';
  }
}

interface Sesjon {
  token: string;
  utloper: number; // millisekunder siden epoch
}

let sesjon: Sesjon | null = null;
let pagaendeInnlogging: Promise<Sesjon> | null = null;

/** Hvor lenge en session-token skal leve. Tripletex lar oss velge selv. */
const SESJON_DAGER = 7;
/** Vi fornyer i god tid før utløp, slik at et kall aldri feiler på grunn av tid. */
const FORNY_FOR_MS = 24 * 60 * 60 * 1000;

function datoOm(dager: number): string {
  const d = new Date(Date.now() + dager * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function lagSesjon(): Promise<Sesjon> {
  const { consumerToken, employeeToken, baseUrl } = config.tripletex;
  if (!consumerToken || !employeeToken) {
    throw new TripletexError('Tripletex-nøkler mangler i miljøvariablene.', 500);
  }

  const utloperDato = datoOm(SESJON_DAGER);
  const url =
    `${baseUrl}/v2/token/session/:create` +
    `?consumerToken=${encodeURIComponent(consumerToken)}` +
    `&employeeToken=${encodeURIComponent(employeeToken)}` +
    `&expirationDate=${utloperDato}`;

  const res = await fetch(url, { method: 'PUT', cache: 'no-store' });
  if (!res.ok) {
    const tekst = await res.text().catch(() => '');
    throw new TripletexError(
      `Fikk ikke logget inn mot Tripletex (${res.status}).`,
      res.status,
      tekst.slice(0, 500),
    );
  }

  const data = (await res.json()) as { value?: { token?: string; expirationDate?: string } };
  const token = data?.value?.token;
  if (!token) {
    throw new TripletexError('Tripletex svarte uten session-token.', 502, data);
  }

  return {
    token,
    utloper: new Date(`${data.value?.expirationDate ?? utloperDato}T23:59:59Z`).getTime(),
  };
}

async function hentSesjon(tvingNy = false): Promise<Sesjon> {
  if (!tvingNy && sesjon && sesjon.utloper - Date.now() > FORNY_FOR_MS) {
    return sesjon;
  }
  // Flere samtidige kall skal ikke lage hver sin token.
  if (!pagaendeInnlogging) {
    pagaendeInnlogging = lagSesjon()
      .then((s) => {
        sesjon = s;
        return s;
      })
      .finally(() => {
        pagaendeInnlogging = null;
      });
  }
  return pagaendeInnlogging;
}

function autorisasjon(token: string): string {
  const par = `${config.tripletex.companyId}:${token}`;
  return `Basic ${Buffer.from(par).toString('base64')}`;
}

function ventLitt(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface KallValg {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Brukes ved filopplasting. Da settes ikke Content-Type manuelt. */
  formData?: FormData;
}

const MAKS_FORSOK = 4;

/**
 * Utfører ett kall mot Tripletex.
 *
 * Tripletex svarer 429 når vi kaller for ofte. Grensen er ikke offentlig
 * dokumentert, så vi prøver på nytt med økende ventetid i stedet for å anta et tall.
 */
export async function tripletexKall<T>(sti: string, valg: KallValg = {}): Promise<T> {
  const { method = 'GET', query, body, formData } = valg;

  const url = new URL(`${config.tripletex.baseUrl}/v2${sti}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  let sisteFeil: unknown;

  for (let forsok = 0; forsok < MAKS_FORSOK; forsok++) {
    const s = await hentSesjon(forsok > 0 && sisteFeil instanceof TripletexError && sisteFeil.status === 401);

    const headers: Record<string, string> = {
      Authorization: autorisasjon(s.token),
      Accept: 'application/json',
    };
    if (!formData && body !== undefined) headers['Content-Type'] = 'application/json';

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method,
        headers,
        body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
        cache: 'no-store',
      });
    } catch (feil) {
      sisteFeil = new TripletexError('Fikk ikke kontakt med Tripletex.', 503, String(feil));
      await ventLitt(500 * 2 ** forsok);
      continue;
    }

    if (res.ok) {
      if (res.status === 204) return undefined as T;
      const tekst = await res.text();
      return (tekst ? JSON.parse(tekst) : undefined) as T;
    }

    const feiltekst = await res.text().catch(() => '');

    // 401 → token kan ha blitt ugyldig. Prøv én gang med ny token.
    // 429/5xx → midlertidig. Vent og prøv igjen.
    if (res.status === 401 || res.status === 429 || res.status >= 500) {
      sisteFeil = new TripletexError(
        `Tripletex svarte ${res.status}.`,
        res.status,
        feiltekst.slice(0, 500),
      );
      const ventMs = res.status === 429 ? 1500 * 2 ** forsok : 400 * 2 ** forsok;
      await ventLitt(ventMs);
      continue;
    }

    throw new TripletexError(
      lesFeilmelding(feiltekst) ?? `Tripletex avviste kallet (${res.status}).`,
      res.status,
      feiltekst.slice(0, 500),
    );
  }

  throw sisteFeil instanceof Error
    ? sisteFeil
    : new TripletexError('Tripletex svarte ikke.', 503);
}

/** Tripletex legger ofte den nyttige teksten i validationMessages. */
function lesFeilmelding(tekst: string): string | null {
  try {
    const data = JSON.parse(tekst) as {
      message?: string;
      validationMessages?: Array<{ message?: string; field?: string }>;
    };
    const validering = data.validationMessages
      ?.map((v) => [v.field, v.message].filter(Boolean).join(': '))
      .filter(Boolean)
      .join('. ');
    return validering || data.message || null;
  } catch {
    return null;
  }
}

/** Tripletex pakker lister i { values: [...] } og enkeltobjekter i { value: {...} }. */
export interface TripletexListe<T> {
  values: T[];
  fullResultSize?: number;
}
export interface TripletexEnkelt<T> {
  value: T;
}

/** Nullstiller tokenet. Brukes av selvtesten i /admin/oppsett. */
export function glemSesjon(): void {
  sesjon = null;
}
