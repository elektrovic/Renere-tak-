import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { krevAdmin, krevInnlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { isoUke } from '@/lib/uke';
import { feilsvar, ok } from '@/lib/api-svar';
import type { Maal } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { avdeling } = await krevInnlogget();
    const uke = new URL(request.url).searchParams.get('uke') ?? isoUke();
    return ok({ maal: await butikk().maal(avdeling.id, uke), uke });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function POST(request: Request) {
  try {
    const { avdeling, profil } = await krevAdmin();
    const kropp = (await request.json()) as Partial<Maal>;

    if (!kropp.type || typeof kropp.malverdi !== 'number' || kropp.malverdi <= 0) {
      return NextResponse.json({ feil: 'Velg type mål og et tall over null.' }, { status: 400 });
    }

    const maal: Maal = {
      id: kropp.id ?? randomUUID(),
      avdelingId: avdeling.id,
      uke: kropp.uke ?? isoUke(),
      type: kropp.type,
      malverdi: kropp.malverdi,
      beskrivelse: kropp.beskrivelse ?? '',
      settAv: profil.id,
    };
    await butikk().lagreMaal(maal);
    return ok({ maal });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function DELETE(request: Request) {
  try {
    await krevAdmin();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ feil: 'Mangler id.' }, { status: 400 });
    await butikk().slettMaal(id);
    return ok({ ok: true });
  } catch (feil) {
    return feilsvar(feil);
  }
}
