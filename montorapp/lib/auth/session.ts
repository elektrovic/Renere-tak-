import { cookies } from 'next/headers';
import { config } from '@/lib/config';
import { butikk } from '@/lib/store';
import type { Avdeling, OffentligProfil, Profil } from '@/lib/types';
import { lagToken, lesToken, LEVETID_DAGER } from './token';

/**
 * Innlogging holdes i en signert informasjonskapsel. Ingen database-oppslag
 * for å validere den, og den varer lenge – montøren skal ikke bli logget ut
 * fordi han var uten dekning i en kjeller.
 */

export const SESJON_COOKIE = 'montorapp_sesjon';

export function lagSesjonsverdi(profilId: string): string {
  return lagToken(profilId, config.authSecret);
}

export function lesSesjonsverdi(verdi: string | undefined): string | null {
  return lesToken(verdi, config.authSecret);
}

export const cookieValg = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: LEVETID_DAGER * 24 * 60 * 60,
};

export interface Innlogget {
  profil: Profil;
  avdeling: Avdeling;
}

/** Henter innlogget bruker, eller null. */
export async function lesInnlogget(): Promise<Innlogget | null> {
  const kake = await cookies();
  const profilId = lesSesjonsverdi(kake.get(SESJON_COOKIE)?.value);
  if (!profilId) return null;

  const db = butikk();
  const profil = await db.profil(profilId);
  if (!profil || !profil.aktiv) return null;

  const avdeling = await db.avdeling(profil.avdelingId);
  if (!avdeling) return null;

  return { profil, avdeling };
}

export class IkkeInnlogget extends Error {
  constructor() {
    super('Ikke innlogget');
    this.name = 'IkkeInnlogget';
  }
}

export class IkkeTilgang extends Error {
  constructor(melding = 'Du har ikke tilgang til dette') {
    super(melding);
    this.name = 'IkkeTilgang';
  }
}

export async function krevInnlogget(): Promise<Innlogget> {
  const i = await lesInnlogget();
  if (!i) throw new IkkeInnlogget();
  return i;
}

export async function krevAdmin(): Promise<Innlogget> {
  const i = await krevInnlogget();
  if (i.profil.rolle !== 'admin') {
    throw new IkkeTilgang('Dette er kun for administratorer.');
  }
  return i;
}

export function offentlig(profil: Profil): OffentligProfil {
  const { pinHash: _pinHash, ...rest } = profil;
  return rest;
}
