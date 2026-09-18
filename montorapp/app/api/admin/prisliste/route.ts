import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { krevAdmin } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { feilsvar, ok } from '@/lib/api-svar';
import type { PrislinjeMal } from '@/lib/types';

export async function GET() {
  try {
    const { avdeling } = await krevAdmin();
    return ok({ prisliste: await butikk().prisliste(avdeling.id) });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function POST(request: Request) {
  try {
    const { avdeling } = await krevAdmin();
    const kropp = (await request.json()) as Partial<PrislinjeMal>;

    if (!kropp.navn?.trim() || typeof kropp.pris !== 'number' || kropp.pris < 0) {
      return NextResponse.json({ feil: 'Fyll inn navn og en pris.' }, { status: 400 });
    }

    const linje: PrislinjeMal = {
      id: kropp.id ?? randomUUID(),
      avdelingId: avdeling.id,
      tripletexProductId: kropp.tripletexProductId ?? null,
      navn: kropp.navn.trim(),
      enhet: kropp.enhet?.trim() || 'stk',
      pris: kropp.pris,
      sortering: kropp.sortering ?? 999,
      aktiv: kropp.aktiv ?? true,
    };
    await butikk().lagrePrislinje(linje);
    return ok({ linje });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function DELETE(request: Request) {
  try {
    await krevAdmin();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ feil: 'Mangler id.' }, { status: 400 });
    await butikk().slettPrislinje(id);
    return ok({ ok: true });
  } catch (feil) {
    return feilsvar(feil);
  }
}
