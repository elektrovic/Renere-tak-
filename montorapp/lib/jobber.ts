import { tripletex } from '@/lib/tripletex';
import { butikk } from '@/lib/store';
import { datoMinus, idag } from '@/lib/uke';
import type { Innlogget } from '@/lib/auth/session';
import type { Prosjekt } from '@/lib/types';

export interface JobbKort {
  prosjekt: Prosjekt;
  /** Siste dagen montøren førte timer på jobben. */
  sisteDato: string | null;
  timerSiste30: number;
  /** Det montøren pleier å føre på denne jobben – brukes som forslag. */
  vanligTimer: number | null;
  vanligAktivitetId: number | null;
  merke: 'i_dag' | 'i_gar' | 'nylig' | null;
}

function median(tall: number[]): number | null {
  if (tall.length === 0) return null;
  const sortert = [...tall].sort((a, b) => a - b);
  const midt = Math.floor(sortert.length / 2);
  const m = sortert.length % 2 ? sortert[midt] : (sortert[midt - 1] + sortert[midt]) / 2;
  return Math.round(m * 2) / 2;
}

function hyppigste(tall: number[]): number | null {
  if (tall.length === 0) return null;
  const antall = new Map<number, number>();
  for (const t of tall) antall.set(t, (antall.get(t) ?? 0) + 1);
  return [...antall.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Bygger montørens jobbliste.
 *
 * Dagens og gårsdagens prosjekter havner øverst, fordi det er der han
 * nesten alltid skal føre. Resten av avdelingens aktive prosjekter kommer under,
 * slik at han også finner en jobb han ikke har vært på før.
 */
export async function mineJobber(innlogget: Innlogget): Promise<JobbKort[]> {
  const tt = tripletex();
  const db = butikk();

  const [prosjekter, timer, metaListe] = await Promise.all([
    tt.hentProsjekter({ avdelingDepartmentId: innlogget.avdeling.tripletexDepartmentId }),
    tt.hentTimeforinger({
      ansattId: innlogget.profil.tripletexEmployeeId,
      fraDato: datoMinus(45),
      tilDato: idag(),
    }),
    db.alleProsjektMeta(innlogget.avdeling.id),
  ]);

  // I demomodus har prosjektene en avdeling-slug. Mot ekte Tripletex filtrerer
  // vi på avdelings-id i selve kallet, og bruker prosjekt_meta som reserve.
  const metaFor = new Map(metaListe.map((m) => [m.prosjektId, m]));
  const mineAvdelingProsjekter = prosjekter.filter((p) => {
    if (p.avdelingSlug) return p.avdelingSlug === innlogget.avdeling.slug;
    const meta = metaFor.get(p.id);
    return !meta || meta.avdelingId === innlogget.avdeling.id;
  });

  const iDag = idag();
  const iGar = datoMinus(1);
  const siste30 = datoMinus(30);

  const kort: JobbKort[] = mineAvdelingProsjekter.map((prosjekt) => {
    const mine = timer.filter((t) => t.prosjektId === prosjekt.id);
    const sisteDato = mine.length ? mine.map((t) => t.dato).sort().at(-1)! : null;

    return {
      prosjekt,
      sisteDato,
      timerSiste30: Math.round(
        mine.filter((t) => t.dato >= siste30).reduce((s, t) => s + t.timer, 0) * 10,
      ) / 10,
      vanligTimer: median(mine.map((t) => t.timer)),
      vanligAktivitetId: hyppigste(mine.map((t) => t.aktivitetId)),
      merke: sisteDato === iDag ? 'i_dag' : sisteDato === iGar ? 'i_gar' : sisteDato ? 'nylig' : null,
    };
  });

  const vekt = (k: JobbKort) => (k.merke === 'i_dag' ? 0 : k.merke === 'i_gar' ? 1 : k.merke === 'nylig' ? 2 : 3);

  return kort.sort((a, b) => {
    const v = vekt(a) - vekt(b);
    if (v !== 0) return v;
    if (a.sisteDato && b.sisteDato && a.sisteDato !== b.sisteDato) {
      return b.sisteDato.localeCompare(a.sisteDato);
    }
    return a.prosjekt.navn.localeCompare(b.prosjekt.navn, 'nb');
  });
}

/** Timer montøren allerede har ført på en gitt dato – brukes til dagsvarselet. */
export async function forteTimerPaDato(innlogget: Innlogget, dato: string): Promise<number> {
  const timer = await tripletex().hentTimeforinger({
    ansattId: innlogget.profil.tripletexEmployeeId,
    fraDato: dato,
    tilDato: dato,
  });
  return Math.round(timer.reduce((s, t) => s + t.timer, 0) * 10) / 10;
}
