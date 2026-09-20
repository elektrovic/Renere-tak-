import { butikk } from '@/lib/store';
import { tripletex } from '@/lib/tripletex';
import { forsteIManeden, idag } from '@/lib/uke';

export interface TopplisteRad {
  profilId: string;
  navn: string;
  farge: string;
  sumKr: number;
  antall: number;
  snitt: number;
  /** Antall ulike jobber montøren har ført timer på i perioden. */
  jobberTotalt: number;
  /** Antall av dem hvor det også ble solgt tillegg. */
  jobberMedTillegg: number;
  andelJobberMedTillegg: number;
  signert: number;
  usignert: number;
}

/**
 * Topplista for tilleggssalg.
 *
 * Den viktigste kolonnen er «andel jobber med tillegg». Uten den avgjør én stor
 * jobb hele lista, og montøren med mange små oppdrag kommer alltid dårlig ut.
 * Nevneren er antall ulike jobber montøren faktisk har ført timer på i perioden.
 */
export async function toppliste(
  avdelingId: string,
  fraDato = forsteIManeden(),
): Promise<TopplisteRad[]> {
  const db = butikk();
  const tt = tripletex();

  const [profiler, tillegg] = await Promise.all([
    db.profiler(),
    db.alleTillegg({ avdelingId, fraDato: `${fraDato}T00:00:00.000Z` }),
  ]);

  const montorer = profiler.filter(
    (p) => p.avdelingId === avdelingId && p.aktiv && p.rolle === 'montor',
  );

  const rader = await Promise.all(
    montorer.map(async (profil) => {
      const mine = tillegg.filter((t) => t.solgtAvProfilId === profil.id && t.status !== 'feilet');

      const timer = await tt.hentTimeforinger({
        ansattId: profil.tripletexEmployeeId,
        fraDato,
        tilDato: idag(),
      });

      const medTillegg = new Set(mine.map((t) => t.prosjektId));
      // Nevneren er alle jobbene montøren har vært på i perioden: både de han har
      // ført timer på, og de han har registrert tillegg på. Uten unionen kunne
      // andelen bli over 100 % tidlig i måneden, før timene var ført.
      const alleJobber = new Set<number>([...timer.map((t) => t.prosjektId), ...medTillegg]);
      const jobberTotalt = alleJobber.size;
      const jobberMedTillegg = medTillegg.size;
      const sumKr = mine.reduce((s, t) => s + t.sum, 0);

      return {
        profilId: profil.id,
        navn: profil.navn,
        farge: profil.kalenderfarge,
        sumKr: Math.round(sumKr),
        antall: mine.length,
        snitt: mine.length ? Math.round(sumKr / mine.length) : 0,
        jobberTotalt,
        jobberMedTillegg,
        andelJobberMedTillegg: jobberTotalt
          ? Math.round((jobberMedTillegg / jobberTotalt) * 1000) / 10
          : 0,
        signert: mine.filter((t) => t.signertTid).length,
        usignert: mine.filter((t) => !t.signertTid).length,
      } satisfies TopplisteRad;
    }),
  );

  return rader.sort(
    (a, b) => b.andelJobberMedTillegg - a.andelJobberMedTillegg || b.sumKr - a.sumKr,
  );
}
