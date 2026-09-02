import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lagToken, lesToken } from '../lib/auth/token.ts';

const HEMMELIGHET = 'test-hemmelighet';

test('leser tilbake profil-id fra eget token', () => {
  const token = lagToken('profil-2', HEMMELIGHET);
  assert.equal(lesToken(token, HEMMELIGHET), 'profil-2');
});

test('avviser token signert med annen nøkkel', () => {
  const token = lagToken('profil-2', HEMMELIGHET);
  assert.equal(lesToken(token, 'en-annen-nokkel'), null);
});

test('avviser tuklet profil-id', () => {
  const token = lagToken('profil-2', HEMMELIGHET);
  const tuklet = token.replace('profil-2', 'profil-1');
  assert.equal(lesToken(tuklet, HEMMELIGHET), null);
});

test('avviser utløpt token', () => {
  const forLengeSiden = Date.now() - 200 * 24 * 60 * 60 * 1000;
  const token = lagToken('profil-2', HEMMELIGHET, forLengeSiden);
  assert.equal(lesToken(token, HEMMELIGHET), null);
});

test('avviser tomt og misformet token', () => {
  assert.equal(lesToken(undefined, HEMMELIGHET), null);
  assert.equal(lesToken('', HEMMELIGHET), null);
  assert.equal(lesToken('bare.to', HEMMELIGHET), null);
});
