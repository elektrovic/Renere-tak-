import { NextResponse } from 'next/server';
import { IkkeInnlogget, IkkeTilgang } from '@/lib/auth/session';
import { TripletexError } from '@/lib/tripletex';

/**
 * Gjør om en feil til et svar montøren kan forstå.
 * Ingen tekniske detaljer lekker ut til nettleseren.
 */
export function feilsvar(feil: unknown): NextResponse {
  if (feil instanceof IkkeInnlogget) {
    return NextResponse.json({ feil: 'Du er ikke logget inn.' }, { status: 401 });
  }
  if (feil instanceof IkkeTilgang) {
    return NextResponse.json({ feil: feil.message }, { status: 403 });
  }
  if (feil instanceof TripletexError) {
    // 4xx fra Tripletex er som regel noe brukeren kan rette opp selv.
    const status = feil.status >= 400 && feil.status < 500 ? 409 : 502;
    console.error('Tripletex-feil', feil.status, feil.message, feil.detaljer);
    return NextResponse.json({ feil: `Tripletex: ${feil.message}` }, { status });
  }
  console.error('Uventet feil', feil);
  return NextResponse.json(
    { feil: 'Noe gikk galt hos oss. Prøv igjen, eller si fra hvis det gjentar seg.' },
    { status: 500 },
  );
}

export function ok<T>(data: T): NextResponse {
  return NextResponse.json(data);
}
