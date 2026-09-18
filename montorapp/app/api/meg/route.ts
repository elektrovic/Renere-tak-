import { oppsettStatus } from '@/lib/config';
import { krevInnlogget, offentlig } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { datoMinus } from '@/lib/uke';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profil, avdeling } = await krevInnlogget();
    const db = butikk();

    const [jobber, tillegg] = await Promise.all([
      db.timejobber({ profilId: profil.id, fraDato: datoMinus(90) }),
      db.alleTillegg({ profilId: profil.id }),
    ]);

    // Hvor lang tid registreringene faktisk tar. Dette er måltallet vi bruker
    // for å se om appen sparer tid sammenliknet med dagens rutine.
    const tider = [
      ...jobber.map((j) => j.registreringMs),
      ...tillegg.map((t) => t.registreringMs),
    ].filter((t): t is number => typeof t === 'number' && t > 0);

    return ok({
      profil: offentlig(profil),
      avdeling,
      oppsett: oppsettStatus,
      statistikk: {
        antallRegistreringer: tider.length,
        snittSekunder: tider.length
          ? Math.round(tider.reduce((s, t) => s + t, 0) / tider.length / 1000)
          : null,
        timeforingerSiste90: jobber.length,
        tilleggTotalt: tillegg.length,
      },
    });
  } catch (feil) {
    return feilsvar(feil);
  }
}
