import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoUke, kroner, norskDato, norskUkedag, timer } from '../lib/uke.ts';

test('regner ut ISO-ukenummer', () => {
  assert.equal(isoUke(new Date('2026-01-01')), '2026-W01');
  assert.equal(isoUke(new Date('2026-09-02')), '2026-W36');
  // 1. januar 2027 er en fredag i uke 53 av 2026
  assert.equal(isoUke(new Date('2027-01-01')), '2026-W53');
});

test('skriver dato og ukedag på norsk', () => {
  assert.equal(norskDato('2026-09-02'), '2. september');
  assert.equal(norskUkedag('2026-09-02'), 'onsdag');
});

test('formaterer kroner og timer norsk', () => {
  assert.equal(kroner(1234567), '1 234 567'.replace(/ /g, ' '));
  assert.equal(timer(3.5), '3,5');
  assert.equal(timer(8), '8');
});
