'use client';

import { useState } from 'react';
import { hent, useHent } from '@/lib/klient';
import { kroner } from '@/lib/uke';
import type { Maal } from '@/lib/types';

const TYPER: Array<{ verdi: Maal['type']; tekst: string; hjelp: string }> = [
  { verdi: 'tilleggssalg_kr', tekst: 'Tilleggssalg i kroner', hjelp: 'Samlet sum for avdelingen denne uka' },
  { verdi: 'antall_tillegg', tekst: 'Antall tillegg', hjelp: 'Hvor mange tillegg som skal registreres' },
  { verdi: 'andel_jobber_med_tillegg', tekst: 'Andel jobber med tillegg (%)', hjelp: 'Det viktigste målet – teller jobber, ikke kroner' },
];

export default function MaalSide() {
  const { data, feil, laster, hentPaNytt } = useHent<{ maal: Maal[]; uke: string }>('/api/maal');
  const [type, setType] = useState<Maal['type']>('andel_jobber_med_tillegg');
  const [verdi, setVerdi] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');
  const [melding, setMelding] = useState<string | null>(null);

  async function lagre(e: React.FormEvent) {
    e.preventDefault();
    setMelding(null);
    try {
      await hent('/api/maal', {
        method: 'POST',
        body: JSON.stringify({
          type,
          malverdi: Number(verdi.replace(',', '.')),
          beskrivelse,
          uke: data?.uke,
        }),
      });
      setVerdi('');
      setBeskrivelse('');
      setMelding('Målet er satt.');
      hentPaNytt();
    } catch (f) {
      setMelding(f instanceof Error ? f.message : 'Fikk ikke lagret.');
    }
  }

  return (
    <>
      <div>
        <h1>Ukens mål</h1>
        <p className="svak">Uke {data?.uke ?? ''}. Vises på hjemskjermen til montørene.</p>
      </div>

      <form className="kort" onSubmit={lagre}>
        <div className="felt">
          <label htmlFor="type">Hva skal måles?</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value as Maal['type'])}>
            {TYPER.map((t) => (
              <option key={t.verdi} value={t.verdi}>
                {t.tekst}
              </option>
            ))}
          </select>
          <p className="hjelpetekst">{TYPER.find((t) => t.verdi === type)?.hjelp}</p>
        </div>
        <div className="felt">
          <label htmlFor="verdi">Mål</label>
          <input
            id="verdi"
            type="number"
            inputMode="decimal"
            min="1"
            value={verdi}
            onChange={(e) => setVerdi(e.target.value)}
            required
          />
        </div>
        <div className="felt">
          <label htmlFor="beskrivelse">Tekst montørene ser</label>
          <input
            id="beskrivelse"
            type="text"
            value={beskrivelse}
            onChange={(e) => setBeskrivelse(e.target.value)}
            placeholder="For eksempel: Tillegg på annenhver jobb"
          />
        </div>
        {melding && <p className="melding info">{melding}</p>}
        <button className="knapp knapp-primar knapp-bred">Sett målet</button>
      </form>

      {laster && <p className="tom">Henter …</p>}
      {feil && <p className="melding feil">{feil}</p>}

      <div className="liste">
        {(data?.maal ?? []).map((m) => (
          <div key={m.id} className="kort kort-tett">
            <div className="rad">
              <strong>{m.beskrivelse || TYPER.find((t) => t.verdi === m.type)?.tekst}</strong>
              <span className="tall-tabell">
                {m.type === 'tilleggssalg_kr' ? `${kroner(m.malverdi)} kr` : m.malverdi}
              </span>
            </div>
            <button
              type="button"
              className="knapp knapp-liten knapp-fare"
              onClick={async () => {
                await hent(`/api/maal?id=${m.id}`, { method: 'DELETE' });
                hentPaNytt();
              }}
            >
              Fjern
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
