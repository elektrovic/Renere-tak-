import { krevInnlogget } from '@/lib/auth/session';
import { toppliste } from '@/lib/toppliste';
import { butikk } from '@/lib/store';
import { forsteIManeden, isoUke } from '@/lib/uke';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { avdeling, profil } = await krevInnlogget();
    const [rader, maal] = await Promise.all([
      toppliste(avdeling.id, forsteIManeden()),
      butikk().maal(avdeling.id, isoUke()),
    ]);
    return ok({ rader, maal, megId: profil.id, avdeling: avdeling.navn });
  } catch (feil) {
    return feilsvar(feil);
  }
}
