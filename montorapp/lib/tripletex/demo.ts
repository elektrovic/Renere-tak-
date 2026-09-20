import {
  DEMO_AKTIVITETER,
  DEMO_PROSJEKTER,
  demoDokumenter,
  demoNesteTimeId,
  demoOrdrer,
  demoTimer,
} from '@/lib/demo-data';
import type { Aktivitet, Prosjekt, ProsjektOkonomi, Timeforing } from '@/lib/types';
import type { NyOrdre, NyTimeforing, TripletexPort } from './port';

/**
 * Testdatakilde. Oppfører seg som Tripletex, men uten nett.
 * Brukes helt til ekte nøkler er lagt inn i miljøvariablene.
 */
export const demoTripletex: TripletexPort = {
  demo: true,

  async hentProsjekter() {
    return DEMO_PROSJEKTER.filter((p) => p.aktiv);
  },

  async hentProsjekt(id: number): Promise<Prosjekt | null> {
    return DEMO_PROSJEKTER.find((p) => p.id === id) ?? null;
  },

  async hentAktiviteter(): Promise<Aktivitet[]> {
    return DEMO_AKTIVITETER;
  },

  async hentTimeforinger({ ansattId, fraDato, tilDato }): Promise<Timeforing[]> {
    return demoTimer.filter(
      (t) => t.ansattId === ansattId && t.dato >= fraDato && t.dato <= tilDato,
    );
  },

  async skrivTimeforinger(rader: NyTimeforing[]): Promise<number[]> {
    const ider: number[] = [];
    for (const r of rader) {
      const id = demoNesteTimeId();
      demoTimer.push({
        id,
        prosjektId: r.prosjektId,
        aktivitetId: r.aktivitetId,
        ansattId: r.ansattId,
        dato: r.dato,
        timer: r.timer,
        kommentar: r.kommentar ?? null,
      });
      ider.push(id);
    }
    return ider;
  },

  async manedErLast() {
    return false;
  },

  async opprettOrdreMedLinjer(ordre: NyOrdre): Promise<number> {
    const id = 90000 + demoOrdrer.length + 1;
    const sum = ordre.linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0);
    demoOrdrer.push({ id, prosjektId: ordre.prosjektId, sum, opprettet: new Date().toISOString() });
    return id;
  },

  async lastOppProsjektdokument({ prosjektId, filnavn, pdf }): Promise<number> {
    const id = 70000 + demoDokumenter.length + 1;
    demoDokumenter.push({
      id,
      prosjektId,
      filnavn,
      storrelse: pdf.byteLength,
      opprettet: new Date().toISOString(),
    });
    return id;
  },

  async hentProsjektOkonomi(prosjektIder: number[]): Promise<ProsjektOkonomi[]> {
    return prosjektIder.map((id) => {
      const p = DEMO_PROSJEKTER.find((x) => x.id === id);
      const timer = demoTimer.filter((t) => t.prosjektId === id);
      const forteTimer = timer.reduce((s, t) => s + t.timer, 0);

      const tilleggSum = demoOrdrer
        .filter((o) => o.prosjektId === id)
        .reduce((s, o) => s + o.sum, 0);

      // Enkel, men forutsigbar demoøkonomi: fastpris + tillegg som inntekt,
      // timepris 745 og et materiellpåslag som kostnad.
      const inntekt = (p?.fastpris ?? forteTimer * 1195) + tilleggSum;
      const kostnad = forteTimer * 745 + (p?.fastpris ? p.fastpris * 0.28 : forteTimer * 210);
      const dekningsgrad = inntekt > 0 ? ((inntekt - kostnad) / inntekt) * 100 : 0;

      return {
        prosjektId: id,
        inntekt: Math.round(inntekt),
        kostnad: Math.round(kostnad),
        dekningsgrad: Math.round(dekningsgrad * 10) / 10,
        fastpris: p?.fastpris ?? null,
        forteTimer: Math.round(forteTimer * 10) / 10,
        budsjettTimer: p?.budsjettTimer ?? null,
      };
    });
  },
};
