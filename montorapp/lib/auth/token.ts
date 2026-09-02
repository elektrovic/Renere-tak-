import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signering og kontroll av innloggingsinformasjonen.
 *
 * Skilt ut i egen fil uten andre avhengigheter, slik at den kan testes direkte.
 */

export const LEVETID_DAGER = 90;

function signer(data: string, hemmelighet: string): string {
  return createHmac('sha256', hemmelighet).update(data).digest('base64url');
}

export function lagToken(profilId: string, hemmelighet: string, na = Date.now()): string {
  const utloper = na + LEVETID_DAGER * 24 * 60 * 60 * 1000;
  const data = `${profilId}.${utloper}`;
  return `${data}.${signer(data, hemmelighet)}`;
}

/** Returnerer profil-id hvis tokenet er ekte og ikke utløpt, ellers null. */
export function lesToken(verdi: string | undefined, hemmelighet: string, na = Date.now()): string | null {
  if (!verdi) return null;
  const deler = verdi.split('.');
  if (deler.length !== 3) return null;

  const [profilId, utloperTekst, signatur] = deler;
  const forventet = signer(`${profilId}.${utloperTekst}`, hemmelighet);

  const a = Buffer.from(signatur);
  const b = Buffer.from(forventet);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const utloper = Number(utloperTekst);
  if (!Number.isFinite(utloper) || utloper < na) return null;

  return profilId;
}
