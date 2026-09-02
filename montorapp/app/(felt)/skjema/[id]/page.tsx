'use client';

import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { hent, useHent } from '@/lib/klient';
import { leggIKo, nyLocalId, synk } from '@/lib/offline/ko';
import { Signatur } from '@/components/Signatur';
import type { Prosjekt, SignaturStrok, SkjemaMal, Sporsmal } from '@/lib/types';

type Svarverdi = string | number | boolean | null;

interface ProsjektSvar {
  prosjekt: Prosjekt;
}

/** Felter som kan utledes fylles ut automatisk, så montøren slipper å skrive dem. */
function autoUtfylt(sporsmal: Sporsmal, prosjekt: Prosjekt | undefined): Svarverdi {
  if (!prosjekt) return null;
  if (sporsmal.id === 'sted') return prosjekt.adresse ?? prosjekt.navn;
  return null;
}

export default function SkjemaSide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const prosjektId = Number(id);

  const prosjekt = useHent<ProsjektSvar>(`/api/prosjekt/${prosjektId}`);
  const maler = useHent<{ maler: SkjemaMal[] }>('/api/skjema/maler');

  const [malId, setMalId] = useState<string | null>(null);
  const [steg, setSteg] = useState(0);
  const [svar, setSvar] = useState<Record<string, Svarverdi>>({});
  const [aiForslag, setAiForslag] = useState<Record<string, string>>({});
  const [aiJobber, setAiJobber] = useState(false);
  const [aiFeil, setAiFeil] = useState<string | null>(null);
  const [signatur, setSignatur] = useState<SignaturStrok | null>(null);
  const [signertNavn, setSignertNavn] = useState('');
  const [sendt, setSendt] = useState(false);
  const [sender, setSender] = useState(false);

  const mal = useMemo(
    () => maler.data?.maler.find((m) => m.id === malId) ?? null,
    [maler.data, malId],
  );

  const sporsmal = mal?.sporsmal ?? [];
  const gjeldende = sporsmal[steg];
  const paSignering = Boolean(mal) && steg >= sporsmal.length;

  function settSvar(sporsmalId: string, verdi: Svarverdi) {
    setSvar((f) => ({ ...f, [sporsmalId]: verdi }));
  }

  function velgMal(valgt: SkjemaMal) {
    setMalId(valgt.id);
    setSteg(0);
    const forhandsutfylt: Record<string, Svarverdi> = {};
    for (const s of valgt.sporsmal) {
      const verdi = autoUtfylt(s, prosjekt.data?.prosjekt);
      if (verdi !== null) forhandsutfylt[s.id] = verdi;
    }
    setSvar(forhandsutfylt);
  }

  async function foresla(s: Sporsmal) {
    if (!mal) return;
    setAiJobber(true);
    setAiFeil(null);
    try {
      const resultat = await hent<{ tekst: string; mangler: boolean }>('/api/skjema/ai', {
        method: 'POST',
        body: JSON.stringify({
          malId: mal.id,
          sporsmalId: s.id,
          prosjektId,
          svarSaLangt: svar,
        }),
      });
      setAiForslag((f) => ({ ...f, [s.id]: resultat.tekst }));
      if (resultat.mangler) {
        setAiFeil(resultat.tekst.replace(/^MANGLER:\s*/, 'Assistenten mangler noe: '));
      } else {
        settSvar(s.id, resultat.tekst);
      }
    } catch (f) {
      setAiFeil(f instanceof Error ? f.message : 'Fikk ikke laget forslag.');
    } finally {
      setAiJobber(false);
    }
  }

  async function send() {
    if (!mal) return;
    setSender(true);
    try {
      await leggIKo({
        type: 'skjema',
        localId: nyLocalId(),
        opprettet: new Date().toISOString(),
        data: {
          malId: mal.id,
          prosjektId,
          svar,
          aiForslag,
          signertNavn: signertNavn.trim() || null,
          signatur,
        },
      });
      setSendt(true);
      void synk();
    } finally {
      setSender(false);
    }
  }

  if (prosjekt.laster || maler.laster) return <p className="tom">Henter skjemaene …</p>;
  if (prosjekt.feil) return <p className="melding feil">{prosjekt.feil}</p>;

  if (sendt) {
    return (
      <>
        <div className="melding ok">
          Skjemaet er lagt i kø. Det blir laget som PDF og lastet opp på prosjektet i Tripletex.
        </div>
        <Link href={`/jobber/${prosjektId}`} className="knapp knapp-primar knapp-bred">
          Tilbake til jobben
        </Link>
      </>
    );
  }

  if (!mal) {
    return (
      <>
        <div>
          <span className="nummer">{prosjekt.data?.prosjekt.nummer}</span>
          <h1>Kontrollskjema</h1>
          <p className="svak">{prosjekt.data?.prosjekt.navn}</p>
        </div>
        <div className="liste">
          {(maler.data?.maler ?? []).map((m) => (
            <button key={m.id} type="button" className="jobbkort" onClick={() => velgMal(m)}>
              <span className="jobbkort-navn">{m.navn}</span>
              <span className="jobbkort-under">
                <span>{m.sporsmal.length} spørsmål</span>
              </span>
            </button>
          ))}
        </div>
        {(maler.data?.maler.length ?? 0) === 0 && (
          <p className="tom">Ingen skjemamaler er lagt inn for avdelingen ennå.</p>
        )}
      </>
    );
  }

  const fremdrift = Math.round((Math.min(steg, sporsmal.length) / (sporsmal.length + 1)) * 100);

  return (
    <>
      <div>
        <div className="rad">
          <span className="nummer">{mal.navn}</span>
          <span className="hvisk">
            {Math.min(steg + 1, sporsmal.length + 1)} av {sporsmal.length + 1}
          </span>
        </div>
        <div className="stolpe" style={{ marginTop: 8 }}>
          <span style={{ width: `${fremdrift}%` }} />
        </div>
      </div>

      {!paSignering && gjeldende && (
        <div className="kort">
          <h2>{gjeldende.tekst}</h2>
          {gjeldende.hjelpetekst && <p className="svak">{gjeldende.hjelpetekst}</p>}

          {(gjeldende.type === 'ja_nei' || gjeldende.type === 'ja_nei_ia') && (
            <div className="stabel">
              {(gjeldende.type === 'ja_nei' ? ['ja', 'nei'] : ['ja', 'nei', 'ia']).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`valgknapp ${svar[gjeldende.id] === v ? 'valgt' : ''}`}
                  onClick={() => {
                    settSvar(gjeldende.id, v);
                    setSteg((s) => s + 1);
                  }}
                >
                  {v === 'ja' ? 'Ja' : v === 'nei' ? 'Nei' : 'Ikke aktuelt'}
                </button>
              ))}
            </div>
          )}

          {gjeldende.type === 'valg' && (
            <div className="stabel">
              {(gjeldende.valg ?? []).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`valgknapp ${svar[gjeldende.id] === v ? 'valgt' : ''}`}
                  onClick={() => {
                    settSvar(gjeldende.id, v);
                    setSteg((s) => s + 1);
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {gjeldende.type === 'tall' && (
            <div className="felt">
              <label htmlFor="tallsvar">Verdi {gjeldende.enhet ? `(${gjeldende.enhet})` : ''}</label>
              <input
                id="tallsvar"
                type="number"
                inputMode="decimal"
                step="any"
                value={svar[gjeldende.id] === undefined || svar[gjeldende.id] === null ? '' : String(svar[gjeldende.id])}
                onChange={(e) => settSvar(gjeldende.id, e.target.value === '' ? null : Number(e.target.value))}
                autoFocus
              />
            </div>
          )}

          {gjeldende.type === 'tekst' && (
            <textarea
              value={svar[gjeldende.id] ? String(svar[gjeldende.id]) : ''}
              onChange={(e) => settSvar(gjeldende.id, e.target.value)}
              placeholder={gjeldende.pakrevd ? 'Skriv her' : 'Kan stå tomt'}
            />
          )}

          {gjeldende.type === 'ai_tekst' && (
            <div className="stabel">
              <button
                type="button"
                className="knapp knapp-bred"
                onClick={() => void foresla(gjeldende)}
                disabled={aiJobber}
              >
                {aiJobber ? 'Lager forslag …' : 'Foreslå tekst ut fra det som er ført'}
              </button>
              {aiFeil && <p className="melding advarsel">{aiFeil}</p>}
              <textarea
                value={svar[gjeldende.id] ? String(svar[gjeldende.id]) : ''}
                onChange={(e) => settSvar(gjeldende.id, e.target.value)}
                placeholder="Skriv selv, eller lag et forslag og rett det opp."
              />
              {aiForslag[gjeldende.id] && (
                <p className="hjelpetekst">
                  Forslaget er et utkast. Les gjennom og rett før du går videre – det er du som står
                  for innholdet.
                </p>
              )}
            </div>
          )}

          <div className="knapperad">
            <button
              type="button"
              className="knapp"
              onClick={() => (steg === 0 ? setMalId(null) : setSteg((s) => s - 1))}
            >
              Tilbake
            </button>
            <button
              type="button"
              className="knapp knapp-primar"
              onClick={() => setSteg((s) => s + 1)}
              disabled={
                gjeldende.pakrevd &&
                (svar[gjeldende.id] === undefined ||
                  svar[gjeldende.id] === null ||
                  svar[gjeldende.id] === '')
              }
            >
              Videre
            </button>
          </div>
        </div>
      )}

      {paSignering && (
        <>
          <div className="kort">
            <h2>Se over og signer</h2>
            {sporsmal.map((s) => {
              const v = svar[s.id];
              const tekst =
                v === 'ja' ? 'Ja' : v === 'nei' ? 'Nei' : v === 'ia' ? 'Ikke aktuelt' : v === undefined || v === null || v === '' ? 'Ikke besvart' : String(v);
              return (
                <div key={s.id} className="rad" style={{ borderTop: '1px solid var(--strek)', paddingTop: 8, alignItems: 'flex-start' }}>
                  <span className="svak" style={{ flex: 1 }}>{s.tekst}</span>
                  <button
                    type="button"
                    className="knapp knapp-liten"
                    onClick={() => setSteg(sporsmal.indexOf(s))}
                    style={{ flex: '0 0 auto' }}
                  >
                    Endre
                  </button>
                </div>
              );
            })}
          </div>

          <div className="kort">
            <div className="felt">
              <label htmlFor="signNavn">Hvem signerer?</label>
              <input
                id="signNavn"
                type="text"
                autoComplete="name"
                value={signertNavn}
                onChange={(e) => setSignertNavn(e.target.value)}
              />
            </div>
            <Signatur verdi={signatur} onEndre={setSignatur} />
          </div>

          <div className="knapperad">
            <button type="button" className="knapp" onClick={() => setSteg(sporsmal.length - 1)}>
              Tilbake
            </button>
            <button
              type="button"
              className="knapp knapp-primar"
              onClick={() => void send()}
              disabled={sender || !signatur || signertNavn.trim().length < 2}
            >
              {sender ? 'Lagrer …' : 'Signer og send'}
            </button>
          </div>
        </>
      )}
    </>
  );
}
