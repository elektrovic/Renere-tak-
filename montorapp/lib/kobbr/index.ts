import { config } from '@/lib/config';

/**
 * Kobbr-integrasjon bak et grensesnitt.
 *
 * Kobbr har så vidt vi vet ikke noe offentlig API i dag, men de har allerede en
 * ferdig integrasjon mot Tripletex. Derfor er rekkefølgen vår:
 *   1. fastpris fra Tripletex-prosjektet,
 *   2. sum lagt inn manuelt av admin,
 *   3. Kobbr-API, hvis de bekrefter at det finnes.
 *
 * Når Kobbr eventuelt åpner et API, er det bare denne filen som må endres.
 */

export interface Tilbudsgrunnlag {
  sum: number;
  kilde: 'kobbr' | 'tripletex' | 'manuell';
}

export const kobbrTilgjengelig = Boolean(config.kobbr.apiKey && config.kobbr.baseUrl);

export async function hentTilbudFraKobbr(_prosjektnummer: string): Promise<Tilbudsgrunnlag | null> {
  if (!kobbrTilgjengelig) return null;

  // Her legges det ekte kallet inn den dagen Kobbr bekrefter et API.
  // Inntil da returnerer vi null, og appen bruker Tripletex eller manuell sum.
  return null;
}

/**
 * Finner hva som skal regnes som opprinnelig tilbudssum – altså baseline for
 * hva som er tillegg.
 */
export function velgBaseline(valg: {
  manuellSum: number | null;
  tripletexFastpris: number | null;
  kobbrSum: number | null;
}): Tilbudsgrunnlag | null {
  if (valg.kobbrSum !== null) return { sum: valg.kobbrSum, kilde: 'kobbr' };
  if (valg.manuellSum !== null) return { sum: valg.manuellSum, kilde: 'manuell' };
  if (valg.tripletexFastpris !== null)
    return { sum: valg.tripletexFastpris, kilde: 'tripletex' };
  return null;
}
