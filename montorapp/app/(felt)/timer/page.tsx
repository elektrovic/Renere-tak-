'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useHent } from '@/lib/klient';
import { leggIKo, nyLocalId, synk } from '@/lib/offline/ko';
import { norskDato, timer as formaterTimer } from '@/lib/uke';
import type { JobbKort } from '@/lib/jobber';
import type { Aktivitet } from '@/lib/types';

interface JobbSvar {
  jobber: JobbKort[];
  aktiviteter: Aktivitet[];
  timerIDag: number;
  dato: string;
}

interface Rad {
  prosjektId: number;
  timer: number;
  aktivitetId: number;
  kommentar: string;
}

const HURTIGTIMER = [1, 2, 3.5, 4, 6, 7.5];

function idagIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function igarIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function TimerSide() {
  const { data, feil, laster } = useHent<JobbSvar>('/api/jobber');
  const [dato, setDato] = useState(idagIso());
  const [rader, setRader] = useState<Rad[]>([]);
  const [sender, setSender] = useState(false);
  const [kvittering, setKvittering] = useState<string | null>(null);
  const [visAlle, setVisAlle] = useState(false);

  // Vi måler hvor lang tid selve registreringen tar, slik at vi kan se om
  // appen faktisk sparer tid sammenliknet med dagens rutine.
  const startet = useRef(Date.now());
  useEffect(() => {
    startet.current = Date.now();
  }, []);

  const jobber = data?.jobber ?? [];
  const foreslatte = useMemo(
    () => (visAlle ? jobber : jobber.filter((j) => j.merke !== null).slice(0, 8)),
    [jobber, visAlle],
  );

  const standardAktivitet = data?.aktiviteter[0]?.id ?? 0;

  function veksle(jobb: JobbKort) {
    setKvittering(null);
    setRader((f) => {
      if (f.some((r) => r.prosjektId === jobb.prosjekt.id)) {
        return f.filter((r) => r.prosjektId !== jobb.prosjekt.id);
      }
      return [
        ...f,
        {
          prosjektId: jobb.prosjekt.id,
          // Forslaget er det montøren pleier å føre på nettopp denne jobben.
          timer: jobb.vanligTimer ?? 3.5,
          aktivitetId: jobb.vanligAktivitetId ?? standardAktivitet,
          kommentar: '',
        },
      ];
    });
  }

  function endre(prosjektId: number, endring: Partial<Rad>) {
    setRader((f) => f.map((r) => (r.prosjektId === prosjektId ? { ...r, ...endring } : r)));
  }

  const sum = rader.reduce((s, r) => s + r.timer, 0);

  async function send() {
    if (rader.length === 0) return;
    setSender(true);
    const brukt = Date.now() - startet.current;

    try {
      for (const rad of rader) {
        await leggIKo({
          type: 'timeforing',
          localId: nyLocalId(),
          opprettet: new Date().toISOString(),
          data: {
            prosjektId: rad.prosjektId,
            aktivitetId: rad.aktivitetId,
            dato,
            timer: rad.timer,
            kommentar: rad.kommentar.trim() || null,
            // Tiden fordeles på føringene, så tallet blir sammenliknbart per registrering.
            registreringMs: Math.round(brukt / rader.length),
          },
        });
      }

      setKvittering(
        `${rader.length === 1 ? '1 føring' : `${rader.length} føringer`} lagt i kø – ${formaterTimer(sum)} timer.`,
      );
      setRader([]);
      startet.current = Date.now();
      void synk();
    } finally {
      setSender(false);
    }
  }

  return (
    <>
      <div>
        <h1>Før timer</h1>
        <p className="svak">Velg jobbene du har vært på, sett timer, og send alt i én operasjon.</p>
      </div>

      <div className="kort kort-tett">
        <label htmlFor="dato">Dato</label>
        <div className="knapperad">
          <button
            type="button"
            className={`knapp ${dato === idagIso() ? 'knapp-primar' : ''}`}
            onClick={() => setDato(idagIso())}
          >
            I dag
          </button>
          <button
            type="button"
            className={`knapp ${dato === igarIso() ? 'knapp-primar' : ''}`}
            onClick={() => setDato(igarIso())}
          >
            I går
          </button>
        </div>
        <input
          id="dato"
          type="date"
          value={dato}
          max={idagIso()}
          onChange={(e) => setDato(e.target.value)}
          style={{ marginTop: 10 }}
        />
        {data && dato === idagIso() && (
          <p className="hjelpetekst">
            Du har ført {formaterTimer(data.timerIDag)} timer i dag fra før.
          </p>
        )}
      </div>

      {laster && <p className="tom">Henter jobbene dine …</p>}
      {feil && <p className="melding feil">{feil}</p>}
      {kvittering && <p className="melding ok">{kvittering}</p>}

      {data && (
        <section className="stabel">
          <h2>Hvilke jobber?</h2>
          <div className="liste">
            {foreslatte.map((j) => {
              const valgt = rader.find((r) => r.prosjektId === j.prosjekt.id);
              return (
                <div key={j.prosjekt.id}>
                  <button
                    type="button"
                    className={`jobbkort ${valgt ? 'valgt' : ''}`}
                    onClick={() => veksle(j)}
                    aria-pressed={Boolean(valgt)}
                  >
                    <span className="jobbkort-navn">{j.prosjekt.navn}</span>
                    <span className="jobbkort-under">
                      <span className="nummer">{j.prosjekt.nummer}</span>
                      <span>{j.prosjekt.kunde}</span>
                      {j.merke === 'i_dag' && <span className="merkelapp merke">I dag</span>}
                      {j.merke === 'i_gar' && <span className="merkelapp merke">I går</span>}
                      {j.vanligTimer && <span>Pleier {formaterTimer(j.vanligTimer)} t</span>}
                    </span>
                  </button>

                  {valgt && (
                    <div className="kort" style={{ marginTop: 8 }}>
                      <div className="timerad">
                        <div>
                          <label htmlFor={`akt-${j.prosjekt.id}`}>Aktivitet</label>
                          <select
                            id={`akt-${j.prosjekt.id}`}
                            value={valgt.aktivitetId}
                            onChange={(e) => endre(j.prosjekt.id, { aktivitetId: Number(e.target.value) })}
                          >
                            {data.aktiviteter.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.navn}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`t-${j.prosjekt.id}`}>Timer</label>
                          <input
                            id={`t-${j.prosjekt.id}`}
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min="0"
                            max="24"
                            value={valgt.timer}
                            onChange={(e) => endre(j.prosjekt.id, { timer: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="timerknapper">
                        <button
                          type="button"
                          className="knapp"
                          onClick={() => endre(j.prosjekt.id, { timer: Math.max(0, valgt.timer - 0.5) })}
                          aria-label="En halvtime mindre"
                        >
                          −½
                        </button>
                        {HURTIGTIMER.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`knapp ${valgt.timer === t ? 'knapp-primar' : ''}`}
                            onClick={() => endre(j.prosjekt.id, { timer: t })}
                          >
                            {formaterTimer(t)}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="knapp"
                          onClick={() => endre(j.prosjekt.id, { timer: valgt.timer + 0.5 })}
                          aria-label="En halvtime mer"
                        >
                          +½
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Kommentar (valgfritt)"
                        value={valgt.kommentar}
                        onChange={(e) => endre(j.prosjekt.id, { kommentar: e.target.value })}
                        aria-label="Kommentar"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!visAlle && jobber.length > foreslatte.length && (
            <button type="button" className="knapp knapp-bred" onClick={() => setVisAlle(true)}>
              Vis alle {jobber.length} jobbene
            </button>
          )}
        </section>
      )}

      {rader.length > 0 && (
        <div className="kort">
          <div className="rad">
            <strong>
              {rader.length} {rader.length === 1 ? 'jobb' : 'jobber'} · {norskDato(dato)}
            </strong>
            <span className="tall-tabell">{formaterTimer(sum)} timer</span>
          </div>
          <button
            type="button"
            className="knapp knapp-primar knapp-bred"
            onClick={() => void send()}
            disabled={sender || sum <= 0}
          >
            {sender ? 'Lagrer …' : `Send ${formaterTimer(sum)} timer`}
          </button>
          <p className="hjelpetekst">
            Timene legges i kø med én gang og sendes til Tripletex så snart du har dekning.
          </p>
        </div>
      )}
    </>
  );
}
