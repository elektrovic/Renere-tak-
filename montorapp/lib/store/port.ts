import type {
  Avdeling,
  KalenderHendelse,
  Maal,
  PrislinjeMal,
  Profil,
  ProsjektMeta,
  SkjemaMal,
  SkjemaUtfylling,
  Tillegg,
  TimeforingsJobb,
} from '@/lib/types';

/**
 * Vår egen database – kun det Tripletex ikke har.
 *
 * To implementasjoner: Supabase (ekte) og minne (demo). Resten av appen ser
 * bare dette grensesnittet.
 */
export interface Butikk {
  readonly demo: boolean;

  avdelinger(): Promise<Avdeling[]>;
  avdeling(id: string): Promise<Avdeling | null>;

  profiler(): Promise<Profil[]>;
  profil(id: string): Promise<Profil | null>;
  profilByEpost(epost: string): Promise<Profil | null>;
  lagreProfil(profil: Profil): Promise<void>;

  prisliste(avdelingId: string): Promise<PrislinjeMal[]>;
  lagrePrislinje(linje: PrislinjeMal): Promise<void>;
  slettPrislinje(id: string): Promise<void>;

  /** Upsert på localId, slik at et nytt forsøk fra telefonen aldri dobbeltfører. */
  lagreTimejobb(jobb: TimeforingsJobb): Promise<TimeforingsJobb>;
  timejobb(localId: string): Promise<TimeforingsJobb | null>;
  timejobber(filter: { profilId?: string; avdelingId?: string; fraDato?: string }): Promise<TimeforingsJobb[]>;

  lagreTillegg(tillegg: Tillegg): Promise<Tillegg>;
  tilleggByLocalId(localId: string): Promise<Tillegg | null>;
  alleTillegg(filter: { avdelingId?: string; profilId?: string; fraDato?: string; prosjektId?: number }): Promise<Tillegg[]>;

  prosjektMeta(prosjektId: number): Promise<ProsjektMeta | null>;
  alleProsjektMeta(avdelingId?: string): Promise<ProsjektMeta[]>;
  lagreProsjektMeta(meta: ProsjektMeta): Promise<void>;

  maler(avdelingId?: string): Promise<SkjemaMal[]>;
  mal(id: string): Promise<SkjemaMal | null>;
  lagreMal(mal: SkjemaMal): Promise<void>;

  lagreUtfylling(utfylling: SkjemaUtfylling): Promise<SkjemaUtfylling>;
  utfylling(id: string): Promise<SkjemaUtfylling | null>;
  utfyllinger(filter: { profilId?: string; avdelingId?: string; prosjektId?: number }): Promise<SkjemaUtfylling[]>;

  kalender(filter: { avdelingId?: string; fra?: string; til?: string }): Promise<KalenderHendelse[]>;
  lagreHendelse(hendelse: KalenderHendelse): Promise<void>;
  slettHendelse(id: string): Promise<void>;

  maal(avdelingId: string, uke?: string): Promise<Maal[]>;
  lagreMaal(maal: Maal): Promise<void>;
  slettMaal(id: string): Promise<void>;
}
