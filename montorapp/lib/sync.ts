import { randomUUID } from 'node:crypto';
import type { Innlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { tripletex, TripletexError } from '@/lib/tripletex';
import { lagSkjemaPdf } from '@/lib/pdf/skjema';
import { datoMinus, idag } from '@/lib/uke';
import type { KoJobb, KoResultat } from '@/lib/offline/typer';
import type { SkjemaUtfylling, Tillegg, TimeforingsJobb } from '@/lib/types';

/**
 * Tar imot køen fra telefonen og skriver den til Tripletex.
 *
 * Alt går gjennom `localId`: har vi allerede sendt en jobb med samme id,
 * svarer vi «sendt» uten å skrive noe på nytt. Det er dette som gjør at en
 * montør som mister dekningen midt i en sending aldri får dobbelt ført.
 */
export async function behandleKo(innlogget: Innlogget, jobber: KoJobb[]): Promise<KoResultat[]> {
  const resultater: KoResultat[] = [];
  for (const jobb of jobber) {
    try {
      resultater.push(await behandleEn(innlogget, jobb));
    } catch (feil) {
      resultater.push({
        localId: jobb.localId,
        status: 'feilet',
        feilmelding: lesbarFeil(feil),
      });
    }
  }
  return resultater;
}

function lesbarFeil(feil: unknown): string {
  if (feil instanceof TripletexError) return `Tripletex: ${feil.message}`;
  if (feil instanceof Error) return feil.message;
  return 'Ukjent feil';
}

async function behandleEn(innlogget: Innlogget, jobb: KoJobb): Promise<KoResultat> {
  switch (jobb.type) {
    case 'timeforing':
      return behandleTimeforing(innlogget, jobb);
    case 'tillegg':
      return behandleTillegg(innlogget, jobb);
    case 'skjema':
      return behandleSkjema(innlogget, jobb);
  }
}

async function behandleTimeforing(
  innlogget: Innlogget,
  jobb: Extract<KoJobb, { type: 'timeforing' }>,
): Promise<KoResultat> {
  const db = butikk();
  const tt = tripletex();

  const fraFor = await db.timejobb(jobb.localId);
  if (fraFor?.status === 'sendt') {
    return { localId: jobb.localId, status: 'sendt', referanse: `Timeføring ${fraFor.tripletexEntryId}` };
  }

  const rad: TimeforingsJobb = {
    id: fraFor?.id ?? randomUUID(),
    localId: jobb.localId,
    profilId: innlogget.profil.id,
    avdelingId: innlogget.avdeling.id,
    prosjektId: jobb.data.prosjektId,
    aktivitetId: jobb.data.aktivitetId,
    dato: jobb.data.dato,
    timer: jobb.data.timer,
    kommentar: jobb.data.kommentar,
    status: 'sender',
    tripletexEntryId: null,
    registreringMs: jobb.data.registreringMs,
    feilmelding: null,
    opprettet: fraFor?.opprettet ?? jobb.opprettet,
    sendt: null,
  };
  await db.lagreTimejobb(rad);

  if (jobb.data.timer <= 0 || jobb.data.timer > 24) {
    return lagreFeil(rad, 'Antall timer må være mellom 0 og 24.');
  }

  const last = await tt.manedErLast({
    ansattId: innlogget.profil.tripletexEmployeeId,
    dato: jobb.data.dato,
  });
  if (last) {
    return lagreFeil(
      rad,
      'Måneden er godkjent i Tripletex og kan ikke endres. Snakk med kontoret.',
    );
  }

  try {
    const [entryId] = await tt.skrivTimeforinger([
      {
        prosjektId: jobb.data.prosjektId,
        aktivitetId: jobb.data.aktivitetId,
        ansattId: innlogget.profil.tripletexEmployeeId,
        dato: jobb.data.dato,
        timer: jobb.data.timer,
        kommentar: jobb.data.kommentar,
      },
    ]);

    await db.lagreTimejobb({
      ...rad,
      status: 'sendt',
      tripletexEntryId: entryId ?? null,
      sendt: new Date().toISOString(),
    });
    return { localId: jobb.localId, status: 'sendt', referanse: `Timeføring ${entryId ?? ''}`.trim() };
  } catch (feil) {
    return lagreFeil(rad, lesbarFeil(feil));
  }
}

async function lagreFeil(rad: TimeforingsJobb, melding: string): Promise<KoResultat> {
  await butikk().lagreTimejobb({ ...rad, status: 'feilet', feilmelding: melding });
  return { localId: rad.localId, status: 'feilet', feilmelding: melding };
}

async function behandleTillegg(
  innlogget: Innlogget,
  jobb: Extract<KoJobb, { type: 'tillegg' }>,
): Promise<KoResultat> {
  const db = butikk();
  const tt = tripletex();

  const fraFor = await db.tilleggByLocalId(jobb.localId);
  if (fraFor?.status === 'sendt') {
    return { localId: jobb.localId, status: 'sendt', referanse: `Ordre ${fraFor.tripletexOrderId}` };
  }

  const linjer = jobb.data.linjer.filter((l) => l.antall > 0 && l.beskrivelse.trim() !== '');
  const sum = linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0);

  const rad: Tillegg = {
    id: fraFor?.id ?? randomUUID(),
    localId: jobb.localId,
    avdelingId: innlogget.avdeling.id,
    prosjektId: jobb.data.prosjektId,
    solgtAvProfilId: innlogget.profil.id,
    type: jobb.data.type,
    linjer,
    sum,
    status: 'sender',
    tripletexOrderId: null,
    signertNavn: jobb.data.signertNavn,
    signertTid: jobb.data.signatur ? jobb.opprettet : null,
    signatur: jobb.data.signatur,
    bilder: jobb.data.bilder,
    registreringMs: jobb.data.registreringMs,
    feilmelding: null,
    opprettet: fraFor?.opprettet ?? jobb.opprettet,
  };
  await db.lagreTillegg(rad);

  const feil = validerTillegg(rad);
  if (feil) {
    await db.lagreTillegg({ ...rad, status: 'feilet', feilmelding: feil });
    return { localId: jobb.localId, status: 'feilet', feilmelding: feil };
  }

  try {
    const ordreId = await tt.opprettOrdreMedLinjer({
      prosjektId: rad.prosjektId,
      tittel: rad.type === 'tillegg' ? 'Tillegg registrert i felt' : 'Materiell registrert i felt',
      linjer: linjer.map((l) => ({
        beskrivelse: l.beskrivelse,
        antall: l.antall,
        enhetspris: l.enhetspris,
        tripletexProductId: null,
      })),
    });

    await db.lagreTillegg({ ...rad, status: 'sendt', tripletexOrderId: ordreId });
    return { localId: jobb.localId, status: 'sendt', referanse: `Ordre ${ordreId}` };
  } catch (feilen) {
    const melding = lesbarFeil(feilen);
    await db.lagreTillegg({ ...rad, status: 'feilet', feilmelding: melding });
    return { localId: jobb.localId, status: 'feilet', feilmelding: melding };
  }
}

function validerTillegg(rad: Tillegg): string | null {
  if (rad.linjer.length === 0) return 'Tillegget har ingen linjer.';
  if (rad.sum <= 0) return 'Summen må være over null.';
  // Signaturen er obligatorisk på tilleggssalg. Materiell føres uten signatur.
  if (rad.type === 'tillegg' && (!rad.signatur || rad.signatur.length === 0)) {
    return 'Tillegget mangler kundens signatur.';
  }
  if (rad.type === 'tillegg' && !rad.signertNavn?.trim()) {
    return 'Tillegget mangler navnet på den som signerte.';
  }
  return null;
}

async function behandleSkjema(
  innlogget: Innlogget,
  jobb: Extract<KoJobb, { type: 'skjema' }>,
): Promise<KoResultat> {
  const db = butikk();
  const tt = tripletex();

  const fraFor = await db.utfylling(jobb.localId);
  if (fraFor?.status === 'sendt') {
    return { localId: jobb.localId, status: 'sendt', referanse: `Dokument ${fraFor.tripletexDocumentId}` };
  }

  const mal = await db.mal(jobb.data.malId);
  if (!mal) {
    return { localId: jobb.localId, status: 'feilet', feilmelding: 'Fant ikke skjemamalen.' };
  }

  const prosjekt = await tt.hentProsjekt(jobb.data.prosjektId);
  if (!prosjekt) {
    return { localId: jobb.localId, status: 'feilet', feilmelding: 'Fant ikke prosjektet i Tripletex.' };
  }

  const utfylling: SkjemaUtfylling = {
    id: fraFor?.id ?? randomUUID(),
    localId: jobb.localId,
    malId: mal.id,
    avdelingId: innlogget.avdeling.id,
    prosjektId: jobb.data.prosjektId,
    profilId: innlogget.profil.id,
    svar: jobb.data.svar,
    aiForslag: jobb.data.aiForslag,
    status: 'i_ko',
    signertNavn: jobb.data.signertNavn,
    signatur: jobb.data.signatur,
    tripletexDocumentId: null,
    feilmelding: null,
    opprettet: fraFor?.opprettet ?? jobb.opprettet,
    fullfort: new Date().toISOString(),
  };
  await db.lagreUtfylling(utfylling);

  const manglerPakrevd = mal.sporsmal
    .filter((s) => s.pakrevd)
    .filter((s) => {
      const v = utfylling.svar[s.id];
      return v === undefined || v === null || v === '';
    });
  if (manglerPakrevd.length > 0) {
    const melding = `Mangler svar på: ${manglerPakrevd.map((s) => s.tekst).join(', ')}`;
    await db.lagreUtfylling({ ...utfylling, status: 'feilet', feilmelding: melding });
    return { localId: jobb.localId, status: 'feilet', feilmelding: melding };
  }

  if (!utfylling.signatur || utfylling.signatur.length === 0) {
    const melding = 'Skjemaet må signeres før det kan sendes.';
    await db.lagreUtfylling({ ...utfylling, status: 'feilet', feilmelding: melding });
    return { localId: jobb.localId, status: 'feilet', feilmelding: melding };
  }

  const [timer, tillegg] = await Promise.all([
    tt.hentTimeforinger({
      ansattId: innlogget.profil.tripletexEmployeeId,
      fraDato: datoMinus(120),
      tilDato: idag(),
    }),
    db.alleTillegg({ prosjektId: jobb.data.prosjektId }),
  ]);

  const forteTimer = timer
    .filter((t) => t.prosjektId === jobb.data.prosjektId)
    .reduce((s, t) => s + t.timer, 0);

  const materiell = tillegg
    .flatMap((t) => t.linjer)
    .map((l) => `${l.antall} ${l.enhet} ${l.beskrivelse}`);

  const pdf = lagSkjemaPdf({
    mal,
    utfylling,
    prosjekt,
    avdelingNavn: innlogget.avdeling.navn,
    utfortAv: innlogget.profil.navn,
    forteTimer: Math.round(forteTimer * 10) / 10,
    materiell,
  });

  const filnavn = `${mal.navn.replace(/[^\wæøåÆØÅ -]/g, '')} ${prosjekt.nummer} ${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  try {
    const dokumentId = await tt.lastOppProsjektdokument({
      prosjektId: jobb.data.prosjektId,
      filnavn,
      pdf,
      beskrivelse: `${mal.navn} utfylt av ${innlogget.profil.navn}`,
    });

    await db.lagreUtfylling({ ...utfylling, status: 'sendt', tripletexDocumentId: dokumentId });
    return { localId: jobb.localId, status: 'sendt', referanse: `Lastet opp på prosjektet` };
  } catch (feilen) {
    const melding = lesbarFeil(feilen);
    await db.lagreUtfylling({ ...utfylling, status: 'feilet', feilmelding: melding });
    return { localId: jobb.localId, status: 'feilet', feilmelding: melding };
  }
}
