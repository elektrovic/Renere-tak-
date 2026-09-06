'use client';

import { useEffect } from 'react';

/**
 * Melder på servicearbeideren som gjør at appen åpner og virker uten nett.
 * Kjører kun i nettleseren, og feiler stille hvis nettleseren ikke støtter det.
 */
export function RegistrerServicearbeider() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const meld = () => navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    if (document.readyState === 'complete') meld();
    else window.addEventListener('load', meld, { once: true });
  }, []);

  return null;
}
