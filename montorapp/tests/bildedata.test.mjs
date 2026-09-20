import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lesDataUrl } from '../lib/bildedata.ts';

// Et gyldig, bittelite bilde (1×1 piksel GIF) holder for å teste tolkningen.
const ETT_BILDE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

test('leser innhold og filtype fra en data-URL', () => {
  const bilde = lesDataUrl(ETT_BILDE);
  assert.ok(bilde, 'skal tolkes');
  assert.equal(bilde.type, 'image/gif');
  assert.ok(bilde.bytes.byteLength > 20);
  // GIF-filer starter med «GIF»
  assert.equal(Buffer.from(bilde.bytes.slice(0, 3)).toString('latin1'), 'GIF');
});

test('godtar jpeg og png', () => {
  assert.equal(lesDataUrl('data:image/jpeg;base64,/9j/4AAQ')?.type, 'image/jpeg');
  assert.equal(lesDataUrl('data:image/png;base64,iVBORw0KGgo=')?.type, 'image/png');
});

test('avviser alt som ikke er et bilde', () => {
  assert.equal(lesDataUrl('data:text/html;base64,PHNjcmlwdD4='), null, 'html');
  assert.equal(lesDataUrl('data:application/pdf;base64,JVBERi0='), null, 'pdf');
  assert.equal(lesDataUrl('https://example.com/bilde.jpg'), null, 'vanlig lenke');
  assert.equal(lesDataUrl(''), null, 'tom streng');
  assert.equal(lesDataUrl('tillegg/abc/1.jpg'), null, 'en sti som allerede er lagret');
});

test('avviser ødelagt base64', () => {
  assert.equal(lesDataUrl('data:image/jpeg;base64,!!!ikke base64!!!'), null);
  assert.equal(lesDataUrl('data:image/jpeg;base64,'), null);
});
