import { NextResponse } from 'next/server';
import { butikk } from '@/lib/store';
import { sjekkPin } from '@/lib/auth/pin';
import { cookieValg, lagSesjonsverdi, offentlig, SESJON_COOKIE } from '@/lib/auth/session';
import { feilsvar } from '@/lib/api-svar';

/** Enkel bremse mot gjetting av PIN. Nullstilles når serveren starter på nytt. */
const forsok = new Map<string, { antall: number; forste: number }>();
const VINDU_MS = 10 * 60 * 1000;
const MAKS_FORSOK = 8;

function forMangeForsok(nokkel: string): boolean {
  const na = Date.now();
  const rad = forsok.get(nokkel);
  if (!rad || na - rad.forste > VINDU_MS) {
    forsok.set(nokkel, { antall: 1, forste: na });
    return false;
  }
  rad.antall += 1;
  return rad.antall > MAKS_FORSOK;
}

export async function POST(request: Request) {
  try {
    const { epost, pin } = (await request.json()) as { epost?: string; pin?: string };
    if (!epost || !pin) {
      return NextResponse.json({ feil: 'Fyll inn e-post og PIN.' }, { status: 400 });
    }

    if (forMangeForsok(epost.toLowerCase())) {
      return NextResponse.json(
        { feil: 'For mange forsøk. Vent litt før du prøver igjen.' },
        { status: 429 },
      );
    }

    const profil = await butikk().profilByEpost(epost);
    if (!profil || !profil.aktiv || !sjekkPin(pin, profil.pinHash)) {
      return NextResponse.json({ feil: 'Feil e-post eller PIN.' }, { status: 401 });
    }

    forsok.delete(epost.toLowerCase());

    const svar = NextResponse.json({ profil: offentlig(profil) });
    svar.cookies.set(SESJON_COOKIE, lagSesjonsverdi(profil.id), cookieValg);
    return svar;
  } catch (feil) {
    return feilsvar(feil);
  }
}
