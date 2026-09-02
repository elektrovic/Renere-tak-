'use client';

import Link from 'next/link';
import { useHent } from '@/lib/klient';
import { kroner, norskUkedag, timer as formaterTimer } from '@/lib/uke';
import type { JobbKort } from '@/lib/jobber';
import type { TopplisteRad } from '@/lib/toppliste';
import type { Maal } from '@/lib/types';

interface JobbSvar {
  jobber: JobbKort[];
  timerIDag: number;
  koIDag: number;
  dato: string;
}

interface TopplisteSvar {
  rader: TopplisteRad[];
  maal: Maal[];
  megId: string;
}

function maalTekst(m: Maal): string {
  switch (m.type) {
    case 'tilleggssalg_kr':
      return `${kroner(m.malverdi)} kr i tillegg`;
    case 'antall_tillegg':
      return `${m.malverdi} tillegg`;
    case 'andel_jobber_med_tillegg':
      return `${m.malverdi} % av jobbene med tillegg`;
  }
}

function minVerdi(m: Maal, rad: TopplisteRad | undefined): number {
  if (!rad) return 0;
  switch (m.type) {
    case 'tilleggssalg_kr':
      return rad.sumKr;
    case 'antall_tillegg':
      return rad.antall;
    case 'andel_jobber_med_tillegg':
      return rad.andelJobberMedTillegg;
  }
}

export default function Hjem() {
  const jobber = useHent<JobbSvar>('/api/jobber');
  const topp = useHent<TopplisteSvar>('/api/toppliste');

  const naa = new Date();
  const sentPaDagen = naa.getHours() >= 15;
  const ingenTimer = (jobber.data?.timerIDag ?? 0) === 0 && (jobber.data?.koIDag ?? 0) === 0;
  const meg = topp.data?.rader.find((r) => r.profilId === topp.data?.megId);

  const dagens = (jobber.data?.jobber ?? []).filter((j) => j.merke === 'i_dag' || j.merke === 'i_gar');

  return (
    <>
      <div>
        <h1>God {naa.getHours() < 11 ? 'morgen' : naa.getHours() < 17 ? 'dag' : 'kveld'}</h1>
        <p className="svak" style={{ textTransform: 'capitalize' }}>
          {jobber.data ? norskUkedag(jobber.data.dato) : ''}
        </p>
      </div>

      {jobber.laster && <p className="tom">Henter jobbene dine …</p>}
      {jobber.feil && <p className="melding feil">{jobber.feil}</p>}

      {jobber.data && (
        <>
          {ingenTimer && sentPaDagen && (
            <div className="melding advarsel">
              Du har ikke ført timer i dag. Ta det nå, så slipper du å huske det i morgen.
            </div>
          )}

          <div className="tallrad">
            <div className="tallboks">
              <div className="verdi">{formaterTimer(jobber.data.timerIDag)}</div>
              <div className="etikett">Timer i dag</div>
            </div>
            <div className="tallboks">
              <div className="verdi">{meg ? kroner(meg.sumKr) : '0'}</div>
              <div className="etikett">Tillegg i måneden</div>
            </div>
            <div className="tallboks">
              <div className="verdi">{meg ? `${meg.andelJobberMedTillegg} %` : '–'}</div>
              <div className="etikett">Jobber med tillegg</div>
            </div>
          </div>

          <div className="knapperad">
            <Link href="/timer" className="knapp knapp-primar">
              Før timer
            </Link>
            <Link href="/jobber" className="knapp">
              Registrer tillegg
            </Link>
          </div>

          {dagens.length > 0 && (
            <section className="stabel">
              <h2>Jobbene dine nå</h2>
              <div className="liste">
                {dagens.slice(0, 4).map((j) => (
                  <Link
                    key={j.prosjekt.id}
                    href={`/jobber/${j.prosjekt.id}`}
                    className={`jobbkort ${j.merke === 'i_dag' ? 'i-dag' : ''}`}
                  >
                    <span className="jobbkort-navn">{j.prosjekt.navn}</span>
                    <span className="jobbkort-under">
                      <span className="nummer">{j.prosjekt.nummer}</span>
                      <span>{j.prosjekt.kunde}</span>
                      <span className="merkelapp merke">
                        {j.merke === 'i_dag' ? 'I dag' : 'I går'}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(topp.data?.maal.length ?? 0) > 0 && (
            <section className="stabel">
              <h2>Ukens mål</h2>
              {topp.data!.maal.map((m) => {
                const min = minVerdi(m, meg);
                const andel = Math.min(100, Math.round((min / m.malverdi) * 100));
                return (
                  <div key={m.id} className="kort kort-tett">
                    <div className="rad">
                      <strong>{m.beskrivelse || maalTekst(m)}</strong>
                      <span className="svak tall-tabell">
                        {m.type === 'tilleggssalg_kr' ? `${kroner(min)} / ${kroner(m.malverdi)}` : `${min} / ${m.malverdi}`}
                      </span>
                    </div>
                    <div className="stolpe">
                      <span style={{ width: `${andel}%` }} />
                    </div>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </>
  );
}
