'use client';

import { useState } from 'react';
import { hent, useHent } from '@/lib/klient';
import { kroner } from '@/lib/uke';
import type { PrislinjeMal } from '@/lib/types';

export default function PrislisteSide() {
  const { data, feil, laster, hentPaNytt } = useHent<{ prisliste: PrislinjeMal[] }>(
    '/api/admin/prisliste',
  );
  const [skjema, setSkjema] = useState({ id: '', navn: '', enhet: 'stk', pris: '' });
  const [melding, setMelding] = useState<string | null>(null);
  const [lagrer, setLagrer] = useState(false);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setLagrer(true);
    setMelding(null);
    try {
      await hent('/api/admin/prisliste', {
        method: 'POST',
        body: JSON.stringify({
          id: skjema.id || undefined,
          navn: skjema.navn,
          enhet: skjema.enhet,
          pris: Number(skjema.pris.replace(',', '.')),
        }),
      });
      setSkjema({ id: '', navn: '', enhet: 'stk', pris: '' });
      setMelding('Lagret.');
      hentPaNytt();
    } catch (f) {
      setMelding(f instanceof Error ? f.message : 'Fikk ikke lagret.');
    } finally {
      setLagrer(false);
    }
  }

  async function slett(id: string) {
    await hent(`/api/admin/prisliste?id=${id}`, { method: 'DELETE' });
    hentPaNytt();
  }

  return (
    <>
      <div>
        <h1>Prisliste</h1>
        <p className="svak">
          Dette er varene montørene velger fra når de registrerer tillegg. Egen liste per avdeling.
        </p>
      </div>

      <form className="kort" onSubmit={lagre}>
        <h2>{skjema.id ? 'Endre vare' : 'Ny vare'}</h2>
        <div className="felt">
          <label htmlFor="navn">Beskrivelse</label>
          <input
            id="navn"
            type="text"
            value={skjema.navn}
            onChange={(e) => setSkjema((f) => ({ ...f, navn: e.target.value }))}
            required
          />
        </div>
        <div className="timerad">
          <div>
            <label htmlFor="enhet">Enhet</label>
            <input
              id="enhet"
              type="text"
              value={skjema.enhet}
              onChange={(e) => setSkjema((f) => ({ ...f, enhet: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="pris">Pris (kr)</label>
            <input
              id="pris"
              type="number"
              inputMode="decimal"
              min="0"
              value={skjema.pris}
              onChange={(e) => setSkjema((f) => ({ ...f, pris: e.target.value }))}
              required
            />
          </div>
        </div>
        {melding && <p className="melding info">{melding}</p>}
        <div className="knapperad">
          <button className="knapp knapp-primar" disabled={lagrer}>
            {lagrer ? 'Lagrer …' : 'Lagre'}
          </button>
          {skjema.id && (
            <button
              type="button"
              className="knapp"
              onClick={() => setSkjema({ id: '', navn: '', enhet: 'stk', pris: '' })}
            >
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
              <th>Beskrivelse</th>
              <th>Enhet</th>
              <th className="tall">Pris</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data?.prisliste ?? []).map((v) => (
              <tr key={v.id}>
                <td>{v.navn}</td>
                <td>{v.enhet}</td>
                <td className="tall">{kroner(v.pris)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="knapp knapp-liten"
                    onClick={() =>
                      setSkjema({ id: v.id, navn: v.navn, enhet: v.enhet, pris: String(v.pris) })
                    }
                  >
                    Endre
                  </button>{' '}
                  <button
                    type="button"
                    className="knapp knapp-liten knapp-fare"
                    onClick={() => void slett(v.id)}
                  >
                    Slett
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
