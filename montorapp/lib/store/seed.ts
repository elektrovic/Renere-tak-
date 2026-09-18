import { DEMO_ANSATTE, DEMO_AVDELINGER, DEMO_PROSJEKTER, frotall } from '@/lib/demo-data';
import { hashPin } from '@/lib/auth/pin';
import { isoUke } from '@/lib/uke';
import type {
  Avdeling,
  KalenderHendelse,
  Maal,
  PrislinjeMal,
  Profil,
  ProsjektMeta,
  SkjemaMal,
  Tillegg,
} from '@/lib/types';

/** PIN alle demobrukere har. Vises på innloggingssiden i demomodus. */
export const DEMO_PIN = '1234';

export function seedAvdelinger(): Avdeling[] {
  return DEMO_AVDELINGER.map((a) => ({ ...a }));
}

export function seedProfiler(): Profil[] {
  const pinHash = hashPin(DEMO_PIN);
  return DEMO_ANSATTE.map((a, i) => ({
    id: `profil-${i + 1}`,
    avdelingId: a.avdelingId,
    tripletexEmployeeId: a.tripletexEmployeeId,
    navn: a.navn,
    epost: a.epost,
    pinHash,
    rolle: a.rolle,
    kalenderfarge: a.farge,
    konsernAdmin: a.konsernAdmin,
    aktiv: true,
  }));
}

export function seedPrisliste(): PrislinjeMal[] {
  const elektro: Array<[string, string, number]> = [
    ['Downlight LED, montert', 'stk', 890],
    ['Dobbel stikkontakt, innfelt', 'stk', 1250],
    ['Ny kurs 16 A i eksisterende sikringsskap', 'stk', 2450],
    ['Utelampe med bevegelsessensor', 'stk', 1980],
    ['Kabelstrekk 3×2,5 mm²', 'm', 145],
    ['Nettverkspunkt Cat6, terminert', 'stk', 1690],
    ['Varmekabel bad inkl. termostat', 'm²', 1450],
    ['Ladeboks 22 kW, montert', 'stk', 18900],
    ['Ekstra elektrikertime', 'time', 1195],
  ];
  const las: Array<[string, string, number]> = [
    ['Sylinder byttet', 'stk', 1450],
    ['Ekstra nøkkel', 'stk', 320],
    ['Dørvrider med rosetter', 'stk', 1890],
    ['Kodelås innvendig dør', 'stk', 4200],
    ['Adgangsleser, montert og programmert', 'stk', 6900],
    ['IP-kamera innendørs, montert', 'stk', 5600],
    ['Dørpumpe justert/byttet', 'stk', 2650],
    ['Ekstra låsesmedtime', 'time', 1250],
  ];

  const lag = (avdelingId: string, rader: Array<[string, string, number]>): PrislinjeMal[] =>
    rader.map(([navn, enhet, pris], i) => ({
      id: `pris-${avdelingId}-${i + 1}`,
      avdelingId,
      tripletexProductId: null,
      navn,
      enhet,
      pris,
      sortering: i,
      aktiv: true,
    }));

  return [...lag('avd-elektro', elektro), ...lag('avd-las', las)];
}

export function seedMaler(): SkjemaMal[] {
  return [
    {
      id: 'mal-elektro-sluttkontroll',
      avdelingId: 'avd-elektro',
      type: 'sluttkontroll',
      navn: 'Sluttkontroll elektro',
      versjon: 1,
      aktiv: true,
      sporsmal: [
        { id: 'visuell', tekst: 'Er anlegget visuelt kontrollert for skader og riktig montasje?', type: 'ja_nei', pakrevd: true },
        { id: 'merking', tekst: 'Er alle kurser merket i sikringsskapet?', type: 'ja_nei', pakrevd: true },
        { id: 'isolasjon', tekst: 'Isolasjonsmotstand', type: 'tall', enhet: 'MΩ', hjelpetekst: 'Måles med 500 V. Laveste målte verdi føres opp.', pakrevd: true },
        { id: 'ik_min', tekst: 'Målt kortslutningsstrøm Ik min', type: 'tall', enhet: 'A', pakrevd: true },
        { id: 'jordfeil_tid', tekst: 'Utløsertid jordfeilbryter', type: 'tall', enhet: 'ms', hjelpetekst: 'Måles ved 30 mA.', pakrevd: true },
        { id: 'jordfeil_test', tekst: 'Er jordfeilbryter testet med testknapp?', type: 'ja_nei', pakrevd: true },
        { id: 'overspenning', tekst: 'Er overspenningsvern montert og kontrollert?', type: 'ja_nei_ia', pakrevd: true },
        { id: 'kursfortegnelse', tekst: 'Er kursfortegnelse oppdatert og levert kunden?', type: 'ja_nei', pakrevd: true },
        { id: 'utfort_arbeid', tekst: 'Beskrivelse av utført arbeid', type: 'ai_tekst', pakrevd: true, aiOppgave: 'Skriv en kort, saklig beskrivelse av det elektriske arbeidet som er utført på prosjektet, basert på førte timer, aktiviteter og materiell.' },
        { id: 'avvik', tekst: 'Avvik som må følges opp', type: 'tekst', pakrevd: false, hjelpetekst: 'La stå tomt hvis ingen avvik.' },
      ],
    },
    {
      id: 'mal-elektro-sja',
      avdelingId: 'avd-elektro',
      type: 'sja',
      navn: 'SJA elektro',
      versjon: 1,
      aktiv: true,
      sporsmal: [
        { id: 'sted', tekst: 'Hvor utføres arbeidet?', type: 'tekst', pakrevd: true },
        { id: 'spenning', tekst: 'Spenningsnivå på anlegget', type: 'valg', valg: ['230 V IT', '230 V TN', '400 V TN-S', 'Lavspent under 50 V'], pakrevd: true },
        { id: 'spenningslos', tekst: 'Er anlegget gjort spenningsløst og sikret mot innkobling?', type: 'ja_nei', pakrevd: true },
        { id: 'aus', tekst: 'Utføres det arbeid under spenning (AUS)?', type: 'ja_nei_ia', pakrevd: true },
        { id: 'verneutstyr', tekst: 'Er nødvendig verneutstyr tilgjengelig og i orden?', type: 'ja_nei', pakrevd: true },
        { id: 'romning', tekst: 'Er rømningsvei og varslingsrutine avklart med alle på stedet?', type: 'ja_nei', pakrevd: true },
        { id: 'risiko', tekst: 'Risikovurdering', type: 'ai_tekst', pakrevd: true, aiOppgave: 'Skriv en kort risikovurdering for arbeidet, med utgangspunkt i hva som faktisk er ført på prosjektet. Nevn bare farer som følger av det oppgitte arbeidet.' },
        { id: 'tiltak', tekst: 'Tiltak som er avtalt', type: 'tekst', pakrevd: true },
      ],
    },
    {
      id: 'mal-elektro-egenkontroll',
      avdelingId: 'avd-elektro',
      type: 'egenkontroll',
      navn: 'Egenkontroll elektro',
      versjon: 1,
      aktiv: true,
      sporsmal: [
        { id: 'ryddet', tekst: 'Er arbeidsstedet ryddet og avfall tatt med?', type: 'ja_nei', pakrevd: true },
        { id: 'deksler', tekst: 'Er alle deksler og luker satt tilbake?', type: 'ja_nei', pakrevd: true },
        { id: 'funksjon', tekst: 'Er funksjonen testet sammen med kunden?', type: 'ja_nei_ia', pakrevd: true },
        { id: 'gjenstar', tekst: 'Gjenstående arbeid', type: 'tekst', pakrevd: false },
      ],
    },
    {
      id: 'mal-las-sluttkontroll',
      avdelingId: 'avd-las',
      type: 'sluttkontroll',
      navn: 'Sluttkontroll lås og sikkerhet',
      versjon: 1,
      aktiv: true,
      sporsmal: [
        { id: 'sylinder', tekst: 'Er alle sylindre montert og testet med nøkkel?', type: 'ja_nei', pakrevd: true },
        { id: 'romningsvei', tekst: 'Er dører i rømningsvei testet for fri utgang uten nøkkel?', type: 'ja_nei', pakrevd: true, hjelpetekst: 'Gjelder alle dører som inngår i rømningsvei.' },
        { id: 'antall_nokler', tekst: 'Antall nøkler overlevert', type: 'tall', enhet: 'stk', pakrevd: true },
        { id: 'kvittert_av', tekst: 'Hvem kvitterte for nøklene?', type: 'tekst', pakrevd: true },
        { id: 'adgang', tekst: 'Er adgangskontroll programmert og testet?', type: 'ja_nei_ia', pakrevd: true },
        { id: 'automatikk', tekst: 'Er dørautomatikk justert (åpne- og lukketid)?', type: 'ja_nei_ia', pakrevd: true },
        { id: 'utfort_arbeid', tekst: 'Beskrivelse av utført arbeid', type: 'ai_tekst', pakrevd: true, aiOppgave: 'Skriv en kort, saklig beskrivelse av lås- og sikkerhetsarbeidet som er utført, basert på førte timer og materiell.' },
        { id: 'avvik', tekst: 'Avvik som må følges opp', type: 'tekst', pakrevd: false },
      ],
    },
    {
      id: 'mal-las-sja',
      avdelingId: 'avd-las',
      type: 'sja',
      navn: 'SJA lås og sikkerhet',
      versjon: 1,
      aktiv: true,
      sporsmal: [
        { id: 'sted', tekst: 'Hvor utføres arbeidet?', type: 'tekst', pakrevd: true },
        { id: 'ut_av_drift', tekst: 'Er det avklart med kunden at dører kan settes ut av drift?', type: 'ja_nei', pakrevd: true },
        { id: 'alternativ_romning', tekst: 'Er alternativ rømningsvei sikret mens arbeidet pågår?', type: 'ja_nei', pakrevd: true },
        { id: 'verneutstyr', tekst: 'Er verneutstyr i orden (vernebriller, hansker)?', type: 'ja_nei', pakrevd: true },
        { id: 'risiko', tekst: 'Risikovurdering', type: 'ai_tekst', pakrevd: true, aiOppgave: 'Skriv en kort risikovurdering for lås- og sikkerhetsarbeidet, med utgangspunkt i hva som faktisk er ført på prosjektet.' },
        { id: 'tiltak', tekst: 'Tiltak som er avtalt', type: 'tekst', pakrevd: true },
      ],
    },
  ];
}

export function seedProsjektMeta(): ProsjektMeta[] {
  return DEMO_PROSJEKTER.map((p) => ({
    prosjektId: p.id,
    avdelingId: p.avdelingSlug === 'tigerstaden-las-sikkerhet' ? 'avd-las' : 'avd-elektro',
    baselineSum: p.fastpris,
    baselineKilde: p.fastpris ? ('tripletex' as const) : null,
    estimerteTimer: p.budsjettTimer,
    notat: null,
  }));
}

export function seedMaal(): Maal[] {
  const uke = isoUke();
  return [
    { id: 'maal-1', avdelingId: 'avd-elektro', uke, type: 'tilleggssalg_kr', malverdi: 60000, beskrivelse: 'Tilleggssalg denne uka', settAv: 'profil-1' },
    { id: 'maal-2', avdelingId: 'avd-elektro', uke, type: 'andel_jobber_med_tillegg', malverdi: 40, beskrivelse: 'Andel jobber med tillegg', settAv: 'profil-1' },
    { id: 'maal-3', avdelingId: 'avd-las', uke, type: 'tilleggssalg_kr', malverdi: 35000, beskrivelse: 'Tilleggssalg denne uka', settAv: 'profil-7' },
  ];
}

/** Litt tilleggshistorikk denne måneden, så topplista har noe å vise. */
export function seedTillegg(profiler: Profil[]): Tillegg[] {
  const rnd = frotall(4711);
  const prisliste = seedPrisliste();
  const resultat: Tillegg[] = [];
  const montorer = profiler.filter((p) => p.rolle === 'montor');

  const idag = new Date();
  const dagerIManeden = idag.getDate();

  let n = 0;
  for (const m of montorer) {
    const antall = 2 + Math.floor(rnd() * 4);
    const prosjekter = DEMO_PROSJEKTER.filter(
      (p) => (p.avdelingSlug === 'tigerstaden-las-sikkerhet' ? 'avd-las' : 'avd-elektro') === m.avdelingId,
    );

    for (let i = 0; i < antall; i++) {
      const prosjekt = prosjekter[Math.floor(rnd() * prosjekter.length)];
      const mine = prisliste.filter((p) => p.avdelingId === m.avdelingId);
      const antallLinjer = 1 + Math.floor(rnd() * 2);
      const linjer = Array.from({ length: antallLinjer }, (_, j) => {
        const vare = mine[Math.floor(rnd() * mine.length)];
        const stk = 1 + Math.floor(rnd() * 4);
        return {
          id: `linje-${n}-${j}`,
          beskrivelse: vare.navn,
          antall: stk,
          enhet: vare.enhet,
          enhetspris: vare.pris,
          prislinjeId: vare.id,
        };
      });
      const sum = linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0);
      const dag = 1 + Math.floor(rnd() * Math.max(1, dagerIManeden - 1));
      const dato = new Date(idag.getFullYear(), idag.getMonth(), dag, 10, 30);
      const signert = rnd() > 0.18;

      resultat.push({
        id: `tillegg-seed-${++n}`,
        localId: `seed-${n}`,
        avdelingId: m.avdelingId,
        prosjektId: prosjekt.id,
        solgtAvProfilId: m.id,
        type: 'tillegg',
        linjer,
        sum,
        status: 'sendt',
        tripletexOrderId: 91000 + n,
        signertNavn: signert ? 'Kunde på stedet' : null,
        signertTid: signert ? dato.toISOString() : null,
        signatur: signert ? [[[10, 40], [40, 15], [70, 45], [100, 20], [130, 38]]] : null,
        bilder: [],
        registreringMs: 45000 + Math.floor(rnd() * 60000),
        feilmelding: null,
        opprettet: dato.toISOString(),
      });
    }
  }
  return resultat;
}

export function seedKalender(profiler: Profil[]): KalenderHendelse[] {
  const rnd = frotall(90210);
  const hendelser: KalenderHendelse[] = [];
  const montorer = profiler.filter((p) => p.rolle === 'montor');
  let n = 0;

  for (let dagerFrem = -2; dagerFrem <= 9; dagerFrem++) {
    const d = new Date();
    d.setDate(d.getDate() + dagerFrem);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    for (const m of montorer) {
      if (rnd() > 0.75) continue;
      const prosjekter = DEMO_PROSJEKTER.filter(
        (p) => (p.avdelingSlug === 'tigerstaden-las-sikkerhet' ? 'avd-las' : 'avd-elektro') === m.avdelingId,
      );
      const prosjekt = prosjekter[Math.floor(rnd() * prosjekter.length)];
      const startTime = rnd() > 0.5 ? 7 : 8;
      const start = new Date(d);
      start.setHours(startTime, 0, 0, 0);
      const slutt = new Date(d);
      slutt.setHours(startTime + (rnd() > 0.4 ? 8 : 4), 0, 0, 0);

      hendelser.push({
        id: `hendelse-${++n}`,
        avdelingId: m.avdelingId,
        profilId: m.id,
        prosjektId: prosjekt.id,
        tittel: prosjekt.navn,
        start: start.toISOString(),
        slutt: slutt.toISOString(),
        notat: null,
      });
    }
  }
  return hendelser;
}
