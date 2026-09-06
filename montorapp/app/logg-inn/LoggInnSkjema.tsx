'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hent } from '@/lib/klient';

interface Props {
  demo: boolean;
  demoPin: string;
  demoBrukere: Array<{ epost: string; navn: string; rolle: string }>;
}

export function LoggInnSkjema({ demo, demoPin, demoBrukere }: Props) {
  const router = useRouter();
  const [epost, setEpost] = useState('');
  const [pin, setPin] = useState('');
  const [feil, setFeil] = useState<string | null>(null);
  const [sender, setSender] = useState(false);

  async function loggInn(e: React.FormEvent) {
    e.preventDefault();
    setSender(true);
    setFeil(null);
    try {
      await hent('/api/auth/logg-inn', {
        method: 'POST',
        body: JSON.stringify({ epost, pin }),
      });
      router.replace('/');
      router.refresh();
    } catch (f) {
      setFeil(f instanceof Error ? f.message : 'Fikk ikke logget inn.');
    } finally {
      setSender(false);
    }
  }

  return (
    <div className="skall">
      <main className="innhold" style={{ justifyContent: 'center', paddingTop: 48 }}>
        <div className="midt" style={{ marginBottom: 8 }}>
          <h1>Montørappen</h1>
          <p className="svak" style={{ marginTop: 6 }}>Halland Gruppen</p>
        </div>

        <form className="kort" onSubmit={loggInn}>
          <div className="felt">
            <label htmlFor="epost">E-post</label>
            <input
              id="epost"
              type="email"
              inputMode="email"
              autoComplete="username"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              required
            />
          </div>

          <div className="felt">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="\d*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="hjelpetekst">Fire siffer. Får du den ikke til, ring kontoret.</p>
          </div>

          {feil && <p className="melding feil">{feil}</p>}

          <button className="knapp knapp-primar knapp-bred" disabled={sender || pin.length < 4}>
            {sender ? 'Logger inn …' : 'Logg inn'}
          </button>
        </form>

        {demo && (
          <div className="kort">
            <h3>Demomodus</h3>
            <p className="svak">
              Appen kjører med testdata. PIN for alle er <strong>{demoPin}</strong>. Trykk på et navn
              for å fylle inn.
            </p>
            <div className="liste">
              {demoBrukere.map((b) => (
                <button
                  key={b.epost}
                  type="button"
                  className="jobbkort"
                  onClick={() => {
                    setEpost(b.epost);
                    setPin(demoPin);
                  }}
                >
                  <span className="jobbkort-navn">{b.navn}</span>
                  <span className="jobbkort-under">
                    <span>{b.epost}</span>
                    <span className="merkelapp">{b.rolle === 'admin' ? 'Admin' : 'Montør'}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
