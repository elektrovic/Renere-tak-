import { krevAdmin } from '@/lib/auth/session';
import { lonnsomhet } from '@/lib/lonnsomhet';
import { feilsvar, ok } from '@/lib/api-svar';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Dekningsgrad og prosjektøkonomi. Kun for admin – sjekken ligger her, ikke i menyen. */
export async function GET() {
  try {
    const { avdeling } = await krevAdmin();
    return ok({ rader: await lonnsomhet(avdeling, 10), avdeling: avdeling.navn });
  } catch (feil) {
    return feilsvar(feil);
  }
}
