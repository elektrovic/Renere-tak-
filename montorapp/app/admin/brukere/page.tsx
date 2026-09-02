'use client';

import { useState } from 'react';
import { hent, useHent } from '@/lib/klient';
import type { OffentligProfil } from '@/lib/types';

const TOMT = {
  id: '',
  navn: '',
  epost: '',
  tripletexEmployeeId: '',
  rolle: 'montor' as 'montor' | 'admin',
  kalenderfarge: '#17548F',
  pin: '',
};

export default function BrukereSide() {
  const { data, feil, laster, hentPaNytt } = useHent<{ brukere: OffentligProfil[] }>(
    '/api/admin/brukere',
  );
  const [skjema, setSkjema] = useState(TOMT);
  const [melding, setMelding] = useState<string | null>(null);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setMelding(null);
    try {
      await hent('/api/admin/brukere', {
        method: 'POST',
        body: JSON.stringify({
          id: skjema.id || undefined,
          navn: skjema.navn,
          epost: skjema.epost,
          tripletexEmployeeId: Number(skjema.tripletexEmployeeId),
          rolle: skjema.rolle,
          kalenderfarge: skjema.kalenderfarge,
          pin: skjema.pin || undefined,
        }),
      });
      setSkjema(TOMT);
      setMelding('Lagret.');
      hentPaNytt();
    } catch (f) {
      setMelding(f instanceof Error ? f.message : 'Fikk ikke lagret.');
    }
  }

  return (
    <>
      <div>
        <h1>Brukere</h1>
        <p className="svak">
          Ansatt-id må stemme med Tripletex, ellers havner timene på feil person.
        </p>
      </div>

      <form className="kort" onSubmit={lagre}>
        <h2>{skjema.id ? 'Endre bruker' : 'Ny bruker'}</h2>
        <div className="felt">
          <label htmlFor="navn">Navn</label>
          <input id="navn" type="text" value={skjema.navn} onChange={(e) => setSkjema((f) => ({ ...f, navn: e.target.value }))} required />
        </div>
        <div className="felt">
          <label htmlFor="epost">E-post</label>
          <input id="epost" type="email" value={skjema.epost} onChange={(e) => setSkjema((f) => ({ ...f, epost: e.target.value }))} required />
        </div>
        <div className="timerad">
          <div>
            <label htmlFor="ansattid">Ansatt-id i Tripletex</label>
            <input
              id="ansattid"
              type="number"
              inputMode="numeric"
              value={skjema.tripletexEmployeeId}
              onChange={(e) => setSkjema((f) => ({ ...f, tripletexEmployeeId: e.target.value }))}
              required
            />
          </div>
          <div>
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder={skjema.id ? 'Uendret' : '4 siffer'}
              value={skjema.pin}
              onChange={(e) => setSkjema((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
            />
          </div>
        </div>
        <div className="timerad">
          <div>
            <label htmlFor="rolle">Rolle</label>
            <select
              id="rolle"
              value={skjema.rolle}
              onChange={(e) => setSkjema((f) => ({ ...f, rolle: e.target.value as 'montor' | 'admin' }))}
            >
              <option value="montor">Montør</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label htmlFor="farge">Kalenderfarge</label>
            <input
              id="farge"
              type="color"
              value={skjema.kalenderfarge}
              onChange={(e) => setSkjema((f) => ({ ...f, kalenderfarge: e.target.value }))}
              style={{ minHeight: 52, padding: 6 }}
            />
          </div>
        </div>
        {melding && <p className="melding info">{melding}</p>}
        <div className="knapperad">
          <button className="knapp knapp-primar">Lagre</button>
          {skjema.id && (
            <button type="button" className="knapp" onClick={() => setSkjema(TOMT)}>
              Avbryt
            </button>
          )}
        </div>
      </form>

      {laster && <p className="tom">Henter …</p>}
      {feil && <p className="melding feil">{feil}</p>}

      <div className="tabellrull">
        <table>
          <thead>
            <tr>
              <th>Navn</th>
              <th>E-post</th>
              <th className="tall">Ansatt-id</th>
              <th>Rolle</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data?.brukere ?? []).map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="prikk" style={{ background: b.kalenderfarge, display: 'inline-block', marginRight: 8 }} />
                  {b.navn}
                </td>
                <td>{b.epost}</td>
                <td className="tall">{b.tripletexEmployeeId}</td>
                <td>{b.rolle === 'admin' ? 'Administrator' : 'Montør'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="knapp knapp-liten"
                    onClick={() =>
                      setSkjema({
                        id: b.id,
                        navn: b.navn,
                        epost: b.epost,
                        tripletexEmployeeId: String(b.tripletexEmployeeId),
                        rolle: b.rolle,
                        kalenderfarge: b.kalenderfarge,
                        pin: '',
                      })
                    }
                  >
                    Endre
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
