'use client';

import Link from 'next/link';
import { Suspense, use, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useHent } from '@/lib/klient';
import { leggIKo, nyLocalId, synk } from '@/lib/offline/ko';
import { kroner } from '@/lib/uke';
import { Signatur } from '@/components/Signatur';
import { Kamera } from '@/components/Kamera';
import type { PrislinjeMal, Prosjekt, SignaturStrok, TilleggLinje } from '@/lib/types';

interface ProsjektSvar {
  prosjekt: Prosjekt;
}

type Steg = 'linjer' | 'bilde' | 'signatur' | 'ferdig';

function TilleggFlyt({ prosjektId }: { prosjektId: number }) {
  const parametre = useSearchParams();
  const type = parametre.get('type') === 'materiell' ? 'materiell' : 'tillegg';

  const prosjekt = useHent<ProsjektSvar>(`/api/prosjekt/${prosjektId}`);
  const prisliste = useHent<{ prisliste: PrislinjeMal[] }>('/api/prisliste');

  const [linjer, setLinjer] = useState<TilleggLinje[]>([]);
  const [steg, setSteg] = useState<Steg>('linjer');
  const [bilder, setBilder] = useState<string[]>([]);
  const [signatur, setSignatur] = useState<SignaturStrok | null>(null);
  const [signertNavn, setSignertNavn] = useState('');
  const [fritekst, setFritekst] = useState({ beskrivelse: '', pris: '', antall: '1' });
  const [sender, setSender] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  const startet = useRef(Date.now());
  useEffect(() => {
    startet.current = Date.now();
  }, []);

  const sum = useMemo(() => linjer.reduce((s, l) => s + l.antall * l.enhetspris, 0), [linjer]);

  function leggTilFraPrisliste(vare: PrislinjeMal) {
    setLinjer((f) => {
      const eksisterende = f.find((l) => l.prislinjeId === vare.id);
      if (eksisterende) {
        return f.map((l) => (l.prislinjeId === vare.id ? { ...l, antall: l.antall + 1 } : l));
      }
      return [
        ...f,
        {
          id: nyLocalId(),
          beskrivelse: vare.navn,
          antall: 1,
          enhet: vare.enhet,
          enhetspris: vare.pris,
          prislinjeId: vare.id,
        },
      ];
    });
  }

  function leggTilFritekst() {
    const pris = Number(fritekst.pris.replace(',', '.'));
    const antall = Number(fritekst.antall.replace(',', '.'));
    if (!fritekst.beskrivelse.trim() || !Number.isFinite(pris) || pris <= 0) {
      setFeil('Skriv hva det gjelder og en pris over null.');
      return;
    }
    setFeil(null);
    setLinjer((f) => [
      ...f,
      {
        id: nyLocalId(),
        beskrivelse: fritekst.beskrivelse.trim(),
        antall: Number.isFinite(antall) && antall > 0 ? antall : 1,
        enhet: 'stk',
        enhetspris: pris,
        prislinjeId: null,
      },
    ]);
    setFritekst({ beskrivelse: '', pris: '', antall: '1' });
  }

  async function send() {
    setSender(true);
    setFeil(null);
    try {
      await leggIKo({
        type: 'tillegg',
        localId: nyLocalId(),
        opprettet: new Date().toISOString(),
        data: {
          prosjektId,
          type,
          linjer,
          signertNavn: signertNavn.trim() || null,
          signatur,
          bilder,
          registreringMs: Date.now() - startet.current,
        },
      });
      setSteg('ferdig');
      void synk();
    } catch {
      setFeil('Fikk ikke lagret. Prøv igjen.');
    } finally {
      setSender(false);
    }
  }

  if (prosjekt.laster) return <p className="tom">Henter prosjektet …</p>;
  if (prosjekt.feil) return <p className="melding feil">{prosjekt.feil}</p>;

  if (steg === 'ferdig') {
    return (
      <>
        <div className="melding ok">
          {type === 'materiell' ? 'Materiellet' : 'Tillegget'} på {kroner(sum)} kr er lagt i kø og
          sendes til Tripletex som ordrelinjer.
        </div>
        <div className="knapperad">
          <Link href={`/jobber/${prosjektId}`} className="knapp knapp-primar">
            Tilbake til jobben
          </Link>
          <Link href="/toppliste" className="knapp">
            Se topplista
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <span className="nummer">{prosjekt.data?.prosjekt.nummer}</span>
        <h1>{type === 'materiell' ? 'Registrer materiell' : 'Registrer tillegg'}</h1>
        <p className="svak">{prosjekt.data?.prosjekt.navn}</p>
      </div>

      {feil && <p className="melding feil">{feil}</p>}

      {steg === 'linjer' && (
        <>
          {linjer.length > 0 && (
            <div className="kort">
              <h2>Dette registreres</h2>
              {linjer.map((l) => (
                <div key={l.id} className="rad" style={{ borderTop: '1px solid var(--strek)', paddingTop: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.beskrivelse}</div>
                    <div className="hvisk">
                      {l.antall} {l.enhet} × {kroner(l.enhetspris)} kr
                    </div>
                  </div>
                  <div className="knapperad" style={{ flex: '0 0 auto' }}>
                    <button
                      type="button"
                      className="knapp knapp-liten"
                      onClick={() =>
                        setLinjer((f) =>
                          f
                            .map((x) => (x.id === l.id ? { ...x, antall: x.antall - 1 } : x))
                            .filter((x) => x.antall > 0),
                        )
                      }
                      aria-label="Færre"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="knapp knapp-liten"
                      onClick={() =>
                        setLinjer((f) => f.map((x) => (x.id === l.id ? { ...x, antall: x.antall + 1 } : x)))
                      }
                      aria-label="Flere"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <div className="rad" style={{ borderTop: '2px solid var(--strek-sterk)', paddingTop: 10 }}>
                <strong>Sum</strong>
                <strong className="tall-tabell">{kroner(sum)} kr</strong>
              </div>
            </div>
          )}

          <section className="stabel">
            <h2>Fra prislista</h2>
            <div className="liste">
              {(prisliste.data?.prisliste ?? []).map((vare) => (
                <button
                  key={vare.id}
                  type="button"
                  className="jobbkort"
                  onClick={() => leggTilFraPrisliste(vare)}
                >
                  <span className="jobbkort-navn">{vare.navn}</span>
                  <span className="jobbkort-under">
                    <span>
                      {kroner(vare.pris)} kr per {vare.enhet}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="kort">
            <h2>Eller skriv inn selv</h2>
            <div className="felt">
              <label htmlFor="fritekst">Hva gjelder det?</label>
              <input
                id="fritekst"
                type="text"
                value={fritekst.beskrivelse}
                onChange={(e) => setFritekst((f) => ({ ...f, beskrivelse: e.target.value }))}
              />
            </div>
            <div className="timerad">
              <div>
                <label htmlFor="pris">Pris per stk (kr)</label>
                <input
                  id="pris"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={fritekst.pris}
                  onChange={(e) => setFritekst((f) => ({ ...f, pris: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="antall">Antall</label>
                <input
                  id="antall"
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={fritekst.antall}
                  onChange={(e) => setFritekst((f) => ({ ...f, antall: e.target.value }))}
                />
              </div>
            </div>
            <button type="button" className="knapp knapp-bred" onClick={leggTilFritekst}>
              Legg til
            </button>
          </section>

          <button
            type="button"
            className="knapp knapp-primar knapp-bred"
            disabled={linjer.length === 0}
            onClick={() => setSteg('bilde')}
          >
            Videre – {kroner(sum)} kr
          </button>
        </>
      )}

      {steg === 'bilde' && (
        <>
          <div className="kort">
            <h2>Ta bilde</h2>
            <p className="svak">
              {type === 'materiell'
                ? 'Bilde er valgfritt på materiell.'
                : 'Ta bilde av det som er gjort. Da slipper du diskusjonen etterpå.'}
            </p>
            <Kamera bilder={bilder} onEndre={setBilder} />
          </div>
          <div className="knapperad">
            <button type="button" className="knapp" onClick={() => setSteg('linjer')}>
              Tilbake
            </button>
            <button
              type="button"
              className="knapp knapp-primar"
              onClick={() => (type === 'materiell' ? void send() : setSteg('signatur'))}
              disabled={sender}
            >
              {type === 'materiell' ? 'Send' : 'Videre til signering'}
            </button>
          </div>
        </>
      )}

      {steg === 'signatur' && (
        <>
          <div className="kort">
            <h2>Kunden signerer</h2>
            <p className="svak">
              {kroner(sum)} kr. Signaturen er obligatorisk på tillegg – vis skjermen til kunden.
            </p>
            <div className="felt">
              <label htmlFor="signertNavn">Hvem signerer?</label>
              <input
                id="signertNavn"
                type="text"
                autoComplete="name"
                value={signertNavn}
                onChange={(e) => setSignertNavn(e.target.value)}
                placeholder="Navn på den som godkjenner"
              />
            </div>
            <Signatur verdi={signatur} onEndre={setSignatur} />
          </div>

          <div className="knapperad">
            <button type="button" className="knapp" onClick={() => setSteg('bilde')}>
              Tilbake
            </button>
            <button
              type="button"
              className="knapp knapp-primar"
              onClick={() => void send()}
              disabled={sender || !signatur || signertNavn.trim().length < 2}
            >
              {sender ? 'Lagrer …' : 'Send tillegget'}
            </button>
          </div>
          {(!signatur || signertNavn.trim().length < 2) && (
            <p className="hjelpetekst">Fyll inn navn og la kunden signere for å sende.</p>
          )}
        </>
      )}
    </>
  );
}

export default function TilleggSide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<p className="tom">Laster …</p>}>
      <TilleggFlyt prosjektId={Number(id)} />
    </Suspense>
  );
}
