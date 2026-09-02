import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { tripletex } from '@/lib/tripletex';
import { velgBaseline } from '@/lib/kobbr';
import { datoMinus, idag } from '@/lib/uke';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const innlogget = await krevInnlogget();
    const prosjektId = Number((await params).id);
    if (!Number.isFinite(prosjektId)) {
      return NextResponse.json({ feil: 'Ugyldig prosjekt.' }, { status: 400 });
    }

    const tt = tripletex();
    const db = butikk();

    const [prosjekt, meta, mineTimer, tillegg, aktiviteter] = await Promise.all([
      tt.hentProsjekt(prosjektId),
      db.prosjektMeta(prosjektId),
      tt.hentTimeforinger({
        ansattId: innlogget.profil.tripletexEmployeeId,
        fraDato: datoMinus(120),
        tilDato: idag(),
      }),
      db.alleTillegg({ prosjektId }),
      tt.hentAktiviteter(),
    ]);

    if (!prosjekt) {
      return NextResponse.json({ feil: 'Fant ikke prosjektet.' }, { status: 404 });
    }

    const baseline = velgBaseline({
      manuellSum: meta?.baselineKilde === 'manuell' ? meta.baselineSum : null,
      tripletexFastpris: prosjekt.fastpris,
      kobbrSum: null,
    });

    return ok({
      prosjekt,
      meta,
      baseline,
      mineTimer: mineTimer.filter((t) => t.prosjektId === prosjektId),
      aktiviteter,
      tillegg: tillegg.map((t) => ({
        id: t.id,
        sum: t.sum,
        type: t.type,
        status: t.status,
        signert: Boolean(t.signertTid),
        opprettet: t.opprettet,
        linjer: t.linjer,
      })),
    });
  } catch (feil) {
    return feilsvar(feil);
  }
}
