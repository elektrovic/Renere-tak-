'use client';

import { useState } from 'react';
import { hent, useHent } from '@/lib/klient';
import { norskDato, norskUkedag } from '@/lib/uke';
import type { JobbKort } from '@/lib/jobber';
import type { KalenderHendelse } from '@/lib/types';

interface KalenderSvar {
  hendelser: KalenderHendelse[];
  montorer: Array<{ id: string; navn: string; farge: string; rolle: string }>;
}

function idagIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function PlanleggingSide() {
  const kalender = useHent<KalenderSvar>('/api/kalender');
  const jobber = useHent<{ jobber: JobbKort[] }>('/api/jobber');

  const [skjema, setSkjema] = useState({
    profilId: '',
    prosjektId: '',
    dato: idagIso(),
    fra: '07:00',
    til: '15:00',
    notat: '',
  });
  const [melding, setMelding] = useState<string | null>(null);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setMelding(null);
    const prosjekt = jobber.data?.jobber.find((j) => String(j.prosjekt.id) === skjema.prosjektId);
    try {
      await hent('/api/kalender', {
        method: 'POST',
        body: JSON.stringify({
          profilId: skjema.profilId,
          prosjektId: prosjekt ? prosjekt.prosjekt.id : null,
          tittel: prosjekt ? prosjekt.prosjekt.navn : 'Oppdrag',
          start: new Date(`${skjema.dato}T${skjema.fra}`).toISOString(),
          slutt: new Date(`${skjema.dato}T${skjema.til}`).toISOString(),
          notat: skjema.notat || null,
        }),
      });
      setMelding('Lagt i kalenderen.');
      kalender.hentPaNytt();
    } catch (f) {
      setMelding(f instanceof Error ? f.message : 'Fikk ikke lagret.');
    }
  }

  const farge = new Map((kalender.data?.montorer ?? []).map((m) => [m.id, m.farge]));
  const navn = new Map((kalender.data?.montorer ?? []).map((m) => [m.id, m.navn]));

  return (
    <>
      <div>
        <h1>Planlegging</h1>
        <p className="svak">Hvem er hvor, når. Fargen følger montøren.</p>
      </div>

      <form className="kort" onSubmit={lagre}>
        <div className="timerad">
          <div>
            <label htmlFor="montor">Montør</label>
            <select
              id="montor"
              value={skjema.profilId}
              onChange={(e) => setSkjema((f) => ({ ...f, profilId: e.target.value }))}
              required
            >
              <option value="">Velg …</option>
              {(kalender.data?.montorer ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.navn}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dato">Dato</label>
            <input
              id="dato"
              type="date"
              value={skjema.dato}
              onChange={(e) => setSkjema((f) => ({ ...f, dato: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="felt">
          <label htmlFor="prosjekt">Prosjekt</label>
          <select
            id="prosjekt"
            value={skjema.prosjektId}
            onChange={(e) => setSkjema((f) => ({ ...f, prosjektId: e.target.value }))}
          >
            <option value="">Uten prosjekt</option>
            {(jobber.data?.jobber ?? []).map((j) => (
              <option key={j.prosjekt.id} value={j.prosjekt.id}>
                {j.prosjekt.nummer} – {j.prosjekt.navn}
              </option>
            ))}
          </select>
        </div>

        <div className="timerad">
          <div>
            <label htmlFor="fra">Fra</label>
            <input id="fra" type="time" value={skjema.fra} onChange={(e) => setSkjema((f) => ({ ...f, fra: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="til">Til</label>
            <input id="til" type="time" value={skjema.til} onChange={(e) => setSkjema((f) => ({ ...f, til: e.target.value }))} />
          </div>
        </div>

        {melding && <p className="melding info">{melding}</p>}
        <button className="knapp knapp-primar knapp-bred">Legg i kalenderen</button>
      </form>

      <section className="stabel">
        <h2>Planlagt framover</h2>
        {kalender.laster && <p className="tom">Henter …</p>}
        <div className="liste">
          {(kalender.data?.hendelser ?? [])
            .filter((h) => h.slutt >= new Date().toISOString())
            .slice(0, 40)
            .map((h) => (
              <div key={h.id} className="kort kort-tett">
                <div className="rad">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="prikk" style={{ background: farge.get(h.profilId) ?? '#888' }} />
                    <div>
                      <strong>{h.tittel}</strong>
                      <div className="hvisk" style={{ textTransform: 'capitalize' }}>
                        {navn.get(h.profilId)} · {norskUkedag(h.start.slice(0, 10))}{' '}
                        {norskDato(h.start.slice(0, 10))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="knapp knapp-liten knapp-fare"
                    onClick={async () => {
                      await hent(`/api/kalender?id=${h.id}`, { method: 'DELETE' });
                      kalender.hentPaNytt();
                    }}
                  >
                    Fjern
                  </button>
                </div>
              </div>
            ))}
        </div>
      </section>
    </>
  );
}
