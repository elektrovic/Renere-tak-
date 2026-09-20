import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gyldigPin, hashPin, sjekkPin } from '../lib/auth/pin.ts';

test('godtar riktig PIN og avviser feil', () => {
  const lagret = hashPin('4711');
  assert.ok(sjekkPin('4711', lagret));
  assert.ok(!sjekkPin('4712', lagret));
  assert.ok(!sjekkPin('', lagret));
});

test('lagrer aldri PIN i klartekst', () => {
  const lagret = hashPin('1234');
  assert.ok(!lagret.includes('1234'));
  assert.ok(lagret.startsWith('scrypt$'));
});

test('samme PIN gir ulik hash (eget salt)', () => {
  assert.notEqual(hashPin('1234'), hashPin('1234'));
});

test('krever fire til åtte siffer', () => {
  assert.ok(gyldigPin('1234'));
  assert.ok(gyldigPin('12345678'));
  assert.ok(!gyldigPin('123'));
  assert.ok(!gyldigPin('12a4'));
  assert.ok(!gyldigPin('123456789'));
});

test('tåler ødelagt lagret verdi', () => {
  assert.ok(!sjekkPin('1234', 'tull'));
  assert.ok(!sjekkPin('1234', 'scrypt$'));
});
