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
import type { Butikk } from './port';
import {
  seedAvdelinger,
  seedKalender,
  seedMaal,
  seedMaler,
  seedPrisliste,
  seedProfiler,
  seedProsjektMeta,
  seedTillegg,
} from './seed';

/**
 * Database i minnet. Brukes i demomodus, altså når Supabase ikke er satt opp.
 *
 * Merk: data forsvinner når serveren starter på nytt. Det er greit for testing,
 * men appen skal kobles til Supabase før den tas i bruk på ekte.
 */

interface Data {
  avdelinger: Avdeling[];
  profiler: Profil[];
  prisliste: PrislinjeMal[];
  timejobber: TimeforingsJobb[];
  tillegg: Tillegg[];
  prosjektMeta: ProsjektMeta[];
  maler: SkjemaMal[];
  utfyllinger: SkjemaUtfylling[];
  kalender: KalenderHendelse[];
  maal: Maal[];
}

// Lagres på globalThis slik at data overlever hot reload under utvikling.
const globalRef = globalThis as unknown as { __montorappData?: Data };

function data(): Data {
  if (!globalRef.__montorappData) {
    const profiler = seedProfiler();
    globalRef.__montorappData = {
      avdelinger: seedAvdelinger(),
      profiler,
      prisliste: seedPrisliste(),
      timejobber: [],
      tillegg: seedTillegg(profiler),
      prosjektMeta: seedProsjektMeta(),
      maler: seedMaler(),
      utfyllinger: [],
      kalender: seedKalender(profiler),
      maal: seedMaal(),
    };
  }
  return globalRef.__montorappData;
}

function erstatt<T>(liste: T[], ny: T, likhet: (a: T) => boolean): T {
  const i = liste.findIndex(likhet);
  if (i >= 0) liste[i] = ny;
  else liste.push(ny);
  return ny;
}

export const minneButikk: Butikk = {
  demo: true,

  async avdelinger() {
    return data().avdelinger.filter((a) => a.aktiv);
  },
  async avdeling(id) {
    return data().avdelinger.find((a) => a.id === id) ?? null;
  },

  async profiler() {
    return data().profiler;
  },
  async profil(id) {
    return data().profiler.find((p) => p.id === id) ?? null;
  },
  async profilByEpost(epost) {
    const e = epost.trim().toLowerCase();
    return data().profiler.find((p) => p.epost.toLowerCase() === e) ?? null;
  },
  async lagreProfil(profil) {
    erstatt(data().profiler, profil, (p) => p.id === profil.id);
  },

  async prisliste(avdelingId) {
    return data()
      .prisliste.filter((p) => p.avdelingId === avdelingId && p.aktiv)
      .sort((a, b) => a.sortering - b.sortering);
  },
  async lagrePrislinje(linje) {
    erstatt(data().prisliste, linje, (p) => p.id === linje.id);
  },
  async slettPrislinje(id) {
    const d = data();
    d.prisliste = d.prisliste.filter((p) => p.id !== id);
  },

  async lagreTimejobb(jobb) {
    return erstatt(data().timejobber, jobb, (j) => j.localId === jobb.localId);
  },
  async timejobb(localId) {
    return data().timejobber.find((j) => j.localId === localId) ?? null;
  },
  async timejobber(filter) {
    return data().timejobber.filter(
      (j) =>
        (!filter.profilId || j.profilId === filter.profilId) &&
        (!filter.avdelingId || j.avdelingId === filter.avdelingId) &&
        (!filter.fraDato || j.dato >= filter.fraDato),
    );
  },

  async lagreTillegg(tillegg) {
    return erstatt(data().tillegg, tillegg, (t) => t.localId === tillegg.localId);
  },
  async tilleggByLocalId(localId) {
    return data().tillegg.find((t) => t.localId === localId) ?? null;
  },
  async alleTillegg(filter) {
    return data()
      .tillegg.filter(
        (t) =>
          (!filter.avdelingId || t.avdelingId === filter.avdelingId) &&
          (!filter.profilId || t.solgtAvProfilId === filter.profilId) &&
          (!filter.prosjektId || t.prosjektId === filter.prosjektId) &&
          (!filter.fraDato || t.opprettet >= filter.fraDato),
      )
      .sort((a, b) => b.opprettet.localeCompare(a.opprettet));
  },

  async prosjektMeta(prosjektId) {
    return data().prosjektMeta.find((m) => m.prosjektId === prosjektId) ?? null;
  },
  async alleProsjektMeta(avdelingId) {
    return data().prosjektMeta.filter((m) => !avdelingId || m.avdelingId === avdelingId);
  },
  async lagreProsjektMeta(meta) {
    erstatt(data().prosjektMeta, meta, (m) => m.prosjektId === meta.prosjektId);
  },

  async maler(avdelingId) {
    return data().maler.filter((m) => m.aktiv && (!avdelingId || m.avdelingId === avdelingId));
  },
  async mal(id) {
    return data().maler.find((m) => m.id === id) ?? null;
  },
  async lagreMal(mal) {
    erstatt(data().maler, mal, (m) => m.id === mal.id);
  },

  async lagreUtfylling(utfylling) {
    return erstatt(data().utfyllinger, utfylling, (u) => u.localId === utfylling.localId);
  },
  async utfylling(id) {
    return data().utfyllinger.find((u) => u.id === id || u.localId === id) ?? null;
  },
  async utfyllinger(filter) {
    return data()
      .utfyllinger.filter(
        (u) =>
          (!filter.profilId || u.profilId === filter.profilId) &&
          (!filter.avdelingId || u.avdelingId === filter.avdelingId) &&
          (!filter.prosjektId || u.prosjektId === filter.prosjektId),
      )
      .sort((a, b) => b.opprettet.localeCompare(a.opprettet));
  },

  async kalender(filter) {
    return data()
      .kalender.filter(
        (h) =>
          (!filter.avdelingId || h.avdelingId === filter.avdelingId) &&
          (!filter.fra || h.slutt >= filter.fra) &&
          (!filter.til || h.start <= filter.til),
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  },
  async lagreHendelse(hendelse) {
    erstatt(data().kalender, hendelse, (h) => h.id === hendelse.id);
  },
  async slettHendelse(id) {
    const d = data();
    d.kalender = d.kalender.filter((h) => h.id !== id);
  },

  async maal(avdelingId, uke) {
    return data().maal.filter((m) => m.avdelingId === avdelingId && (!uke || m.uke === uke));
  },
  async lagreMaal(maal) {
    erstatt(data().maal, maal, (m) => m.id === maal.id);
  },
  async slettMaal(id) {
    const d = data();
    d.maal = d.maal.filter((m) => m.id !== id);
  },
};
