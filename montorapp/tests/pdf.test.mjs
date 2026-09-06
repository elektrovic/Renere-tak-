import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brytLinjer, PdfDokument } from '../lib/pdf/pdf.ts';

test('bryter linjer uten å miste ord', () => {
  const tekst = 'Det ble montert ladeanlegg med åtte ladepunkter og ny kurs på 63 ampere.';
  const linjer = brytLinjer(tekst, 10, 200);
  assert.ok(linjer.length > 1, 'lang tekst skal brytes');
  assert.equal(linjer.join(' ').replace(/\s+/g, ' '), tekst);
});

test('beholder avsnitt', () => {
  assert.deepEqual(brytLinjer('En\nTo', 10, 500), ['En', 'To']);
});

test('lager en gyldig PDF med norske tegn', () => {
  const pdf = new PdfDokument();
  pdf.tekst('Sluttkontroll elektro', { storrelse: 20, fet: true });
  pdf.felt('Utført av', 'Jonas Berg');
  pdf.felt('Målt kortslutningsstrøm', '420 A');
  pdf.signatur([[[10, 40], [40, 15], [70, 45]]]);

  const bytes = pdf.bygg();
  const tekst = Buffer.from(bytes).toString('latin1');

  assert.ok(tekst.startsWith('%PDF-1.4'), 'skal ha PDF-hode');
  assert.ok(tekst.trimEnd().endsWith('%%EOF'), 'skal avsluttes riktig');
  assert.match(tekst, /\/Type \/Catalog/);
  assert.match(tekst, /startxref\n\d+/);
  // æ, ø og å skal ligge som WinAnsi-byte, ikke som UTF-8-par.
  assert.ok(tekst.includes('Utf\xf8rt av'), 'ø skal kodes som ett tegn');
  assert.ok(tekst.includes('M\xe5lt'), 'å skal kodes som ett tegn');
});

test('bytter side når innholdet blir for langt', () => {
  const pdf = new PdfDokument();
  for (let i = 0; i < 120; i++) pdf.felt(`Kontrollpunkt ${i}`, 'Ja');
  const tekst = Buffer.from(pdf.bygg()).toString('latin1');
  const antallSider = (tekst.match(/\/Type \/Page[^s]/g) ?? []).length;
  assert.ok(antallSider > 1, `forventet flere sider, fikk ${antallSider}`);
});

test('xref peker på riktig antall objekter', () => {
  const pdf = new PdfDokument();
  pdf.tekst('Kort skjema');
  const tekst = Buffer.from(pdf.bygg()).toString('latin1');
  const stotte = tekst.match(/xref\n0 (\d+)/);
  assert.ok(stotte, 'skal ha xref-tabell');
  // 1 katalog + 1 sideliste + 2 fonter + 2 per side = 7 for én side
  assert.equal(Number(stotte[1]), 7);
});
