import type { Aktivitet, Prosjekt, ProsjektOkonomi, Timeforing } from '@/lib/types';
import { TripletexError, tripletexKall, type TripletexListe } from './client';
import type { NyOrdre, NyTimeforing, TripletexPort } from './port';

/**
 * Ekte Tripletex. Alle kall mot API-et ligger i denne filen.
 *
 * Feltnavnene under er hentet fra Tripletex sin offisielle dokumentasjon og
 * changelog. Punktene som er merket VERIFISER må sjekkes mot testmiljøet med
 * ekte nøkler – de er bygget forsiktig, slik at appen faller tilbake på noe
 * fornuftig i stedet for å kræsje hvis svaret ser annerledes ut.
 */

/** Kostpris per time brukt i lønnsomhetsberegningen når Tripletex ikke gir oss tallet. */
const TIMEKOST = Number(process.env.TRIPLETEX_TIMEKOST ?? '745');

interface TtProsjekt {
  id: number;
  number?: string;
  name?: string;
  displayName?: string;
  customer?: { id?: number; name?: string } | null;
  department?: { id?: number } | null;
  isFixedPrice?: boolean;
  fixedPrice?: number;
  isClosed?: boolean;
  deliveryAddress?: {
    addressLine1?: string;
    postalCode?: string;
    city?: string;
  } | null;
}

function tilProsjekt(p: TtProsjekt): Prosjekt {
  const adresse = [
    p.deliveryAddress?.addressLine1,
    [p.deliveryAddress?.postalCode, p.deliveryAddress?.city].filter(Boolean).join(' '),
  ]
    .filter((d) => d && d.trim() !== '')
    .join(', ');

  return {
    id: p.id,
    nummer: p.number ?? String(p.id),
    navn: p.name ?? p.displayName ?? `Prosjekt ${p.id}`,
    kunde: p.customer?.name ?? 'Ukjent kunde',
    adresse: adresse || null,
    avdelingSlug: null,
    aktiv: p.isClosed !== true,
    fastpris: p.isFixedPrice && typeof p.fixedPrice === 'number' ? p.fixedPrice : null,
    budsjettTimer: null,
  };
}

const PROSJEKT_FELT =
  'id,number,name,displayName,isClosed,isFixedPrice,fixedPrice,customer(id,name),department(id),deliveryAddress(addressLine1,postalCode,city)';

export const ekteTripletex: TripletexPort = {
  demo: false,

  async hentProsjekter(valg): Promise<Prosjekt[]> {
    const svar = await tripletexKall<TripletexListe<TtProsjekt>>('/project', {
      query: {
        isClosed: false,
        count: 1000,
        fields: PROSJEKT_FELT,
        departmentId: valg?.avdelingDepartmentId ?? undefined,
      },
    });
    return (svar.values ?? []).map(tilProsjekt);
  },

  async hentProsjekt(id: number): Promise<Prosjekt | null> {
    try {
      const svar = await tripletexKall<{ value: TtProsjekt }>(`/project/${id}`, {
        query: { fields: PROSJEKT_FELT },
      });
      return svar.value ? tilProsjekt(svar.value) : null;
    } catch (feil) {
      if (feil instanceof TripletexError && feil.status === 404) return null;
      throw feil;
    }
  },

  async hentAktiviteter(): Promise<Aktivitet[]> {
    // Aktiviteter styrer hvilken linje timene havner på i Tripletex.
    const svar = await tripletexKall<TripletexListe<{ id: number; name?: string; displayName?: string; isProjectActivity?: boolean; isInactive?: boolean }>>(
      '/activity',
      { query: { count: 1000, fields: 'id,name,displayName,isProjectActivity,isInactive' } },
    );
    return (svar.values ?? [])
      .filter((a) => a.isInactive !== true)
      .map((a) => ({ id: a.id, navn: a.name ?? a.displayName ?? `Aktivitet ${a.id}` }));
  },

  async hentTimeforinger({ ansattId, fraDato, tilDato }): Promise<Timeforing[]> {
    const svar = await tripletexKall<
      TripletexListe<{
        id: number;
        project?: { id?: number } | null;
        activity?: { id?: number } | null;
        employee?: { id?: number } | null;
        date: string;
        hours: number;
        comment?: string | null;
      }>
    >('/timesheet/entry', {
      query: {
        employeeId: ansattId,
        dateFrom: fraDato,
        dateTo: tilDato,
        count: 1000,
        fields: 'id,project(id),activity(id),employee(id),date,hours,comment',
      },
    });

    return (svar.values ?? [])
      .filter((t) => typeof t.project?.id === 'number')
      .map((t) => ({
        id: t.id,
        prosjektId: t.project!.id!,
        aktivitetId: t.activity?.id ?? 0,
        ansattId: t.employee?.id ?? ansattId,
        dato: t.date,
        timer: t.hours,
        kommentar: t.comment ?? null,
      }));
  },

  async skrivTimeforinger(rader: NyTimeforing[]): Promise<number[]> {
    if (rader.length === 0) return [];

    const body = rader.map((r) => ({
      project: { id: r.prosjektId },
      activity: { id: r.aktivitetId },
      employee: { id: r.ansattId },
      date: r.dato,
      hours: r.timer,
      ...(r.kommentar ? { comment: r.kommentar } : {}),
    }));

    // /timesheet/entry/list tar flere føringer i ett kall. Det er dette som gjør
    // «flere prosjekter samme dag i én operasjon» til ett enkelt API-kall.
    const svar = await tripletexKall<TripletexListe<{ id: number }>>('/timesheet/entry/list', {
      method: 'POST',
      body,
    });
    return (svar.values ?? []).map((v) => v.id);
  },

  async manedErLast({ ansattId, dato }): Promise<boolean> {
    // VERIFISER: feltnavnene på /timesheet/month. Vi tolker et hvilket som helst
    // «godkjent»-flagg som låst. Feiler kallet, lar vi skrivingen gå videre –
    // da er det Tripletex selv som eventuelt avviser den, med sin egen melding.
    try {
      const svar = await tripletexKall<
        TripletexListe<{ approved?: boolean; isApproved?: boolean; isComplete?: boolean; status?: string }>
      >('/timesheet/month', {
        query: { employeeId: ansattId, monthYear: dato.slice(0, 7).replace('-', '') },
      });
      const rad = svar.values?.[0];
      if (!rad) return false;
      return Boolean(rad.approved ?? rad.isApproved) || rad.status === 'APPROVED';
    } catch {
      return false;
    }
  },

  async opprettOrdreMedLinjer(ordre: NyOrdre): Promise<number> {
    const prosjekt = await tripletexKall<{ value: TtProsjekt }>(`/project/${ordre.prosjektId}`, {
      query: { fields: 'id,customer(id)' },
    });
    const kundeId = prosjekt.value?.customer?.id;
    if (!kundeId) {
      throw new TripletexError(
        'Prosjektet i Tripletex mangler kunde, så tillegget kan ikke bli en ordre.',
        409,
      );
    }

    const idag = new Date().toISOString().slice(0, 10);

    const svar = await tripletexKall<{ value: { id: number } }>('/order', {
      method: 'POST',
      body: {
        customer: { id: kundeId },
        project: { id: ordre.prosjektId },
        orderDate: idag,
        deliveryDate: idag,
        isPrioritizeAmountsIncludingVat: false,
        orderLines: ordre.linjer.map((l) => ({
          ...(l.tripletexProductId ? { product: { id: l.tripletexProductId } } : {}),
          description: l.beskrivelse,
          count: l.antall,
          unitPriceExcludingVatCurrency: l.enhetspris,
        })),
      },
    });

    return svar.value.id;
  },

  async lastOppProsjektdokument({ prosjektId, filnavn, pdf, beskrivelse }): Promise<number> {
    // VERIFISER: nøyaktig feltnavn på filen i multipart-kallet.
    // Endepunktet POST /documentArchive/project/{id} er dokumentert i Tripletex
    // sin changelog (2.35.2) som «last opp dokument og knytt det til objektet».
    const skjema = new FormData();
    const kopi = new Uint8Array(pdf);
    skjema.append('file', new Blob([kopi], { type: 'application/pdf' }), filnavn);
    if (beskrivelse) skjema.append('description', beskrivelse);

    const svar = await tripletexKall<{ value: { id: number } }>(
      `/documentArchive/project/${prosjektId}`,
      { method: 'POST', formData: skjema },
    );
    return svar.value?.id ?? 0;
  },

  async hentProsjektOkonomi(prosjektIder: number[]): Promise<ProsjektOkonomi[]> {
    const resultat: ProsjektOkonomi[] = [];

    for (const id of prosjektIder) {
      const fraKontrollskjema = await lesKontrollskjema(id);
      if (fraKontrollskjema) {
        resultat.push(fraKontrollskjema);
        continue;
      }
      resultat.push(await regnUtSelv(id));
    }

    return resultat;
  },
};

/**
 * Tripletex sitt eget prosjektkontrollskjema inneholder dekningsgrad per prosjekt.
 * VERIFISER: feltnavn og hvordan endepunktet filtreres. Vi leser tolerant og
 * returnerer null hvis vi ikke kjenner igjen svaret, slik at vi heller regner selv.
 */
async function lesKontrollskjema(prosjektId: number): Promise<ProsjektOkonomi | null> {
  try {
    const svar = await tripletexKall<TripletexListe<Record<string, unknown>>>(
      '/project/controlForm',
      { query: { projectId: prosjektId, count: 1 } },
    );
    const rad = svar.values?.[0];
    if (!rad) return null;

    const dg = tall(rad, ['contributionMarginPercent', 'coverageDegree']);
    const inntekt = tall(rad, ['sumRevenue', 'revenue', 'invoiced', 'sumInvoiced']);
    const kostnad = tall(rad, ['sumCost', 'cost', 'costs']);
    const fastpris = tall(rad, ['fixedPrice', 'fixedprice']);
    const timer = tall(rad, ['sumHours', 'hours', 'numberOfHours']);

    if (dg === null && inntekt === null) return null;

    const i = inntekt ?? 0;
    const k = kostnad ?? 0;
    return {
      prosjektId,
      inntekt: Math.round(i),
      kostnad: Math.round(k),
      dekningsgrad:
        dg !== null ? Math.round(dg * 10) / 10 : i > 0 ? Math.round(((i - k) / i) * 1000) / 10 : 0,
      fastpris,
      forteTimer: timer ?? 0,
      budsjettTimer: null,
    };
  } catch {
    return null;
  }
}

function tall(rad: Record<string, unknown>, navn: string[]): number | null {
  for (const n of navn) {
    const v = rad[n];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * Reserveberegning når kontrollskjemaet ikke gir oss tall:
 * inntekt = fastpris + ordrelinjer, kostnad = førte timer × timekost.
 * Timekosten settes med miljøvariabelen TRIPLETEX_TIMEKOST.
 */
async function regnUtSelv(prosjektId: number): Promise<ProsjektOkonomi> {
  let fastpris: number | null = null;
  try {
    const p = await tripletexKall<{ value: TtProsjekt }>(`/project/${prosjektId}`, {
      query: { fields: 'id,isFixedPrice,fixedPrice' },
    });
    fastpris = p.value?.isFixedPrice && typeof p.value.fixedPrice === 'number' ? p.value.fixedPrice : null;
  } catch {
    /* lar fastpris være null */
  }

  let ordrelinjeSum = 0;
  try {
    const linjer = await tripletexKall<
      TripletexListe<{ count?: number; unitPriceExcludingVatCurrency?: number; amountExcludingVatCurrency?: number }>
    >('/project/orderline', {
      query: { projectId: prosjektId, count: 1000, fields: 'count,unitPriceExcludingVatCurrency,amountExcludingVatCurrency' },
    });
    ordrelinjeSum = (linjer.values ?? []).reduce((s, l) => {
      if (typeof l.amountExcludingVatCurrency === 'number') return s + l.amountExcludingVatCurrency;
      return s + (l.count ?? 0) * (l.unitPriceExcludingVatCurrency ?? 0);
    }, 0);
  } catch {
    /* lar ordrelinjer være 0 */
  }

  let timer = 0;
  try {
    const t = await tripletexKall<TripletexListe<{ hours?: number }>>('/timesheet/entry', {
      query: { projectId: prosjektId, count: 1000, fields: 'hours' },
    });
    timer = (t.values ?? []).reduce((s, r) => s + (r.hours ?? 0), 0);
  } catch {
    /* lar timer være 0 */
  }

  const inntekt = (fastpris ?? 0) + ordrelinjeSum;
  const kostnad = timer * TIMEKOST;

  return {
    prosjektId,
    inntekt: Math.round(inntekt),
    kostnad: Math.round(kostnad),
    dekningsgrad: inntekt > 0 ? Math.round(((inntekt - kostnad) / inntekt) * 1000) / 10 : 0,
    fastpris,
    forteTimer: Math.round(timer * 10) / 10,
    budsjettTimer: null,
  };
}
