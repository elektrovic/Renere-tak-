import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/lib/config';
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

/**
 * Ekte database (Supabase/Postgres).
 *
 * Vi bruker tjenestenøkkelen, som bare finnes på serveren. Tabellene har
 * radsikkerhet slått på og ingen åpne regler, slik at en nøkkel på avveie i
 * nettleseren ikke gir tilgang til noe. All rollesjekk skjer i API-rutene våre.
 */

let klientRef: SupabaseClient | null = null;

function klient(): SupabaseClient {
  if (!klientRef) {
    klientRef = createClient(config.supabase.url!, config.supabase.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return klientRef;
}

function sjekk<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Databasefeil: ${res.error.message}`);
  return res.data as T;
}

type Rad = Record<string, any>;

const tilAvdeling = (r: Rad): Avdeling => ({
  id: r.id,
  slug: r.slug,
  navn: r.navn,
  tripletexCompanyId: r.tripletex_company_id,
  tripletexDepartmentId: r.tripletex_department_id,
  farge: r.farge,
  aktiv: r.aktiv,
});

const tilProfil = (r: Rad): Profil => ({
  id: r.id,
  avdelingId: r.avdeling_id,
  tripletexEmployeeId: r.tripletex_employee_id,
  navn: r.navn,
  epost: r.epost,
  pinHash: r.pin_hash,
  rolle: r.rolle,
  kalenderfarge: r.kalenderfarge,
  konsernAdmin: r.konsern_admin,
  aktiv: r.aktiv,
});

const fraProfil = (p: Profil): Rad => ({
  id: p.id,
  avdeling_id: p.avdelingId,
  tripletex_employee_id: p.tripletexEmployeeId,
  navn: p.navn,
  epost: p.epost,
  pin_hash: p.pinHash,
  rolle: p.rolle,
  kalenderfarge: p.kalenderfarge,
  konsern_admin: p.konsernAdmin,
  aktiv: p.aktiv,
});

const tilPrislinje = (r: Rad): PrislinjeMal => ({
  id: r.id,
  avdelingId: r.avdeling_id,
  tripletexProductId: r.tripletex_product_id,
  navn: r.navn,
  enhet: r.enhet,
  pris: Number(r.pris),
  sortering: r.sortering,
  aktiv: r.aktiv,
});

const fraPrislinje = (p: PrislinjeMal): Rad => ({
  id: p.id,
  avdeling_id: p.avdelingId,
  tripletex_product_id: p.tripletexProductId,
  navn: p.navn,
  enhet: p.enhet,
  pris: p.pris,
  sortering: p.sortering,
  aktiv: p.aktiv,
});

const tilTimejobb = (r: Rad): TimeforingsJobb => ({
  id: r.id,
  localId: r.local_id,
  profilId: r.profil_id,
  avdelingId: r.avdeling_id,
  prosjektId: r.prosjekt_id,
  aktivitetId: r.aktivitet_id,
  dato: r.dato,
  timer: Number(r.timer),
  kommentar: r.kommentar,
  status: r.status,
  tripletexEntryId: r.tripletex_entry_id,
  registreringMs: r.registrering_ms,
  feilmelding: r.feilmelding,
  opprettet: r.opprettet,
  sendt: r.sendt,
});

const fraTimejobb = (j: TimeforingsJobb): Rad => ({
  id: j.id,
  local_id: j.localId,
  profil_id: j.profilId,
  avdeling_id: j.avdelingId,
  prosjekt_id: j.prosjektId,
  aktivitet_id: j.aktivitetId,
  dato: j.dato,
  timer: j.timer,
  kommentar: j.kommentar,
  status: j.status,
  tripletex_entry_id: j.tripletexEntryId,
  registrering_ms: j.registreringMs,
  feilmelding: j.feilmelding,
  opprettet: j.opprettet,
  sendt: j.sendt,
});

const tilTillegg = (r: Rad): Tillegg => ({
  id: r.id,
  localId: r.local_id,
  avdelingId: r.avdeling_id,
  prosjektId: r.prosjekt_id,
  solgtAvProfilId: r.solgt_av_profil_id,
  type: r.type,
  linjer: r.linjer ?? [],
  sum: Number(r.sum),
  status: r.status,
  tripletexOrderId: r.tripletex_order_id,
  signertNavn: r.signert_navn,
  signertTid: r.signert_tid,
  signatur: r.signatur,
  bilder: r.bilder ?? [],
  registreringMs: r.registrering_ms,
  feilmelding: r.feilmelding,
  opprettet: r.opprettet,
});

const fraTillegg = (t: Tillegg): Rad => ({
  id: t.id,
  local_id: t.localId,
  avdeling_id: t.avdelingId,
  prosjekt_id: t.prosjektId,
  solgt_av_profil_id: t.solgtAvProfilId,
  type: t.type,
  linjer: t.linjer,
  sum: t.sum,
  status: t.status,
  tripletex_order_id: t.tripletexOrderId,
  signert_navn: t.signertNavn,
  signert_tid: t.signertTid,
  signatur: t.signatur,
  bilder: t.bilder,
  registrering_ms: t.registreringMs,
  feilmelding: t.feilmelding,
  opprettet: t.opprettet,
});

const tilMeta = (r: Rad): ProsjektMeta => ({
  prosjektId: r.prosjekt_id,
  avdelingId: r.avdeling_id,
  baselineSum: r.baseline_sum === null ? null : Number(r.baseline_sum),
  baselineKilde: r.baseline_kilde,
  estimerteTimer: r.estimerte_timer === null ? null : Number(r.estimerte_timer),
  notat: r.notat,
});

const fraMeta = (m: ProsjektMeta): Rad => ({
  prosjekt_id: m.prosjektId,
  avdeling_id: m.avdelingId,
  baseline_sum: m.baselineSum,
  baseline_kilde: m.baselineKilde,
  estimerte_timer: m.estimerteTimer,
  notat: m.notat,
});

const tilMal = (r: Rad): SkjemaMal => ({
  id: r.id,
  avdelingId: r.avdeling_id,
  type: r.type,
  navn: r.navn,
  versjon: r.versjon,
  sporsmal: r.sporsmal ?? [],
  aktiv: r.aktiv,
});

const fraMal = (m: SkjemaMal): Rad => ({
  id: m.id,
  avdeling_id: m.avdelingId,
  type: m.type,
  navn: m.navn,
  versjon: m.versjon,
  sporsmal: m.sporsmal,
  aktiv: m.aktiv,
});

const tilUtfylling = (r: Rad): SkjemaUtfylling => ({
  id: r.id,
  localId: r.local_id,
  malId: r.mal_id,
  avdelingId: r.avdeling_id,
  prosjektId: r.prosjekt_id,
  profilId: r.profil_id,
  svar: r.svar ?? {},
  aiForslag: r.ai_forslag ?? {},
  status: r.status,
  signertNavn: r.signert_navn,
  signatur: r.signatur,
  tripletexDocumentId: r.tripletex_document_id,
  feilmelding: r.feilmelding,
  opprettet: r.opprettet,
  fullfort: r.fullfort,
});

const fraUtfylling = (u: SkjemaUtfylling): Rad => ({
  id: u.id,
  local_id: u.localId,
  mal_id: u.malId,
  avdeling_id: u.avdelingId,
  prosjekt_id: u.prosjektId,
  profil_id: u.profilId,
  svar: u.svar,
  ai_forslag: u.aiForslag,
  status: u.status,
  signert_navn: u.signertNavn,
  signatur: u.signatur,
  tripletex_document_id: u.tripletexDocumentId,
  feilmelding: u.feilmelding,
  opprettet: u.opprettet,
  fullfort: u.fullfort,
});

const tilHendelse = (r: Rad): KalenderHendelse => ({
  id: r.id,
  avdelingId: r.avdeling_id,
  profilId: r.profil_id,
  prosjektId: r.prosjekt_id,
  tittel: r.tittel,
  start: r.start_tid,
  slutt: r.slutt_tid,
  notat: r.notat,
});

const fraHendelse = (h: KalenderHendelse): Rad => ({
  id: h.id,
  avdeling_id: h.avdelingId,
  profil_id: h.profilId,
  prosjekt_id: h.prosjektId,
  tittel: h.tittel,
  start_tid: h.start,
  slutt_tid: h.slutt,
  notat: h.notat,
});

const tilMaal = (r: Rad): Maal => ({
  id: r.id,
  avdelingId: r.avdeling_id,
  uke: r.uke,
  type: r.type,
  malverdi: Number(r.malverdi),
  beskrivelse: r.beskrivelse,
  settAv: r.satt_av,
});

const fraMaal = (m: Maal): Rad => ({
  id: m.id,
  avdeling_id: m.avdelingId,
  uke: m.uke,
  type: m.type,
  malverdi: m.malverdi,
  beskrivelse: m.beskrivelse,
  satt_av: m.settAv,
});

export const supabaseButikk: Butikk = {
  demo: false,

  async avdelinger() {
    const rader = sjekk(await klient().from('avdelinger').select('*').eq('aktiv', true));
    return rader.map(tilAvdeling);
  },
  async avdeling(id) {
    const rader = sjekk(await klient().from('avdelinger').select('*').eq('id', id).limit(1));
    return rader[0] ? tilAvdeling(rader[0]) : null;
  },

  async profiler() {
    const rader = sjekk(await klient().from('profiler').select('*').order('navn'));
    return rader.map(tilProfil);
  },
  async profil(id) {
    const rader = sjekk(await klient().from('profiler').select('*').eq('id', id).limit(1));
    return rader[0] ? tilProfil(rader[0]) : null;
  },
  async profilByEpost(epost) {
    const rader = sjekk(
      await klient().from('profiler').select('*').ilike('epost', epost.trim()).limit(1),
    );
    return rader[0] ? tilProfil(rader[0]) : null;
  },
  async lagreProfil(profil) {
    sjekk(await klient().from('profiler').upsert(fraProfil(profil)).select());
  },

  async prisliste(avdelingId) {
    const rader = sjekk(
      await klient()
        .from('prisliste')
        .select('*')
        .eq('avdeling_id', avdelingId)
        .eq('aktiv', true)
        .order('sortering'),
    );
    return rader.map(tilPrislinje);
  },
  async lagrePrislinje(linje) {
    sjekk(await klient().from('prisliste').upsert(fraPrislinje(linje)).select());
  },
  async slettPrislinje(id) {
    sjekk(await klient().from('prisliste').delete().eq('id', id).select());
  },

  async lagreTimejobb(jobb) {
    const rader = sjekk(
      await klient().from('timejobber').upsert(fraTimejobb(jobb), { onConflict: 'local_id' }).select(),
    );
    return rader[0] ? tilTimejobb(rader[0]) : jobb;
  },
  async timejobb(localId) {
    const rader = sjekk(await klient().from('timejobber').select('*').eq('local_id', localId).limit(1));
    return rader[0] ? tilTimejobb(rader[0]) : null;
  },
  async timejobber(filter) {
    let q = klient().from('timejobber').select('*');
    if (filter.profilId) q = q.eq('profil_id', filter.profilId);
    if (filter.avdelingId) q = q.eq('avdeling_id', filter.avdelingId);
    if (filter.fraDato) q = q.gte('dato', filter.fraDato);
    const rader = sjekk(await q.order('dato', { ascending: false }));
    return rader.map(tilTimejobb);
  },

  async lagreTillegg(tillegg) {
    const rader = sjekk(
      await klient().from('tillegg').upsert(fraTillegg(tillegg), { onConflict: 'local_id' }).select(),
    );
    return rader[0] ? tilTillegg(rader[0]) : tillegg;
  },
  async tilleggByLocalId(localId) {
    const rader = sjekk(await klient().from('tillegg').select('*').eq('local_id', localId).limit(1));
    return rader[0] ? tilTillegg(rader[0]) : null;
  },
  async alleTillegg(filter) {
    let q = klient().from('tillegg').select('*');
    if (filter.avdelingId) q = q.eq('avdeling_id', filter.avdelingId);
    if (filter.profilId) q = q.eq('solgt_av_profil_id', filter.profilId);
    if (filter.prosjektId) q = q.eq('prosjekt_id', filter.prosjektId);
    if (filter.fraDato) q = q.gte('opprettet', filter.fraDato);
    const rader = sjekk(await q.order('opprettet', { ascending: false }));
    return rader.map(tilTillegg);
  },

  async prosjektMeta(prosjektId) {
    const rader = sjekk(
      await klient().from('prosjekt_meta').select('*').eq('prosjekt_id', prosjektId).limit(1),
    );
    return rader[0] ? tilMeta(rader[0]) : null;
  },
  async alleProsjektMeta(avdelingId) {
    let q = klient().from('prosjekt_meta').select('*');
    if (avdelingId) q = q.eq('avdeling_id', avdelingId);
    return sjekk(await q).map(tilMeta);
  },
  async lagreProsjektMeta(meta) {
    sjekk(await klient().from('prosjekt_meta').upsert(fraMeta(meta)).select());
  },

  async maler(avdelingId) {
    let q = klient().from('skjema_maler').select('*').eq('aktiv', true);
    if (avdelingId) q = q.eq('avdeling_id', avdelingId);
    return sjekk(await q).map(tilMal);
  },
  async mal(id) {
    const rader = sjekk(await klient().from('skjema_maler').select('*').eq('id', id).limit(1));
    return rader[0] ? tilMal(rader[0]) : null;
  },
  async lagreMal(mal) {
    sjekk(await klient().from('skjema_maler').upsert(fraMal(mal)).select());
  },

  async lagreUtfylling(utfylling) {
    const rader = sjekk(
      await klient()
        .from('skjema_utfyllinger')
        .upsert(fraUtfylling(utfylling), { onConflict: 'local_id' })
        .select(),
    );
    return rader[0] ? tilUtfylling(rader[0]) : utfylling;
  },
  async utfylling(id) {
    const rader = sjekk(
      await klient().from('skjema_utfyllinger').select('*').or(`id.eq.${id},local_id.eq.${id}`).limit(1),
    );
    return rader[0] ? tilUtfylling(rader[0]) : null;
  },
  async utfyllinger(filter) {
    let q = klient().from('skjema_utfyllinger').select('*');
    if (filter.profilId) q = q.eq('profil_id', filter.profilId);
    if (filter.avdelingId) q = q.eq('avdeling_id', filter.avdelingId);
    if (filter.prosjektId) q = q.eq('prosjekt_id', filter.prosjektId);
    return sjekk(await q.order('opprettet', { ascending: false })).map(tilUtfylling);
  },

  async kalender(filter) {
    let q = klient().from('kalender').select('*');
    if (filter.avdelingId) q = q.eq('avdeling_id', filter.avdelingId);
    if (filter.fra) q = q.gte('slutt_tid', filter.fra);
    if (filter.til) q = q.lte('start_tid', filter.til);
    return sjekk(await q.order('start_tid')).map(tilHendelse);
  },
  async lagreHendelse(hendelse) {
    sjekk(await klient().from('kalender').upsert(fraHendelse(hendelse)).select());
  },
  async slettHendelse(id) {
    sjekk(await klient().from('kalender').delete().eq('id', id).select());
  },

  async maal(avdelingId, uke) {
    let q = klient().from('maal').select('*').eq('avdeling_id', avdelingId);
    if (uke) q = q.eq('uke', uke);
    return sjekk(await q).map(tilMaal);
  },
  async lagreMaal(maal) {
    sjekk(await klient().from('maal').upsert(fraMaal(maal)).select());
  },
  async slettMaal(id) {
    sjekk(await klient().from('maal').delete().eq('id', id).select());
  },
};
