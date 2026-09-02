import { krevInnlogget } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { feilsvar, ok } from '@/lib/api-svar';

export async function GET() {
  try {
    const { avdeling } = await krevInnlogget();
    return ok({ maler: await butikk().maler(avdeling.id) });
  } catch (feil) {
    return feilsvar(feil);
  }
}
