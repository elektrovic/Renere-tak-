/** ISO-ukenummer på formen 2026-W36. Brukes til ukens mål. */
export function isoUke(dato: Date = new Date()): string {
  const d = new Date(Date.UTC(dato.getFullYear(), dato.getMonth(), dato.getDate()));
  const ukedag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - ukedag);
  const arStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const uke = Math.ceil(((d.getTime() - arStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(uke).padStart(2, '0')}`;
}

export function idag(): string {
  return new Date().toISOString().slice(0, 10);
}

export function datoMinus(dager: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dager);
  return d.toISOString().slice(0, 10);
}

export function forsteIManeden(dato: Date = new Date()): string {
  return `${dato.toISOString().slice(0, 7)}-01`;
}

const UKEDAGER = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MANEDER = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

export function norskDato(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()}. ${MANEDER[d.getMonth()]}`;
}

export function norskUkedag(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return UKEDAGER[d.getDay()];
}

export function kroner(belop: number): string {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(belop));
}

export function timer(t: number): string {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(t);
}
