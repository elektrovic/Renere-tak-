/**
 * Tolker en data-URL fra telefonens kamera.
 * Egen fil uten avhengigheter, slik at den kan testes direkte.
 */

export interface Bildedata {
  bytes: Uint8Array;
  type: string;
}

/** Deler «data:image/jpeg;base64,...» i innhold og filtype. Null hvis den ikke er et bilde. */
export function lesDataUrl(dataUrl: string): Bildedata | null {
  const treff = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!treff) return null;

  const [, type, base64] = treff;
  if (!type.startsWith('image/')) return null;

  // Buffer.from er tilgivende og hopper over ugyldige tegn, så vi sjekker selv.
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64.trim())) return null;

  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  if (bytes.byteLength === 0) return null;

  return { bytes, type };
}
