import { NextResponse } from 'next/server';
import { krevAdmin } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { feilsvar, ok } from '@/lib/api-svar';

/**
 * Her legger admin inn opprinnelig tilbudssum manuelt – reserveløsningen
 * for Kobbr. Summen er utgangspunktet for hva som regnes som tillegg.
 */
export async function POST(request: Request) {
  try {
    const { avdeling } = await krevAdmin();
    const { prosjektId, baselineSum, estimerteTimer, notat } = (await request.json()) as {
      prosjektId?: number;
      baselineSum?: number | null;
      estimerteTimer?: number | null;
      notat?: string | null;
    };

    if (!prosjektId) {
      return NextResponse.json({ feil: 'Mangler prosjekt.' }, { status: 400 });
    }

    const db = butikk();
    const fraFor = await db.prosjektMeta(prosjektId);

    await db.lagreProsjektMeta({
      prosjektId,
      avdelingId: fraFor?.avdelingId ?? avdeling.id,
      baselineSum: baselineSum ?? null,
      baselineKilde: baselineSum ? 'manuell' : (fraFor?.baselineKilde ?? null),
      estimerteTimer: estimerteTimer ?? fraFor?.estimerteTimer ?? null,
      notat: notat ?? fraFor?.notat ?? null,
    });

    return ok({ ok: true });
  } catch (feil) {
    return feilsvar(feil);
  }
}
