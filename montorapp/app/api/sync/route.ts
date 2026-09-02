import { krevInnlogget } from '@/lib/auth/session';
import { behandleKo } from '@/lib/sync';
import { feilsvar, ok } from '@/lib/api-svar';
import type { KoJobb } from '@/lib/offline/typer';

export const dynamic = 'force-dynamic';
/** Køen kan inneholde bilder og signaturer, så vi gir sendingen litt tid. */
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const innlogget = await krevInnlogget();
    const { jobber } = (await request.json()) as { jobber?: KoJobb[] };

    if (!Array.isArray(jobber) || jobber.length === 0) {
      return ok({ resultater: [] });
    }
    if (jobber.length > 50) {
      return ok({ resultater: await behandleKo(innlogget, jobber.slice(0, 50)) });
    }

    return ok({ resultater: await behandleKo(innlogget, jobber) });
  } catch (feil) {
    return feilsvar(feil);
  }
}
