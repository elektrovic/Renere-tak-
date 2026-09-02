import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { krevAdmin, offentlig } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { gyldigPin, hashPin } from '@/lib/auth/pin';
import { feilsvar, ok } from '@/lib/api-svar';
import type { Profil } from '@/lib/types';

export async function GET() {
  try {
    const { avdeling, profil } = await krevAdmin();
    const alle = await butikk().profiler();
    const synlige = profil.konsernAdmin ? alle : alle.filter((p) => p.avdelingId === avdeling.id);
    return ok({ brukere: synlige.map(offentlig) });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function POST(request: Request) {
  try {
    const { avdeling, profil } = await krevAdmin();
    const kropp = (await request.json()) as Partial<Profil> & { pin?: string };

    if (!kropp.navn?.trim() || !kropp.epost?.trim() || !kropp.tripletexEmployeeId) {
      return NextResponse.json(
        { feil: 'Fyll inn navn, e-post og ansatt-id fra Tripletex.' },
        { status: 400 },
      );
    }
    if (kropp.pin && !gyldigPin(kropp.pin)) {
      return NextResponse.json({ feil: 'PIN må være 4–8 siffer.' }, { status: 400 });
    }

    const db = butikk();
    const eksisterende = kropp.id ? await db.profil(kropp.id) : null;

    if (!eksisterende && !kropp.pin) {
      return NextResponse.json({ feil: 'Nye brukere må få en PIN.' }, { status: 400 });
    }

    // En avdelingsadmin kan bare røre sin egen avdeling.
    const avdelingId = profil.konsernAdmin ? (kropp.avdelingId ?? avdeling.id) : avdeling.id;
    if (eksisterende && !profil.konsernAdmin && eksisterende.avdelingId !== avdeling.id) {
      return NextResponse.json({ feil: 'Brukeren hører til en annen avdeling.' }, { status: 403 });
    }

    const ny: Profil = {
      id: eksisterende?.id ?? randomUUID(),
      avdelingId,
      tripletexEmployeeId: kropp.tripletexEmployeeId,
      navn: kropp.navn.trim(),
      epost: kropp.epost.trim().toLowerCase(),
      pinHash: kropp.pin ? hashPin(kropp.pin) : eksisterende!.pinHash,
      rolle: kropp.rolle ?? eksisterende?.rolle ?? 'montor',
      kalenderfarge: kropp.kalenderfarge ?? eksisterende?.kalenderfarge ?? '#17548F',
      konsernAdmin: profil.konsernAdmin ? (kropp.konsernAdmin ?? false) : (eksisterende?.konsernAdmin ?? false),
      aktiv: kropp.aktiv ?? eksisterende?.aktiv ?? true,
    };

    await db.lagreProfil(ny);
    return ok({ bruker: offentlig(ny) });
  } catch (feil) {
    return feilsvar(feil);
  }
}
