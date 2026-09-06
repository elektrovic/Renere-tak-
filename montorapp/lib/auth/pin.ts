import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Montørene logger inn med e-post og en firesifret PIN. Det er raskt på mobil
 * med hansker, og krever ingen e-postrunde ute i felt.
 *
 * PIN-en lagres aldri i klartekst – bare som scrypt-hash med eget salt.
 */

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function sjekkPin(pin: string, lagret: string): boolean {
  const [algoritme, saltHex, hashHex] = lagret.split('$');
  if (algoritme !== 'scrypt' || !saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const forventet = Buffer.from(hashHex, 'hex');
  const faktisk = scryptSync(pin, salt, forventet.length);
  return forventet.length === faktisk.length && timingSafeEqual(forventet, faktisk);
}

export function gyldigPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}
