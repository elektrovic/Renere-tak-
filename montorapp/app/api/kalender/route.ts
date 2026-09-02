import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { krevAdmin, krevInnlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { avdeling } = await krevInnlogget();
    const url = new URL(request.url);
    const [hendelser, profiler] = await Promise.all([
      butikk().kalender({
        avdelingId: avdeling.id,
        fra: url.searchParams.get('fra') ?? undefined,
        til: url.searchParams.get('til') ?? undefined,
      }),
      butikk().profiler(),
    ]);

    return ok({
      hendelser,
      montorer: profiler
        .filter((p) => p.avdelingId === avdeling.id && p.aktiv)
        .map((p) => ({ id: p.id, navn: p.navn, farge: p.kalenderfarge, rolle: p.rolle })),
    });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function POST(request: Request) {
  try {
    const { avdeling } = await krevAdmin();
    const kropp = (await request.json()) as {
      id?: string;
      profilId?: string;
      prosjektId?: number | null;
      tittel?: string;
      start?: string;
      slutt?: string;
      notat?: string | null;
    };

    if (!kropp.profilId || !kropp.tittel || !kropp.start || !kropp.slutt) {
      return NextResponse.json({ feil: 'Fyll ut montør, tittel og tidspunkt.' }, { status: 400 });
    }
    if (kropp.slutt <= kropp.start) {
      return NextResponse.json({ feil: 'Sluttidspunktet må være etter starten.' }, { status: 400 });
    }

    const hendelse = {
      id: kropp.id ?? randomUUID(),
      avdelingId: avdeling.id,
      profilId: kropp.profilId,
      prosjektId: kropp.prosjektId ?? null,
      tittel: kropp.tittel,
      start: kropp.start,
      slutt: kropp.slutt,
      notat: kropp.notat ?? null,
    };
    await butikk().lagreHendelse(hendelse);
    return ok({ hendelse });
  } catch (feil) {
    return feilsvar(feil);
  }
}

export async function DELETE(request: Request) {
  try {
    await krevAdmin();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ feil: 'Mangler id.' }, { status: 400 });
    await butikk().slettHendelse(id);
    return ok({ ok: true });
  } catch (feil) {
    return feilsvar(feil);
  }
}
