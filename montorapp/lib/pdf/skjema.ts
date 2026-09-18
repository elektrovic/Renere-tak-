import { MARG, PdfDokument } from './pdf.ts';
import type { Prosjekt, SkjemaMal, SkjemaUtfylling, Sporsmal } from '@/lib/types';

function svarTekst(sporsmal: Sporsmal, verdi: unknown): string {
  if (verdi === null || verdi === undefined || verdi === '') return 'Ikke besvart';
  if (sporsmal.type === 'ja_nei' || sporsmal.type === 'ja_nei_ia') {
    if (verdi === true || verdi === 'ja') return 'Ja';
    if (verdi === false || verdi === 'nei') return 'Nei';
    if (verdi === 'ia') return 'Ikke aktuelt';
  }
  if (sporsmal.type === 'tall') {
    return `${verdi}${sporsmal.enhet ? ` ${sporsmal.enhet}` : ''}`;
  }
  return String(verdi);
}

export interface SkjemaPdfData {
  mal: SkjemaMal;
  utfylling: SkjemaUtfylling;
  prosjekt: Prosjekt;
  avdelingNavn: string;
  utfortAv: string;
  forteTimer: number;
  materiell: string[];
}

/** Lager den ferdige PDF-en som lastes opp på prosjektet i Tripletex. */
export function lagSkjemaPdf(data: SkjemaPdfData): Uint8Array {
  const { mal, utfylling, prosjekt, avdelingNavn, utfortAv, forteTimer, materiell } = data;
  const pdf = new PdfDokument();

  pdf.tekst(avdelingNavn.toUpperCase(), { storrelse: 9, gra: true });
  pdf.hoppNed(4);
  pdf.tekst(mal.navn, { storrelse: 20, fet: true });
  pdf.hoppNed(6);
  pdf.linje(1.4, 0.1);

  pdf.tekst('Prosjekt', { storrelse: 11, fet: true });
  pdf.hoppNed(2);
  pdf.felt('Prosjektnummer', prosjekt.nummer);
  pdf.felt('Prosjekt', prosjekt.navn);
  pdf.felt('Kunde', prosjekt.kunde);
  pdf.felt('Adresse', prosjekt.adresse ?? 'Ikke registrert');
  pdf.felt('Utført av', utfortAv);
  pdf.felt('Dato', new Date(utfylling.fullfort ?? utfylling.opprettet).toLocaleDateString('nb-NO'));
  pdf.felt('Førte timer på jobben', `${forteTimer.toLocaleString('nb-NO')} timer`);
  if (materiell.length > 0) {
    pdf.felt('Registrert materiell og tillegg', materiell.join(', '));
  }

  pdf.hoppNed(14);
  pdf.tekst('Kontrollpunkter', { storrelse: 11, fet: true });
  pdf.hoppNed(2);

  for (const sporsmal of mal.sporsmal) {
    const verdi = utfylling.svar[sporsmal.id];
    if (sporsmal.type === 'ai_tekst' || sporsmal.type === 'tekst') {
      const tekst = String(verdi ?? '').trim();
      pdf.hoppNed(8);
      pdf.tekst(sporsmal.tekst, { storrelse: 9.5, gra: true });
      pdf.hoppNed(2);
      pdf.tekst(tekst || 'Ikke besvart', { storrelse: 10 });
    } else {
      pdf.felt(sporsmal.tekst, svarTekst(sporsmal, verdi));
    }
  }

  pdf.hoppNed(24);
  pdf.linje(1, 0.35);
  pdf.tekst('Signatur', { storrelse: 11, fet: true });

  if (utfylling.signatur && utfylling.signatur.length > 0) {
    pdf.hoppNed(6);
    pdf.signatur(utfylling.signatur);
  } else {
    pdf.hoppNed(10);
    pdf.tekst('Ikke signert', { storrelse: 10, gra: true });
  }

  pdf.tekst(utfylling.signertNavn ?? utfortAv, { storrelse: 10, fet: true });
  pdf.tekst(
    utfylling.fullfort
      ? `Signert ${new Date(utfylling.fullfort).toLocaleString('nb-NO')}`
      : 'Ikke signert',
    { storrelse: 9, gra: true },
  );

  pdf.hoppNed(20);
  pdf.tekst(
    `Skjemaet er fylt ut i Montørappen og lastet opp på prosjektet i Tripletex. ` +
      `Fritekstfelter kan være foreslått av assistent og er godkjent av ${utfortAv} før signering.`,
    { storrelse: 8, gra: true, x: MARG },
  );

  return pdf.bygg();
}
