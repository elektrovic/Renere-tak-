/* Servicearbeideren som gjør at appen åpner og virker uten dekning.
   Den mellomlagrer sidene og API-svarene montøren trenger, og lar
   selve sendingen gå gjennom køen i appen (IndexedDB) – ikke her. */

const CACHE = 'montorapp-v1';
const SKALL = ['/', '/jobber', '/timer', '/toppliste', '/kalender', '/manifest.webmanifest', '/ikon.svg'];

self.addEventListener('install', (hendelse) => {
  hendelse.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SKALL).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (hendelse) => {
  hendelse.waitUntil(
    caches
      .keys()
      .then((navn) => Promise.all(navn.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Nett først, med det mellomlagrede som reserve. Brukes på sider og API-lesing. */
async function nettForst(forespørsel) {
  const cache = await caches.open(CACHE);
  try {
    const svar = await fetch(forespørsel);
    if (svar.ok) cache.put(forespørsel, svar.clone());
    return svar;
  } catch (feil) {
    const lagret = await cache.match(forespørsel);
    if (lagret) return lagret;
    if (forespørsel.mode === 'navigate') {
      const forside = await cache.match('/');
      if (forside) return forside;
    }
    throw feil;
  }
}

self.addEventListener('fetch', (hendelse) => {
  const { request } = hendelse;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Innlogging skal aldri mellomlagres.
  if (url.pathname.startsWith('/api/auth') || url.pathname === '/logg-inn') return;

  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/ikon')) {
    hendelse.respondWith(
      caches.match(request).then((lagret) => lagret ?? nettForst(request)),
    );
    return;
  }

  hendelse.respondWith(nettForst(request));
});
