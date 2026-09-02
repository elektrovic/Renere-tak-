'use client';

import { useRouter } from 'next/navigation';
import { hent, useHent } from '@/lib/klient';
import type { OffentligProfil, Avdeling } from '@/lib/types';

interface Svar {
  profil: OffentligProfil;
  avdeling: Avdeling;
  oppsett: Record<string, boolean>;
  statistikk: {
    antallRegistreringer: number;
    snittSekunder: number | null;
    timeforingerSiste90: number;
    tilleggTotalt: number;
  };
}

export default function MinSide() {
  const router = useRouter();
  const { data, feil, laster } = useHent<Svar>('/api/meg');

  async function loggUt() {
    await hent('/api/auth/logg-ut', { method: 'POST' });
    router.replace('/logg-inn');
    router.refresh();
  }

  return (
    <>
      <h1>Min side</h1>

      {laster && <p className="tom">Henter …</p>}
      {feil && <p className="melding feil">{feil}</p>}

      {data && (
        <>
          <div className="kort">
            <div className="rad">
              <span className="svak">Navn</span>
              <strong>{data.profil.navn}</strong>
            </div>
            <div className="rad">
              <span className="svak">Avdeling</span>
              <strong>{data.avdeling.navn}</strong>
            </div>
            <div className="rad">
              <span className="svak">Rolle</span>
              <strong>{data.profil.rolle === 'admin' ? 'Administrator' : 'Montør'}</strong>
            </div>
            <div className="rad">
              <span className="svak">Ansatt-id i Tripletex</span>
              <strong className="tall-tabell">{data.profil.tripletexEmployeeId}</strong>
            </div>
          </div>

          <section className="stabel">
            <h2>Hvor lang tid tar registreringen?</h2>
            <div className="tallrad">
              <div className="tallboks">
                <div className="verdi">
                  {data.statistikk.snittSekunder !== null ? `${data.statistikk.snittSekunder} s` : '–'}
                </div>
                <div className="etikett">Snitt per registrering</div>
              </div>
              <div className="tallboks">
                <div className="verdi">{data.statistikk.timeforingerSiste90}</div>
                <div className="etikett">Timeføringer siste 90 dager</div>
              </div>
              <div className="tallboks">
                <div className="verdi">{data.statistikk.tilleggTotalt}</div>
                <div className="etikett">Tillegg registrert</div>
              </div>
            </div>
            <p className="hjelpetekst">
              Måles fra du åpner skjemaet til du sender. Brukes for å se om appen faktisk sparer tid,
              ikke for å sammenlikne montører.
            </p>
          </section>

          <button type="button" className="knapp knapp-fare knapp-bred" onClick={() => void loggUt()}>
            Logg ut
          </button>
        </>
      )}
    </>
  );
}
