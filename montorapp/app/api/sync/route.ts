import { krevInnlogget } from '@/lib/auth/session';
import { behandleKo } from '@/lib/sync';
import { feilsvar, ok } from '@/lib/api-svar';
import type { KoJobb } from '@/lib/offline/typer';

export const dynamic = 'force-dynamic';
/**
 * Vercel lar en forespørsel vare så lenge. Andre tjenester kutter etter ti
 * sekunder, og telefonen sender derfor i små puljer. Grensen her er bare et
 * sikkerhetsnett mot en klient som sender for mye på én gang.
 */
export const maxDuration = 60;
const MAKS_JOBBER = 10;

export async function POST(request: Request) {
  try {
    const innlogget = await krevInnlogget();
    const { jobber } = (await request.json()) as { jobber?: KoJobb[] };

    if (!Array.isArray(jobber) || jobber.length === 0) {
      return ok({ resultater: [] });
    }
    // Sender klienten flere enn vi tar imot, behandler vi de første og lar
    // resten være ubesvart. Telefonen ser det og sender dem i neste pulje.
    return ok({ resultater: await behandleKo(innlogget, jobber.slice(0, MAKS_JOBBER)) });
  } catch (feil) {
    return feilsvar(feil);
  }
}
