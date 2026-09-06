import type { SignaturStrok, TilleggLinje } from '@/lib/types';

/**
 * Jobbene som legges i køen på telefonen og sendes til serveren.
 *
 * `localId` lages på telefonen og følger jobben hele veien. Det er den som
 * gjør at et nytt forsøk aldri fører den samme registreringen to ganger.
 */

export interface TimeforingData {
  prosjektId: number;
  aktivitetId: number;
  dato: string;
  timer: number;
  kommentar: string | null;
  registreringMs: number | null;
}

export interface TilleggData {
  prosjektId: number;
  type: 'tillegg' | 'materiell';
  linjer: TilleggLinje[];
  signertNavn: string | null;
  signatur: SignaturStrok | null;
  bilder: string[];
  registreringMs: number | null;
}

export interface SkjemaData {
  malId: string;
  prosjektId: number;
  svar: Record<string, string | number | boolean | null>;
  aiForslag: Record<string, string>;
  signertNavn: string | null;
  signatur: SignaturStrok | null;
}

export type KoJobb =
  | { type: 'timeforing'; localId: string; opprettet: string; data: TimeforingData }
  | { type: 'tillegg'; localId: string; opprettet: string; data: TilleggData }
  | { type: 'skjema'; localId: string; opprettet: string; data: SkjemaData };

export type KoResultatStatus = 'sendt' | 'feilet';

export interface KoResultat {
  localId: string;
  status: KoResultatStatus;
  feilmelding?: string;
  /** Hva som ble opprettet i Tripletex – vises som kvittering. */
  referanse?: string;
}
