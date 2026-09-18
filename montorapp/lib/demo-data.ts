import type { Aktivitet, Prosjekt, Timeforing } from '@/lib/types';

/**
 * Testdata som brukes når appen kjører uten ekte Tripletex-nøkler.
 *
 * Tallene er laget med en fast «tilfeldig» rekkefølge, slik at demoen ser lik ut
 * hver gang og topplistene gir mening.
 */

/** Enkel pseudotilfeldig generator med fast frø – gir samme demo hver gang. */
export function frotall(fro: number): () => number {
  let x = fro >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

export const DEMO_AVDELINGER = [
  {
    id: 'avd-elektro',
    slug: 'tigerstaden-elektro',
    navn: 'Tigerstaden Elektro',
    tripletexCompanyId: null,
    tripletexDepartmentId: 1,
    farge: '#17548F',
    aktiv: true,
  },
  {
    id: 'avd-las',
    slug: 'tigerstaden-las-sikkerhet',
    navn: 'Tigerstaden Lås & Sikkerhet',
    tripletexCompanyId: null,
    tripletexDepartmentId: 2,
    farge: '#8A4B22',
    aktiv: true,
  },
] as const;

export const DEMO_ANSATTE = [
  { tripletexEmployeeId: 101, navn: 'Victor Halland', epost: 'victor@hallandgroup.no', avdelingId: 'avd-elektro', rolle: 'admin' as const, konsernAdmin: true, farge: '#17548F' },
  { tripletexEmployeeId: 102, navn: 'Jonas Berg', epost: 'jonas@hallandgroup.no', avdelingId: 'avd-elektro', rolle: 'montor' as const, konsernAdmin: false, farge: '#C2410C' },
  { tripletexEmployeeId: 103, navn: 'Amir Haddad', epost: 'amir@hallandgroup.no', avdelingId: 'avd-elektro', rolle: 'montor' as const, konsernAdmin: false, farge: '#0F766E' },
  { tripletexEmployeeId: 104, navn: 'Kristian Sæther', epost: 'kristian@hallandgroup.no', avdelingId: 'avd-elektro', rolle: 'montor' as const, konsernAdmin: false, farge: '#6D28D9' },
  { tripletexEmployeeId: 105, navn: 'Stine Kvam', epost: 'stine@hallandgroup.no', avdelingId: 'avd-las', rolle: 'montor' as const, konsernAdmin: false, farge: '#B45309' },
  { tripletexEmployeeId: 106, navn: 'Ole Rustad', epost: 'ole@hallandgroup.no', avdelingId: 'avd-las', rolle: 'montor' as const, konsernAdmin: false, farge: '#15803D' },
  { tripletexEmployeeId: 107, navn: 'Marte Lien', epost: 'marte@hallandgroup.no', avdelingId: 'avd-las', rolle: 'admin' as const, konsernAdmin: false, farge: '#8A4B22' },
];

export const DEMO_AKTIVITETER: Aktivitet[] = [
  { id: 900, navn: 'Montasje' },
  { id: 901, navn: 'Service' },
  { id: 902, navn: 'Feilsøking' },
  { id: 903, navn: 'Kabling' },
  { id: 904, navn: 'Idriftsettelse' },
  { id: 905, navn: 'Kjøring/rigg' },
];

export const DEMO_PROSJEKTER: Prosjekt[] = [
  { id: 5001, nummer: '2601', navn: 'Nybygg Løren – blokk C', kunde: 'Selvaag Bolig AS', adresse: 'Lørenvangen 22, 0585 Oslo', avdelingSlug: 'tigerstaden-elektro', aktiv: true, fastpris: 1_850_000, budsjettTimer: 1400 },
  { id: 5002, nummer: '2602', navn: 'Rehab Thereses gate 14', kunde: 'Thereses gate Sameie', adresse: 'Thereses gate 14, 0452 Oslo', avdelingSlug: 'tigerstaden-elektro', aktiv: true, fastpris: 420_000, budsjettTimer: 310 },
  { id: 5003, nummer: '2603', navn: 'Serviceavtale Storo Storsenter', kunde: 'Storo Drift AS', adresse: 'Vitaminveien 7, 0485 Oslo', avdelingSlug: 'tigerstaden-elektro', aktiv: true, fastpris: null, budsjettTimer: null },
  { id: 5004, nummer: '2604', navn: 'Ladeanlegg Skøyen Næringspark', kunde: 'Skøyen Eiendom AS', adresse: 'Karenslyst allé 51, 0279 Oslo', avdelingSlug: 'tigerstaden-elektro', aktiv: true, fastpris: 735_000, budsjettTimer: 520 },
  { id: 5005, nummer: '2605', navn: 'Tavlebytte Ensjø barnehage', kunde: 'Oslo kommune, Utdanningsetaten', adresse: 'Gladengveien 8, 0661 Oslo', avdelingSlug: 'tigerstaden-elektro', aktiv: true, fastpris: 268_000, budsjettTimer: 190 },
  { id: 5006, nummer: '2606', navn: 'Nødlys Bjørvika kontorbygg', kunde: 'Oslo S Utvikling AS', adresse: 'Dronning Eufemias gate 30, 0191 Oslo', avdelingSlug: 'tigerstaden-elektro', aktiv: true, fastpris: 512_000, budsjettTimer: 380 },
  { id: 5101, nummer: '2650', navn: 'Adgangskontroll Nydalen Park', kunde: 'Avantor AS', adresse: 'Gullhaug torg 3, 0484 Oslo', avdelingSlug: 'tigerstaden-las-sikkerhet', aktiv: true, fastpris: 640_000, budsjettTimer: 430 },
  { id: 5102, nummer: '2651', navn: 'Låsomlegging Majorstuen borettslag', kunde: 'Majorstuen Borettslag', adresse: 'Sorgenfrigata 9, 0362 Oslo', avdelingSlug: 'tigerstaden-las-sikkerhet', aktiv: true, fastpris: 295_000, budsjettTimer: 210 },
  { id: 5103, nummer: '2652', navn: 'Kamera og alarm Alnabru lager', kunde: 'Alnabru Logistikk AS', adresse: 'Nedre Kalbakkvei 40, 0953 Oslo', avdelingSlug: 'tigerstaden-las-sikkerhet', aktiv: true, fastpris: null, budsjettTimer: null },
  { id: 5104, nummer: '2653', navn: 'Service dørautomatikk Ullevål', kunde: 'Oslo universitetssykehus HF', adresse: 'Kirkeveien 166, 0450 Oslo', avdelingSlug: 'tigerstaden-las-sikkerhet', aktiv: true, fastpris: 158_000, budsjettTimer: 120 },
];

/** Hvilke montører som pleier å jobbe på hvilke prosjekter. */
const BEMANNING: Record<number, number[]> = {
  5001: [102, 103, 104],
  5002: [102, 104],
  5003: [103],
  5004: [102, 103],
  5005: [104],
  5006: [103, 104],
  5101: [105, 106],
  5102: [105],
  5103: [106],
  5104: [105, 106],
};

function datoStreng(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Lager en timehistorikk for de siste 60 dagene. Brukes både til
 * «dagens og gårsdagens prosjekter» og til å foreslå antall timer.
 */
function byggHistorikk(): Timeforing[] {
  const rnd = frotall(20260902);
  const rader: Timeforing[] = [];
  let nesteId = 700000;

  for (let dagerSiden = 60; dagerSiden >= 1; dagerSiden--) {
    const dato = new Date();
    dato.setHours(12, 0, 0, 0);
    dato.setDate(dato.getDate() - dagerSiden);
    const ukedag = dato.getDay();
    if (ukedag === 0 || ukedag === 6) continue;

    for (const ansattId of [102, 103, 104, 105, 106]) {
      const mine = Object.entries(BEMANNING)
        .filter(([, ansatte]) => ansatte.includes(ansattId))
        .map(([pid]) => Number(pid));
      if (mine.length === 0) continue;

      const antallJobber = rnd() < 0.35 ? 2 : 1;
      let igjen = 7.5;
      for (let i = 0; i < antallJobber && igjen > 0.5; i++) {
        const prosjektId = mine[Math.floor(rnd() * mine.length)];
        const aktivitet = DEMO_AKTIVITETER[Math.floor(rnd() * DEMO_AKTIVITETER.length)];
        const timer =
          i === antallJobber - 1 ? Math.round(igjen * 2) / 2 : Math.round(igjen * 0.5 * 2) / 2;
        igjen -= timer;
        if (timer <= 0) continue;
        rader.push({
          id: nesteId++,
          prosjektId,
          aktivitetId: aktivitet.id,
          ansattId,
          dato: datoStreng(dato),
          timer,
          kommentar: null,
        });
      }
    }
  }
  return rader;
}

/** Endres når appen skriver nye timer i demomodus. */
export const demoTimer: Timeforing[] = byggHistorikk();

export function demoNesteTimeId(): number {
  return 800000 + demoTimer.length;
}

/** Ordrer opprettet i demomodus (tilleggssalg og materiell). */
export const demoOrdrer: Array<{ id: number; prosjektId: number; sum: number; opprettet: string }> = [];

/** Dokumenter lastet opp i demomodus (kontrollskjemaer). */
export const demoDokumenter: Array<{ id: number; prosjektId: number; filnavn: string; storrelse: number; opprettet: string }> = [];
