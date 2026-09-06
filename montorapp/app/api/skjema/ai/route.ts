import { NextResponse } from 'next/server';
import { krevInnlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { tripletex } from '@/lib/tripletex';
import { AiIkkeSattOpp, foreslaTekst } from '@/lib/ai/skjema';
import { datoMinus, idag } from '@/lib/uke';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Foreslår tekst til ett fritekstfelt. Montøren ser alltid forslaget og kan
 * endre det før det låses – forslaget lagres aldri direkte som svar.
 */
export async function POST(request: Request) {
  try {
    const innlogget = await krevInnlogget();
    const { malId, sporsmalId, prosjektId, svarSaLangt } = (await request.json()) as {
      malId?: string;
      sporsmalId?: string;
      prosjektId?: number;
      svarSaLangt?: Record<string, unknown>;
    };

    if (!malId || !sporsmalId || !prosjektId) {
      return NextResponse.json({ feil: 'Mangler opplysninger om skjemaet.' }, { status: 400 });
    }

    const db = butikk();
    const tt = tripletex();

    const mal = await db.mal(malId);
    const sporsmal = mal?.sporsmal.find((s) => s.id === sporsmalId);
    if (!mal || !sporsmal) {
      return NextResponse.json({ feil: 'Fant ikke spørsmålet i malen.' }, { status: 404 });
    }

    const [prosjekt, aktiviteter, timer, tillegg] = await Promise.all([
      tt.hentProsjekt(prosjektId),
      tt.hentAktiviteter(),
      tt.hentTimeforinger({
        ansattId: innlogget.profil.tripletexEmployeeId,
        fraDato: datoMinus(120),
        tilDato: idag(),
      }),
      db.alleTillegg({ prosjektId }),
    ]);

    if (!prosjekt) {
      return NextResponse.json({ feil: 'Fant ikke prosjektet i Tripletex.' }, { status: 404 });
    }

    const aktivitetNavn = new Map(aktiviteter.map((a) => [a.id, a.navn]));

    const tekst = await foreslaTekst({
      sporsmal,
      skjemaNavn: mal.navn,
      prosjekt,
      avdelingNavn: innlogget.avdeling.navn,
      utfortAv: innlogget.profil.navn,
      timeforinger: timer
        .filter((t) => t.prosjektId === prosjektId)
        .map((t) => ({
          dato: t.dato,
          timer: t.timer,
          aktivitet: aktivitetNavn.get(t.aktivitetId) ?? 'Arbeid',
        })),
      materiell: tillegg.flatMap((t) =>
        t.linjer.map((l) => ({ beskrivelse: l.beskrivelse, antall: l.antall, enhet: l.enhet })),
      ),
      besvarteSporsmal: mal.sporsmal
        .filter((s) => s.id !== sporsmalId)
        .map((s) => {
          const v = svarSaLangt?.[s.id];
          if (v === undefined || v === null || v === '') return null;
          return { sporsmal: s.tekst, svar: String(v) };
        })
        .filter((s): s is { sporsmal: string; svar: string } => s !== null),
    });

    return ok({ tekst, mangler: tekst.startsWith('MANGLER:') });
  } catch (feil) {
    if (feil instanceof AiIkkeSattOpp) {
      return NextResponse.json({ feil: feil.message }, { status: 503 });
    }
    return feilsvar(feil);
  }
}
