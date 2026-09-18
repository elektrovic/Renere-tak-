/**
 * Liten PDF-skriver.
 *
 * Vi lager PDF-en selv i stedet for å dra inn et stort bibliotek: skjemaene våre
 * er tekst, linjer og en signatur, og da er en egen skriver både mindre og
 * raskere. Skrifttypen Helvetica ligger i alle PDF-lesere, så ingenting må bygges inn.
 *
 * Tekst kodes som WinAnsi, som dekker æ, ø og å.
 */

export const SIDE_BREDDE = 595;
export const SIDE_HOYDE = 842;
export const MARG = 56;

type Op = string;

function pdfTekst(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Grov breddeberegning for Helvetica – god nok til linjebryting. */
function tekstBredde(tekst: string, storrelse: number): number {
  let bredde = 0;
  for (const tegn of tekst) {
    if ('ijltI.,:;\'|!'.includes(tegn)) bredde += 0.30;
    else if ('mwMW@'.includes(tegn)) bredde += 0.85;
    else if (tegn === ' ') bredde += 0.28;
    else if (tegn >= 'A' && tegn <= 'Z') bredde += 0.68;
    else bredde += 0.53;
  }
  return bredde * storrelse;
}

export function brytLinjer(tekst: string, storrelse: number, maksBredde: number): string[] {
  const linjer: string[] = [];
  for (const avsnitt of tekst.split('\n')) {
    let gjeldende = '';
    for (const ord of avsnitt.split(/\s+/).filter(Boolean)) {
      const forslag = gjeldende ? `${gjeldende} ${ord}` : ord;
      if (tekstBredde(forslag, storrelse) > maksBredde && gjeldende) {
        linjer.push(gjeldende);
        gjeldende = ord;
      } else {
        gjeldende = forslag;
      }
    }
    linjer.push(gjeldende);
  }
  return linjer;
}

export class PdfDokument {
  private sider: Op[][] = [];
  private gjeldende: Op[] = [];
  /** Y måles nedenfra i PDF. Vi holder styr på hvor langt ned vi er kommet. */
  private y = SIDE_HOYDE - MARG;

  constructor() {
    this.sider.push(this.gjeldende);
  }

  get bunnMarg(): number {
    return MARG + 40;
  }

  nySide(): void {
    this.gjeldende = [];
    this.sider.push(this.gjeldende);
    this.y = SIDE_HOYDE - MARG;
  }

  plassTil(hoyde: number): void {
    if (this.y - hoyde < this.bunnMarg) this.nySide();
  }

  hoppNed(piksler: number): void {
    this.y -= piksler;
  }

  get posisjon(): number {
    return this.y;
  }

  tekst(
    innhold: string,
    valg: { storrelse?: number; fet?: boolean; x?: number; gra?: boolean; linjeavstand?: number } = {},
  ): void {
    const storrelse = valg.storrelse ?? 10;
    const x = valg.x ?? MARG;
    const linjeavstand = valg.linjeavstand ?? storrelse * 1.45;
    const font = valg.fet ? '/F2' : '/F1';
    const maksBredde = SIDE_BREDDE - MARG - x;

    for (const linje of brytLinjer(innhold, storrelse, maksBredde)) {
      this.plassTil(linjeavstand);
      const farge = valg.gra ? '0.42 0.42 0.42 rg' : '0 0 0 rg';
      this.gjeldende.push(
        `BT ${farge} ${font} ${storrelse} Tf ${x} ${this.y - storrelse} Td (${pdfTekst(linje)}) Tj ET`,
      );
      this.y -= linjeavstand;
    }
  }

  /** Etikett til venstre og verdi til høyre – brukes til svarene i skjemaet. */
  felt(etikett: string, verdi: string): void {
    const kolonne = MARG + 210;
    const etikettLinjer = brytLinjer(etikett, 9.5, kolonne - MARG - 12);
    const verdiLinjer = brytLinjer(verdi || '–', 10, SIDE_BREDDE - MARG - kolonne);
    const hoyde = Math.max(etikettLinjer.length, verdiLinjer.length) * 14 + 8;
    this.plassTil(hoyde);

    const start = this.y;
    etikettLinjer.forEach((l, i) => {
      this.gjeldende.push(
        `BT 0.42 0.42 0.42 rg /F1 9.5 Tf ${MARG} ${start - 10 - i * 14} Td (${pdfTekst(l)}) Tj ET`,
      );
    });
    verdiLinjer.forEach((l, i) => {
      this.gjeldende.push(
        `BT 0 0 0 rg /F2 10 Tf ${kolonne} ${start - 10 - i * 14} Td (${pdfTekst(l)}) Tj ET`,
      );
    });

    this.y = start - hoyde;
    this.gjeldende.push(
      `0.85 0.85 0.85 RG 0.5 w ${MARG} ${this.y + 4} m ${SIDE_BREDDE - MARG} ${this.y + 4} l S`,
    );
  }

  linje(tykkelse = 1, gra = 0.2): void {
    this.plassTil(12);
    this.gjeldende.push(
      `${gra} ${gra} ${gra} RG ${tykkelse} w ${MARG} ${this.y} m ${SIDE_BREDDE - MARG} ${this.y} l S`,
    );
    this.y -= 12;
  }

  /**
   * Tegner signaturen som streker. Signaturen lagres som punkter, ikke som bilde,
   * nettopp for at den skal kunne tegnes rett inn i PDF-en.
   */
  signatur(strok: Array<Array<[number, number]>>, bredde = 240, hoyde = 90): void {
    this.plassTil(hoyde + 16);
    const x0 = MARG;
    const yTopp = this.y;

    const alle = strok.flat();
    const maksX = Math.max(1, ...alle.map((p) => p[0]));
    const maksY = Math.max(1, ...alle.map((p) => p[1]));
    const skala = Math.min(bredde / maksX, hoyde / maksY, 1.6);

    this.gjeldende.push('0 0 0 RG 1.4 w 1 J 1 j');
    for (const linje of strok) {
      if (linje.length === 0) continue;
      const punkt = (p: [number, number]) => `${(x0 + p[0] * skala).toFixed(2)} ${(yTopp - p[1] * skala).toFixed(2)}`;
      const deler = [`${punkt(linje[0])} m`];
      for (const p of linje.slice(1)) deler.push(`${punkt(p)} l`);
      this.gjeldende.push(`${deler.join(' ')} S`);
    }
    this.y -= hoyde + 16;
  }

  bygg(): Uint8Array {
    const deler: Buffer[] = [];
    const offsets: number[] = [];
    let lengde = 0;

    const skriv = (s: string | Buffer) => {
      const b = typeof s === 'string' ? Buffer.from(s, 'latin1') : s;
      deler.push(b);
      lengde += b.length;
    };
    const nyttObjekt = (innhold: string | Buffer, nummer: number) => {
      offsets[nummer] = lengde;
      skriv(`${nummer} 0 obj\n`);
      skriv(innhold);
      skriv('\nendobj\n');
    };

    const antallSider = this.sider.length;
    // 1 katalog, 2 sider, 3 og 4 fonter, deretter side- og innholdsobjekter.
    const sideStart = 5;
    const sideIder = this.sider.map((_, i) => sideStart + i * 2);

    skriv('%PDF-1.4\n');

    nyttObjekt('<< /Type /Catalog /Pages 2 0 R >>', 1);
    nyttObjekt(
      `<< /Type /Pages /Count ${antallSider} /Kids [${sideIder.map((i) => `${i} 0 R`).join(' ')}] >>`,
      2,
    );
    nyttObjekt('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 3);
    nyttObjekt(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      4,
    );

    this.sider.forEach((ops, i) => {
      const sideId = sideIder[i];
      const innholdId = sideId + 1;
      nyttObjekt(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${SIDE_BREDDE} ${SIDE_HOYDE}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${innholdId} 0 R >>`,
        sideId,
      );
      const strom = Buffer.from(ops.join('\n'), 'latin1');
      nyttObjekt(
        Buffer.concat([
          Buffer.from(`<< /Length ${strom.length} >>\nstream\n`, 'latin1'),
          strom,
          Buffer.from('\nendstream', 'latin1'),
        ]),
        innholdId,
      );
    });

    const antallObjekter = sideStart + antallSider * 2;
    const xrefStart = lengde;
    let xref = `xref\n0 ${antallObjekter}\n0000000000 65535 f \n`;
    for (let i = 1; i < antallObjekter; i++) {
      xref += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`;
    }
    skriv(xref);
    skriv(`trailer\n<< /Size ${antallObjekter} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

    return new Uint8Array(Buffer.concat(deler));
  }
}
