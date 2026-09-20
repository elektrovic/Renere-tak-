import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, supabaseConfigured } from '@/lib/config';
import { lesDataUrl } from '@/lib/bildedata';

/**
 * Lagring av bilder fra felt.
 *
 * Bildene skal IKKE ligge i databasen. En jobb med tre bilder er et par hundre
 * kilobyte, og på gratisnivået hos Supabase er databasen 500 MB mens fillageret
 * er 1 GB for seg selv. Bildene hører hjemme i fillageret; databasen lagrer bare
 * stien.
 *
 * Bøtta er privat. Bilder hentes med kortlevde, signerte lenker.
 */

export const BOTTE = 'tillegg-bilder';

export { lesDataUrl };

export interface Lagring {
  readonly demo: boolean;
  /** Tar en data-URL fra telefonen og returnerer stien som lagres i databasen. */
  lagreBilde(dataUrl: string, sti: string): Promise<string>;
  /** Kortlevd lenke til et lagret bilde, eller null hvis det ikke finnes. */
  hentLenke(sti: string, sekunder?: number): Promise<string | null>;
}

// --- Supabase ---------------------------------------------------------------

let klientRef: SupabaseClient | null = null;

function klient(): SupabaseClient {
  if (!klientRef) {
    klientRef = createClient(config.supabase.url!, config.supabase.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return klientRef;
}

const supabaseLagring: Lagring = {
  demo: false,

  async lagreBilde(dataUrl, sti) {
    const bilde = lesDataUrl(dataUrl);
    if (!bilde) throw new Error('Bildet kunne ikke leses.');

    const { error } = await klient()
      .storage.from(BOTTE)
      // Samme sti ved nytt forsøk skal overskrive, ikke lage en kopi til.
      .upload(sti, bilde.bytes, { contentType: bilde.type, upsert: true });

    if (error) throw new Error(`Fikk ikke lagret bildet: ${error.message}`);
    return sti;
  },

  async hentLenke(sti, sekunder = 300) {
    const { data, error } = await klient().storage.from(BOTTE).createSignedUrl(sti, sekunder);
    if (error || !data) return null;
    return data.signedUrl;
  },
};

// --- Minne (demomodus) ------------------------------------------------------

const globalRef = globalThis as unknown as { __montorappBilder?: Map<string, string> };

function minnelager(): Map<string, string> {
  if (!globalRef.__montorappBilder) globalRef.__montorappBilder = new Map();
  return globalRef.__montorappBilder;
}

const minneLagring: Lagring = {
  demo: true,

  async lagreBilde(dataUrl, sti) {
    if (!lesDataUrl(dataUrl)) throw new Error('Bildet kunne ikke leses.');
    minnelager().set(sti, dataUrl);
    return sti;
  },

  async hentLenke(sti) {
    return minnelager().get(sti) ?? null;
  },
};

/** Én inngang til bildelagringen for hele appen. */
export function lagring(): Lagring {
  return supabaseConfigured ? supabaseLagring : minneLagring;
}

/**
 * Lagrer bildene som fulgte med et tillegg, og returnerer stiene.
 * Stiene er forutsigbare, slik at et nytt forsøk overskriver i stedet for å
 * lage dubletter. Et bilde som ikke lar seg lagre skal ikke velte hele
 * tillegget – da mister vi heller bildet enn salget.
 */
export async function lagreTilleggsbilder(
  bilder: string[],
  valg: { avdelingId: string; localId: string },
): Promise<{ stier: string[]; feilet: number }> {
  const lager = lagring();
  const stier: string[] = [];
  let feilet = 0;

  for (const [i, bilde] of bilder.entries()) {
    // Allerede lagret (et nytt forsøk på en jobb som delvis gikk gjennom).
    if (!bilde.startsWith('data:')) {
      stier.push(bilde);
      continue;
    }
    try {
      stier.push(
        await lager.lagreBilde(bilde, `${valg.avdelingId}/${valg.localId}/${i + 1}.jpg`),
      );
    } catch (feil) {
      console.error('Fikk ikke lagret bilde', feil);
      feilet++;
    }
  }

  return { stier, feilet };
}
