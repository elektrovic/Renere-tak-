import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

/**
 * Lager appikonene uten å dra inn et bildebibliotek.
 * Kjøres med `npm run icons`. Filene sjekkes inn, så dette trengs bare
 * hvis ikonet skal endres.
 */

const BAKGRUNN = [23, 84, 143];
const FORGRUNN = [255, 255, 255];

const LYN = [
  [0.56, 0.16],
  [0.31, 0.55],
  [0.47, 0.55],
  [0.42, 0.86],
  [0.7, 0.45],
  [0.53, 0.45],
];

function innenfor(x, y, punkter) {
  let inne = false;
  for (let i = 0, j = punkter.length - 1; i < punkter.length; j = i++) {
    const [xi, yi] = punkter[i];
    const [xj, yj] = punkter[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inne = !inne;
  }
  return inne;
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const lengde = Buffer.alloc(4);
  lengde.writeUInt32BE(data.length);
  const kropp = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(kropp));
  return Buffer.concat([lengde, kropp, crc]);
}

function lagPng(storrelse) {
  const rader = [];
  const radius = storrelse * 0.22;

  for (let y = 0; y < storrelse; y++) {
    const rad = Buffer.alloc(1 + storrelse * 4);
    for (let x = 0; x < storrelse; x++) {
      const nx = x / storrelse;
      const ny = y / storrelse;

      // Avrundede hjørner
      const dx = Math.max(radius - x, 0, x - (storrelse - radius));
      const dy = Math.max(radius - y, 0, y - (storrelse - radius));
      const utenfor = Math.hypot(dx, dy) > radius;

      const farge = innenfor(nx, ny, LYN) ? FORGRUNN : BAKGRUNN;
      const i = 1 + x * 4;
      rad[i] = farge[0];
      rad[i + 1] = farge[1];
      rad[i + 2] = farge[2];
      rad[i + 3] = utenfor ? 0 : 255;
    }
    rader.push(rad);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(storrelse, 0);
  ihdr.writeUInt32BE(storrelse, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rader), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const storrelse of [192, 512, 180]) {
  const filnavn = storrelse === 180 ? 'public/ikon-180.png' : `public/ikon-${storrelse}.png`;
  writeFileSync(filnavn, lagPng(storrelse));
  console.log('Skrev', filnavn);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#17548F"/><path d="${LYN.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * 100).toFixed(1)} ${(y * 100).toFixed(1)}`).join(' ')}Z" fill="#fff"/></svg>`;
writeFileSync('public/ikon.svg', svg);
console.log('Skrev public/ikon.svg');
