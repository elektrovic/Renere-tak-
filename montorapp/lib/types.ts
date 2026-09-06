/** Felles typer for hele appen. */

export type Rolle = 'montor' | 'admin';

export interface Avdeling {
  id: string;
  slug: string;
  navn: string;
  /** Fylles ut hvis avdelingen er et eget selskap i Tripletex. */
  tripletexCompanyId: string | null;
  /** Fylles ut hvis avdelingen er en avdeling inne i ett Tripletex-selskap. */
  tripletexDepartmentId: number | null;
  farge: string;
  aktiv: boolean;
}

export interface Profil {
  id: string;
  avdelingId: string;
  tripletexEmployeeId: number;
  navn: string;
  epost: string;
  /** scrypt-hash av PIN-koden. Aldri sendt til nettleseren. */
  pinHash: string;
  rolle: Rolle;
  kalenderfarge: string;
  konsernAdmin: boolean;
  aktiv: boolean;
}

/** Profil slik den kan sendes til nettleseren. */
export type OffentligProfil = Omit<Profil, 'pinHash'>;

// --- Tripletex-speil (vi lagrer ikke disse, vi leser dem) -------------------

export interface Prosjekt {
  id: number;
  nummer: string;
  navn: string;
  kunde: string;
  adresse: string | null;
  avdelingSlug: string | null;
  aktiv: boolean;
  /** Fastpris fra Tripletex – brukes som utgangspunkt for hva som er tillegg. */
  fastpris: number | null;
  budsjettTimer: number | null;
}

export interface Aktivitet {
  id: number;
  navn: string;
}

export interface Timeforing {
  id: number;
  prosjektId: number;
  aktivitetId: number;
  ansattId: number;
  dato: string;
  timer: number;
  kommentar: string | null;
}

export interface ProsjektOkonomi {
  prosjektId: number;
  inntekt: number;
  kostnad: number;
  dekningsgrad: number;
  fastpris: number | null;
  forteTimer: number;
  budsjettTimer: number | null;
}

// --- Vår egen database -----------------------------------------------------

export type KoStatus = 'i_ko' | 'sender' | 'sendt' | 'feilet';

export interface TimeforingsJobb {
  id: string;
  localId: string;
  profilId: string;
  avdelingId: string;
  prosjektId: number;
  aktivitetId: number;
  dato: string;
  timer: number;
  kommentar: string | null;
  status: KoStatus;
  tripletexEntryId: number | null;
  registreringMs: number | null;
  feilmelding: string | null;
  opprettet: string;
  sendt: string | null;
}

export interface ProsjektMeta {
  prosjektId: number;
  avdelingId: string;
  baselineSum: number | null;
  baselineKilde: 'tripletex' | 'manuell' | 'kobbr' | null;
  estimerteTimer: number | null;
  notat: string | null;
}

export interface PrislinjeMal {
  id: string;
  avdelingId: string;
  tripletexProductId: number | null;
  navn: string;
  enhet: string;
  pris: number;
  sortering: number;
  aktiv: boolean;
}

export interface TilleggLinje {
  id: string;
  beskrivelse: string;
  antall: number;
  enhet: string;
  enhetspris: number;
  prislinjeId: string | null;
}

/** Signatur lagres som strektegning (punkter), ikke som bilde.
 *  Det gjør at den kan tegnes både på skjerm og rett inn i PDF-en. */
export type SignaturStrok = Array<Array<[number, number]>>;

export interface Tillegg {
  id: string;
  localId: string;
  avdelingId: string;
  prosjektId: number;
  solgtAvProfilId: string;
  type: 'tillegg' | 'materiell';
  linjer: TilleggLinje[];
  sum: number;
  status: KoStatus;
  tripletexOrderId: number | null;
  signertNavn: string | null;
  signertTid: string | null;
  signatur: SignaturStrok | null;
  bilder: string[];
  registreringMs: number | null;
  feilmelding: string | null;
  opprettet: string;
}

export type SkjemaType = 'sluttkontroll' | 'sja' | 'egenkontroll';

export type SporsmalType = 'ja_nei' | 'ja_nei_ia' | 'tall' | 'tekst' | 'valg' | 'ai_tekst';

export interface Sporsmal {
  id: string;
  tekst: string;
  type: SporsmalType;
  hjelpetekst?: string;
  valg?: string[];
  enhet?: string;
  pakrevd: boolean;
  /** For ai_tekst: hva AI-en skal skrive utkast til. */
  aiOppgave?: string;
}

export interface SkjemaMal {
  id: string;
  avdelingId: string;
  type: SkjemaType;
  navn: string;
  versjon: number;
  sporsmal: Sporsmal[];
  aktiv: boolean;
}

export interface SkjemaUtfylling {
  id: string;
  localId: string;
  malId: string;
  avdelingId: string;
  prosjektId: number;
  profilId: string;
  svar: Record<string, string | number | boolean | null>;
  aiForslag: Record<string, string>;
  status: 'kladd' | 'i_ko' | 'sendt' | 'feilet';
  signertNavn: string | null;
  signatur: SignaturStrok | null;
  tripletexDocumentId: number | null;
  feilmelding: string | null;
  opprettet: string;
  fullfort: string | null;
}

export interface KalenderHendelse {
  id: string;
  avdelingId: string;
  profilId: string;
  prosjektId: number | null;
  tittel: string;
  start: string;
  slutt: string;
  notat: string | null;
}

export interface Maal {
  id: string;
  avdelingId: string;
  uke: string;
  type: 'tilleggssalg_kr' | 'antall_tillegg' | 'andel_jobber_med_tillegg';
  malverdi: number;
  beskrivelse: string;
  settAv: string;
}
