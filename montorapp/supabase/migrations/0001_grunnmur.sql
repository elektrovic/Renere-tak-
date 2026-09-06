-- Montørappen – databasen vår.
--
-- Her ligger BARE det Tripletex ikke har. Prosjekter, timer, ordrelinjer og
-- innkjøp finnes ikke som tabeller: de leses og skrives i Tripletex, og vi
-- refererer til dem med prosjekt_id og ansatt-id.
--
-- Kjøres i Supabase: SQL Editor → lim inn → Run.

-- ---------------------------------------------------------------------------
-- Avdelinger
-- ---------------------------------------------------------------------------
create table if not exists avdelinger (
  id                      text primary key,
  slug                    text not null unique,
  navn                    text not null,
  -- Fylles ut hvis avdelingen er et EGET SELSKAP i Tripletex ...
  tripletex_company_id    text,
  -- ... eller hvis den er en AVDELING inne i ett selskap. Modellen takler begge.
  tripletex_department_id integer,
  farge                   text not null default '#17548F',
  aktiv                   boolean not null default true,
  opprettet               timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Brukere
-- ---------------------------------------------------------------------------
create table if not exists profiler (
  id                     text primary key,
  avdeling_id            text not null references avdelinger (id),
  tripletex_employee_id  integer not null,
  navn                   text not null,
  epost                  text not null unique,
  -- scrypt-hash av PIN. Aldri klartekst, aldri sendt til nettleseren.
  pin_hash               text not null,
  rolle                  text not null check (rolle in ('montor', 'admin')),
  kalenderfarge          text not null default '#17548F',
  konsern_admin          boolean not null default false,
  aktiv                  boolean not null default true,
  opprettet              timestamptz not null default now()
);
create index if not exists profiler_avdeling_idx on profiler (avdeling_id);

-- ---------------------------------------------------------------------------
-- Prisliste per avdeling
-- ---------------------------------------------------------------------------
create table if not exists prisliste (
  id                   text primary key,
  avdeling_id          text not null references avdelinger (id) on delete cascade,
  tripletex_product_id integer,
  navn                 text not null,
  enhet                text not null default 'stk',
  pris                 numeric(12, 2) not null check (pris >= 0),
  sortering            integer not null default 999,
  aktiv                boolean not null default true
);
create index if not exists prisliste_avdeling_idx on prisliste (avdeling_id, sortering);

-- ---------------------------------------------------------------------------
-- Timeføringer: kø og måling – IKKE en kopi av timelisten.
-- Innholdet tømmes når Tripletex har bekreftet skrivingen; det som blir igjen
-- er status og hvor lang tid registreringen tok.
-- ---------------------------------------------------------------------------
create table if not exists timejobber (
  id                  uuid primary key default gen_random_uuid(),
  -- Laget på telefonen. Hindrer at et nytt forsøk fører de samme timene to ganger.
  local_id            text not null unique,
  profil_id           text not null references profiler (id),
  avdeling_id         text not null references avdelinger (id),
  prosjekt_id         integer not null,
  aktivitet_id        integer not null,
  dato                date not null,
  timer               numeric(5, 2) not null check (timer > 0 and timer <= 24),
  kommentar           text,
  status              text not null check (status in ('i_ko', 'sender', 'sendt', 'feilet')),
  tripletex_entry_id  integer,
  registrering_ms     integer,
  feilmelding         text,
  opprettet           timestamptz not null default now(),
  sendt               timestamptz
);
create index if not exists timejobber_profil_idx on timejobber (profil_id, dato desc);
create index if not exists timejobber_status_idx on timejobber (status) where status <> 'sendt';

-- ---------------------------------------------------------------------------
-- Tilleggssalg og materiell
-- ---------------------------------------------------------------------------
create table if not exists tillegg (
  id                  uuid primary key default gen_random_uuid(),
  local_id            text not null unique,
  avdeling_id         text not null references avdelinger (id),
  prosjekt_id         integer not null,
  solgt_av_profil_id  text not null references profiler (id),
  type                text not null check (type in ('tillegg', 'materiell')),
  linjer              jsonb not null default '[]'::jsonb,
  sum                 numeric(12, 2) not null default 0,
  status              text not null check (status in ('i_ko', 'sender', 'sendt', 'feilet')),
  tripletex_order_id  integer,
  signert_navn        text,
  signert_tid         timestamptz,
  -- Signaturen lagres som strekpunkter, ikke som bilde.
  signatur            jsonb,
  bilder              jsonb not null default '[]'::jsonb,
  registrering_ms     integer,
  feilmelding         text,
  opprettet           timestamptz not null default now()
);
create index if not exists tillegg_avdeling_idx on tillegg (avdeling_id, opprettet desc);
create index if not exists tillegg_selger_idx on tillegg (solgt_av_profil_id, opprettet desc);
create index if not exists tillegg_prosjekt_idx on tillegg (prosjekt_id);

-- ---------------------------------------------------------------------------
-- Det Tripletex ikke har om prosjektet
-- ---------------------------------------------------------------------------
create table if not exists prosjekt_meta (
  prosjekt_id     integer primary key,
  avdeling_id     text not null references avdelinger (id),
  -- Opprinnelig tilbudssum: utgangspunktet for hva som regnes som tillegg.
  baseline_sum    numeric(12, 2),
  baseline_kilde  text check (baseline_kilde in ('tripletex', 'manuell', 'kobbr')),
  estimerte_timer numeric(8, 2),
  notat           text
);

-- ---------------------------------------------------------------------------
-- Kontrollskjemaer: maler som data, én per skjematype og avdeling
-- ---------------------------------------------------------------------------
create table if not exists skjema_maler (
  id          text primary key,
  avdeling_id text not null references avdelinger (id) on delete cascade,
  type        text not null check (type in ('sluttkontroll', 'sja', 'egenkontroll')),
  navn        text not null,
  versjon     integer not null default 1,
  sporsmal    jsonb not null default '[]'::jsonb,
  aktiv       boolean not null default true
);
create index if not exists skjema_maler_avdeling_idx on skjema_maler (avdeling_id, type);

create table if not exists skjema_utfyllinger (
  id                     uuid primary key default gen_random_uuid(),
  local_id               text not null unique,
  mal_id                 text not null references skjema_maler (id),
  avdeling_id            text not null references avdelinger (id),
  prosjekt_id            integer not null,
  profil_id              text not null references profiler (id),
  svar                   jsonb not null default '{}'::jsonb,
  -- Lagres separat fra svarene, så vi ser hva assistenten foreslo og hva
  -- montøren endret.
  ai_forslag             jsonb not null default '{}'::jsonb,
  status                 text not null check (status in ('kladd', 'i_ko', 'sendt', 'feilet')),
  signert_navn           text,
  signatur               jsonb,
  tripletex_document_id  integer,
  feilmelding            text,
  opprettet              timestamptz not null default now(),
  fullfort               timestamptz
);
create index if not exists skjema_utfyllinger_prosjekt_idx on skjema_utfyllinger (prosjekt_id);

-- ---------------------------------------------------------------------------
-- Kalender
-- ---------------------------------------------------------------------------
create table if not exists kalender (
  id          uuid primary key default gen_random_uuid(),
  avdeling_id text not null references avdelinger (id) on delete cascade,
  profil_id   text not null references profiler (id),
  prosjekt_id integer,
  tittel      text not null,
  start_tid   timestamptz not null,
  slutt_tid   timestamptz not null,
  notat       text,
  check (slutt_tid > start_tid)
);
create index if not exists kalender_periode_idx on kalender (avdeling_id, start_tid);

-- ---------------------------------------------------------------------------
-- Ukens mål
-- ---------------------------------------------------------------------------
create table if not exists maal (
  id          uuid primary key default gen_random_uuid(),
  avdeling_id text not null references avdelinger (id) on delete cascade,
  uke         text not null,
  type        text not null check (type in ('tilleggssalg_kr', 'antall_tillegg', 'andel_jobber_med_tillegg')),
  malverdi    numeric(12, 2) not null check (malverdi > 0),
  beskrivelse text not null default '',
  satt_av     text references profiler (id)
);
create index if not exists maal_uke_idx on maal (avdeling_id, uke);

-- ---------------------------------------------------------------------------
-- Radsikkerhet
--
-- Appen snakker med databasen fra serveren, med tjenestenøkkelen. Den nøkkelen
-- forlater aldri serveren. Vi slår på radsikkerhet uten å lage åpne regler, slik
-- at den offentlige nøkkelen (anon) ikke gir tilgang til én eneste rad – heller
-- ikke hvis noen skulle få tak i den.
--
-- Rollesjekken (montør kontra admin) håndheves i API-rutene, som er de eneste
-- som har tjenestenøkkelen.
-- ---------------------------------------------------------------------------
alter table avdelinger          enable row level security;
alter table profiler            enable row level security;
alter table prisliste           enable row level security;
alter table timejobber          enable row level security;
alter table tillegg             enable row level security;
alter table prosjekt_meta       enable row level security;
alter table skjema_maler        enable row level security;
alter table skjema_utfyllinger  enable row level security;
alter table kalender            enable row level security;
alter table maal                enable row level security;

-- Ingen policyer opprettes med vilje: uten policy nekter Postgres alt for
-- vanlige roller, mens tjenestenøkkelen går utenom radsikkerhet.
