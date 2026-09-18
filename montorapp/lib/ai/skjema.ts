import Anthropic from '@anthropic-ai/sdk';
import { anthropicConfigured, config } from '@/lib/config';
import type { Prosjekt, Sporsmal } from '@/lib/types';

/**
 * Foreslår tekst til fritekstfeltene i kontrollskjemaene.
 *
 * To faste regler:
 *  1. Assistenten skal aldri finne på målinger eller kontrollpunkter.
 *  2. Montøren ser alltid forslaget og kan endre det før det låses.
 */

export interface ForslagInn {
  sporsmal: Sporsmal;
  skjemaNavn: string;
  prosjekt: Prosjekt;
  avdelingNavn: string;
  utfortAv: string;
  /** Det som faktisk er ført på jobben – eneste faktagrunnlag. */
  timeforinger: Array<{ dato: string; timer: number; aktivitet: string }>;
  materiell: Array<{ beskrivelse: string; antall: number; enhet: string }>;
  besvarteSporsmal: Array<{ sporsmal: string; svar: string }>;
}

const SYSTEM = `Du hjelper montører i et norsk elektro- og sikkerhetsfirma med å formulere fritekstfeltene i kontrollskjemaer (sluttkontroll, SJA og egenkontroll).

Regler du aldri bryter:
- Du skal ALDRI finne på tekniske målinger, verdier, kontrollpunkter eller utstyr. Bruk kun opplysninger du får oppgitt.
- Mangler du noe for å kunne skrive teksten, skriver du i stedet én kort setning som starter med "MANGLER:" og sier presist hva montøren må oppgi.
- Ikke gjett kundens navn, romnummer, merkevarer eller mengder som ikke står i grunnlaget.
- Skriv på norsk bokmål, saklig og kort. 2-5 setninger. Ingen overskrifter, ingen punktlister, ingen innledning som "Her er teksten".
- Skriv i preteritum for utført arbeid ("Det ble montert ..."), presens for risikovurdering.
- Teksten skal kunne limes rett inn i et offisielt skjema som sendes kunden.`;

function grunnlag(inn: ForslagInn): string {
  const timerPerAktivitet = new Map<string, number>();
  for (const t of inn.timeforinger) {
    timerPerAktivitet.set(t.aktivitet, (timerPerAktivitet.get(t.aktivitet) ?? 0) + t.timer);
  }

  const linjer = [
    `Avdeling: ${inn.avdelingNavn}`,
    `Skjema: ${inn.skjemaNavn}`,
    `Prosjekt: ${inn.prosjekt.nummer} – ${inn.prosjekt.navn}`,
    `Kunde: ${inn.prosjekt.kunde}`,
    `Adresse: ${inn.prosjekt.adresse ?? 'ikke registrert'}`,
    `Utført av: ${inn.utfortAv}`,
    '',
    'Førte timer på jobben:',
    ...(timerPerAktivitet.size
      ? [...timerPerAktivitet.entries()].map(([a, t]) => `- ${a}: ${t} timer`)
      : ['- ingen timer ført ennå']),
    '',
    'Registrert materiell og tillegg:',
    ...(inn.materiell.length
      ? inn.materiell.map((m) => `- ${m.antall} ${m.enhet} ${m.beskrivelse}`)
      : ['- ingenting registrert']),
  ];

  if (inn.besvarteSporsmal.length) {
    linjer.push('', 'Allerede besvart i skjemaet:');
    for (const s of inn.besvarteSporsmal) linjer.push(`- ${s.sporsmal}: ${s.svar}`);
  }

  return linjer.join('\n');
}

export class AiIkkeSattOpp extends Error {
  constructor() {
    super('Assistenten er ikke satt opp. Legg inn ANTHROPIC_API_KEY i miljøvariablene.');
    this.name = 'AiIkkeSattOpp';
  }
}

export async function foreslaTekst(inn: ForslagInn): Promise<string> {
  if (!anthropicConfigured) throw new AiIkkeSattOpp();

  const klient = new Anthropic({ apiKey: config.anthropic.apiKey });

  const oppgave =
    inn.sporsmal.aiOppgave ??
    `Skriv et utkast til feltet "${inn.sporsmal.tekst}" i skjemaet.`;

  const svar = await klient.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1000,
    output_config: { effort: 'low' },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `${oppgave}\n\nGrunnlag – dette er alt som er registrert på jobben:\n\n${grunnlag(inn)}\n\nSvar med kun teksten som skal stå i feltet.`,
      },
    ],
  });

  if (svar.stop_reason === 'refusal') {
    throw new Error('Assistenten kunne ikke svare på dette. Skriv teksten selv.');
  }

  const tekst = svar.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return tekst || 'MANGLER: for lite er registrert på jobben til å kunne foreslå tekst.';
}
