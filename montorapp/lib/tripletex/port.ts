import type { Aktivitet, Prosjekt, ProsjektOkonomi, Timeforing } from '@/lib/types';

export interface NyTimeforing {
  prosjektId: number;
  aktivitetId: number;
  ansattId: number;
  dato: string;
  timer: number;
  kommentar?: string | null;
}

export interface NyOrdrelinje {
  beskrivelse: string;
  antall: number;
  enhetspris: number;
  tripletexProductId?: number | null;
}

export interface NyOrdre {
  prosjektId: number;
  tittel: string;
  linjer: NyOrdrelinje[];
}

/**
 * Alt appen trenger fra Tripletex, samlet i ett grensesnitt.
 *
 * To implementasjoner: `ekteTripletex` (API-kall) og `demoTripletex` (testdata).
 * Resten av koden ser bare dette grensesnittet, og trenger aldri vite hvilken
 * som er i bruk.
 */
export interface TripletexPort {
  readonly demo: boolean;

  hentProsjekter(valg?: { avdelingDepartmentId?: number | null }): Promise<Prosjekt[]>;
  hentProsjekt(id: number): Promise<Prosjekt | null>;
  hentAktiviteter(): Promise<Aktivitet[]>;

  hentTimeforinger(valg: {
    ansattId: number;
    fraDato: string;
    tilDato: string;
  }): Promise<Timeforing[]>;

  skrivTimeforinger(rader: NyTimeforing[]): Promise<number[]>;

  /** Sjekker om måneden er godkjent/låst, slik at vi kan si fra før vi prøver å skrive. */
  manedErLast(valg: { ansattId: number; dato: string }): Promise<boolean>;

  opprettOrdreMedLinjer(ordre: NyOrdre): Promise<number>;

  lastOppProsjektdokument(valg: {
    prosjektId: number;
    filnavn: string;
    pdf: Uint8Array;
    beskrivelse?: string;
  }): Promise<number>;

  hentProsjektOkonomi(prosjektIder: number[]): Promise<ProsjektOkonomi[]>;
}
