/**
 * Lager en PIN-hash til å lime inn i databasen.
 * Bruk:  node --experimental-strip-types scripts/lag-pin.mjs 4711
 */
import { hashPin } from '../lib/auth/pin.ts';

const pin = process.argv[2];
if (!pin || !/^\d{4,8}$/.test(pin)) {
  console.error('Oppgi en PIN på 4–8 siffer, for eksempel: node --experimental-strip-types scripts/lag-pin.mjs 4711');
  process.exit(1);
}
console.log(hashPin(pin));
