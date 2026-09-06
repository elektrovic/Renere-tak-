import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lagSkjemaPdf } from '../lib/pdf/skjema.ts';

const mal = {
  id: 'mal-elektro-sluttkontroll',
  avdelingId: 'avd-elektro',
  type: 'sluttkontroll',
  navn: 'Sluttkontroll elektro',
  versjon: 1,
  aktiv: true,
  sporsmal: [
    { id: 'visuell', tekst: 'Er anlegget visuelt kontrollert?', type: 'ja_nei', pakrevd: true },
    { id: 'isolasjon', tekst: 'Isolasjonsmotstand', type: 'tall', enhet: 'MΩ', pakrevd: true },
    { id: 'overspenning', tekst: 'Er overspenningsvern kontrollert?', type: 'ja_nei_ia', pakrevd: true },
    { id: 'utfort_arbeid', tekst: 'Beskrivelse av utført arbeid', type: 'ai_tekst', pakrevd: true },
    { id: 'avvik', tekst: 'Avvik', type: 'tekst', pakrevd: false },
  ],
};

const utfylling = {
  id: 'u1',
  localId: 'u1',
  malId: mal.id,
  avdelingId: 'avd-elektro',
  prosjektId: 5004,
  profilId: 'profil-2',
  svar: {
    visuell: 'ja',
    isolasjon: 250,
    overspenning: 'ia',
    utfort_arbeid: 'Det ble montert ladeanlegg med åtte ladepunkter i parkeringskjeller.',
    avvik: '',
  },
  aiForslag: {},
  status: 'sendt',
  signertNavn: 'Kari Nordmann',
  signatur: [[[8, 50], [30, 20], [55, 48]]],
  tripletexDocumentId: null,
  feilmelding: null,
  opprettet: '2026-09-02T10:00:00.000Z',
  fullfort: '2026-09-02T10:20:00.000Z',
};

const prosjekt = {
  id: 5004,
  nummer: '2604',
  navn: 'Ladeanlegg Skøyen Næringspark',
  kunde: 'Skøyen Eiendom AS',
  adresse: 'Karenslyst allé 51, 0279 Oslo',
  avdelingSlug: 'tigerstaden-elektro',
  aktiv: true,
  fastpris: 735000,
  budsjettTimer: 520,
};

function tekstbiter(bytes) {
  const raa = Buffer.from(bytes).toString('latin1');
  return [...raa.matchAll(/\((.*?)\) Tj/g)].map((m) => m[1]);
}

test('skjema-PDF inneholder prosjektopplysninger og svar', () => {
  const bytes = lagSkjemaPdf({
    mal,
    utfylling,
    prosjekt,
    avdelingNavn: 'Tigerstaden Elektro',
    utfortAv: 'Jonas Berg',
    forteTimer: 37.5,
    materiell: ['4 stk Downlight LED, montert'],
  });

  const biter = tekstbiter(bytes);
  const finnes = (s) => biter.some((b) => b.includes(s));

  assert.ok(finnes('Sluttkontroll elektro'), 'skjemanavn');
  assert.ok(finnes('2604'), 'prosjektnummer');
  assert.ok(finnes('Karenslyst all'), 'adresse');
  assert.ok(finnes('Jonas Berg'), 'hvem som utførte');
  assert.ok(finnes('Kari Nordmann'), 'hvem som signerte');
  assert.ok(finnes('Downlight'), 'registrert materiell');
  assert.ok(finnes('ladepunkter'), 'fritekstsvaret');
});

test('ja/nei/ikke aktuelt skrives ut på norsk', () => {
  const biter = tekstbiter(
    lagSkjemaPdf({
      mal,
      utfylling,
      prosjekt,
      avdelingNavn: 'Tigerstaden Elektro',
      utfortAv: 'Jonas Berg',
      forteTimer: 37.5,
      materiell: [],
    }),
  );
  assert.ok(biter.includes('Ja'));
  assert.ok(biter.includes('Ikke aktuelt'));
  assert.ok(biter.some((b) => b.includes('250 M')), 'tall med enhet');
});

test('ubesvart felt merkes, ikke skjules', () => {
  const uten = { ...utfylling, svar: { ...utfylling.svar, utfort_arbeid: '' } };
  const biter = tekstbiter(
    lagSkjemaPdf({
      mal,
      utfylling: uten,
      prosjekt,
      avdelingNavn: 'Tigerstaden Elektro',
      utfortAv: 'Jonas Berg',
      forteTimer: 0,
      materiell: [],
    }),
  );
  assert.ok(biter.includes('Ikke besvart'));
});

test('uten signatur står det tydelig i PDF-en', () => {
  const usignert = { ...utfylling, signatur: null, fullfort: null };
  const biter = tekstbiter(
    lagSkjemaPdf({
      mal,
      utfylling: usignert,
      prosjekt,
      avdelingNavn: 'Tigerstaden Elektro',
      utfortAv: 'Jonas Berg',
      forteTimer: 12,
      materiell: [],
    }),
  );
  assert.ok(biter.filter((b) => b === 'Ikke signert').length >= 1);
});
