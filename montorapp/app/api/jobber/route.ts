import { krevInnlogget } from '@/lib/auth/session';
import { forteTimerPaDato, mineJobber } from '@/lib/jobber';
import { tripletex } from '@/lib/tripletex';
import { butikk } from '@/lib/store';
import { idag } from '@/lib/uke';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const innlogget = await krevInnlogget();
    const [jobber, aktiviteter, timerIDag, koJobber] = await Promise.all([
      mineJobber(innlogget),
      tripletex().hentAktiviteter(),
      forteTimerPaDato(innlogget, idag()),
      butikk().timejobber({ profilId: innlogget.profil.id, fraDato: idag() }),
    ]);

    return ok({
      jobber,
      aktiviteter,
      timerIDag,
      koIDag: koJobber.filter((j) => j.status !== 'sendt').length,
      dato: idag(),
    });
  } catch (feil) {
    return feilsvar(feil);
  }
}
