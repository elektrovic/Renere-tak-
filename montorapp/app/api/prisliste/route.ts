import { krevInnlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { feilsvar, ok } from '@/lib/api-svar';

export async function GET() {
  try {
    const { avdeling } = await krevInnlogget();
    return ok({ prisliste: await butikk().prisliste(avdeling.id) });
  } catch (feil) {
    return feilsvar(feil);
  }
}
