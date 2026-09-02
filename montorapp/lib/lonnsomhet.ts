import { butikk } from '@/lib/store';
import { tripletex } from '@/lib/tripletex';
import type { Avdeling, Prosjekt, ProsjektOkonomi } from '@/lib/types';

export interface LonnsomhetRad {
  prosjekt: Prosjekt;
  okonomi: ProsjektOkonomi;
  /** Førte timer mot estimat. Under 100 % betyr bedre enn tilbudet. */
  timerMotEstimat: number | null;
  estimerteTimer: number | null;
  tilleggSum: number;
}

/**
 * Lønnsomhet per prosjekt – kun for admin.
 *
 * Timene måles mot estimatet på jobben, ikke mot andre montører. Den som får de
 * vanskelige oppdragene skal ikke tape på det.
 */
export async function lonnsomhet(avdeling: Avdeling, antall = 10): Promise<LonnsomhetRad[]> {
  const tt = tripletex();
  const db = butikk();

  const prosjekter = await tt.hentProsjekter({
    avdelingDepartmentId: avdeling.tripletexDepartmentId,
  });

  const metaListe = await db.alleProsjektMeta(avdeling.id);
  const metaFor = new Map(metaListe.map((m) => [m.prosjektId, m]));

  const mine = prosjekter.filter((p) => {
    if (p.avdelingSlug) return p.avdelingSlug === avdeling.slug;
    const meta = metaFor.get(p.id);
    return !meta || meta.avdelingId === avdeling.id;
  });

  const okonomi = await tt.hentProsjektOkonomi(mine.map((p) => p.id));
  const okonomiFor = new Map(okonomi.map((o) => [o.prosjektId, o]));

  const tillegg = await db.alleTillegg({ avdelingId: avdeling.id });

  const rader: LonnsomhetRad[] = mine
    .map((prosjekt) => {
      const o = okonomiFor.get(prosjekt.id);
      if (!o) return null;
      const meta = metaFor.get(prosjekt.id);
      const estimerteTimer = meta?.estimerteTimer ?? prosjekt.budsjettTimer ?? o.budsjettTimer;

      return {
        prosjekt,
        okonomi: o,
        estimerteTimer,
        timerMotEstimat:
          estimerteTimer && estimerteTimer > 0
            ? Math.round((o.forteTimer / estimerteTimer) * 1000) / 10
            : null,
        tilleggSum: Math.round(
          tillegg.filter((t) => t.prosjektId === prosjekt.id).reduce((s, t) => s + t.sum, 0),
        ),
      } satisfies LonnsomhetRad;
    })
    .filter((r): r is LonnsomhetRad => r !== null)
    .filter((r) => r.okonomi.inntekt > 0);

  return rader.sort((a, b) => b.okonomi.dekningsgrad - a.okonomi.dekningsgrad).slice(0, antall);
}
