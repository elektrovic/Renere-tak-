'use client';

import { useCallback, useEffect, useState } from 'react';
import { alleIKo, lyttPaKo, slettSendte, synk, type KoRad } from '@/lib/offline/ko';

/**
 * Statuslinja montøren alltid ser: hvor mye som ligger i kø, hva som sendes,
 * og hva som eventuelt feilet. Den skjuler seg når alt er sendt.
 */
export function KoLinje() {
  const [rader, setRader] = useState<KoRad[]>([]);
  const [sender, setSender] = useState(false);
  const [nett, setNett] = useState(true);

  const les = useCallback(async () => {
    try {
      setRader(await alleIKo());
    } catch {
      /* IndexedDB kan være sperret i privat modus – da viser vi ingenting */
    }
  }, []);

  const send = useCallback(
    async (inkluderFeilede = false) => {
      setSender(true);
      try {
        await synk(inkluderFeilede);
      } finally {
        setSender(false);
        await les();
      }
    },
    [les],
  );

  useEffect(() => {
    void les();
    void slettSendte();
    const av = lyttPaKo(() => void les());

    const paNett = () => {
      setNett(true);
      void send();
    };
    const avNett = () => setNett(false);
    const synlig = () => {
      if (document.visibilityState === 'visible') void send();
    };

    setNett(navigator.onLine);
    window.addEventListener('online', paNett);
    window.addEventListener('offline', avNett);
    document.addEventListener('visibilitychange', synlig);
    void send();

    const intervall = setInterval(() => void send(), 60_000);

    return () => {
      av();
      window.removeEventListener('online', paNett);
      window.removeEventListener('offline', avNett);
      document.removeEventListener('visibilitychange', synlig);
      clearInterval(intervall);
    };
  }, [les, send]);

  const iKo = rader.filter((r) => r.status === 'i_ko' || r.status === 'sender').length;
  const feilet = rader.filter((r) => r.status === 'feilet');

  if (iKo === 0 && feilet.length === 0) return null;

  if (feilet.length > 0) {
    return (
      <div className="kolinje feil">
        <div className="kolinje-inner">
          <span>
            {feilet.length === 1 ? '1 registrering ble ikke sendt' : `${feilet.length} registreringer ble ikke sendt`}
            {feilet[0].feilmelding ? ` – ${feilet[0].feilmelding}` : ''}
          </span>
          <button type="button" className="knapp knapp-liten" onClick={() => void send(true)} disabled={sender}>
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`kolinje ${sender ? 'sender' : 'venter'}`}>
      <div className="kolinje-inner">
        <span>
          {sender ? 'Sender …' : nett ? `${iKo} i kø` : `${iKo} i kø – venter på nett`}
        </span>
        {!sender && nett && (
          <button type="button" className="knapp knapp-liten" onClick={() => void send()}>
            Send nå
          </button>
        )}
      </div>
    </div>
  );
}
