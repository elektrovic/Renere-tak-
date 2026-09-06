'use client';

import Link from 'next/link';
import { use } from 'react';
import { useHent } from '@/lib/klient';
import { kroner, norskDato, timer as formaterTimer } from '@/lib/uke';
import type { Aktivitet, Prosjekt, ProsjektMeta, TilleggLinje, Timeforing } from '@/lib/types';

interface Svar {
  prosjekt: Prosjekt;
  meta: ProsjektMeta | null;
  baseline: { sum: number; kilde: string } | null;
  mineTimer: Timeforing[];
  aktiviteter: Aktivitet[];
  tillegg: Array<{
    id: string;
    sum: number;
    type: 'tillegg' | 'materiell';
    status: string;
    signert: boolean;
    opprettet: string;
    linjer: TilleggLinje[];
  }>;
}

export default function ProsjektSide({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, feil, laster } = useHent<Svar>(`/api/prosjekt/${id}`);
  // Serveren sender bare med økonomitallene til administratorer, så det at de
  // finnes er i seg selv svaret på om de skal vises.
  const erAdmin = Boolean(data?.baseline || data?.meta);

  if (laster) return <p className="tom">Henter prosjektet …</p>;
  if (feil) return <p className="melding feil">{feil}</p>;
  if (!data) return null;

  const { prosjekt } = data;
  const mineTimerSum = data.mineTimer.reduce((s, t) => s + t.timer, 0);
  const aktivitetNavn = new Map(data.aktiviteter.map((a) => [a.id, a.navn]));

  return (
    <>
      <div>
        <span className="nummer">Prosjekt {prosjekt.nummer}</span>
        <h1>{prosjekt.navn}</h1>
        <p className="svak">{prosjekt.kunde}</p>
        {prosjekt.adresse && <p className="hvisk">{prosjekt.adresse}</p>}
      </div>

      <div className="knapperad">
        <Link href="/timer" className="knapp knapp-primar">
          Før timer
        </Link>
        <Link href={`/tillegg/${prosjekt.id}`} className="knapp">
          Registrer tillegg
        </Link>
      </div>
      <div className="knapperad">
        <Link href={`/tillegg/${prosjekt.id}?type=materiell`} className="knapp">
          Materiell
        </Link>
        <Link href={`/skjema/${prosjekt.id}`} className="knapp">
          Kontrollskjema
        </Link>
      </div>

      <div className="tallrad">
        <div className="tallboks">
          <div className="verdi">{formaterTimer(mineTimerSum)}</div>
          <div className="etikett">Mine timer her</div>
        </div>
        <div className="tallboks">
          <div className="verdi">{data.tillegg.length}</div>
          <div className="etikett">Tillegg registrert</div>
        </div>
        {erAdmin && data.baseline && (
          <div className="tallboks">
            <div className="verdi">{kroner(data.baseline.sum)}</div>
            <div className="etikett">
              Tilbudssum ({data.baseline.kilde === 'manuell' ? 'lagt inn' : data.baseline.kilde})
            </div>
          </div>
        )}
      </div>

      {erAdmin && data.meta?.estimerteTimer && (
        <div className="kort kort-tett">
          <div className="rad">
            <strong>Timer mot estimat</strong>
            <span className="tall-tabell">
              {formaterTimer(mineTimerSum)} av {formaterTimer(data.meta.estimerteTimer)} t
            </span>
          </div>
          <div className="stolpe">
            <span
              style={{
                width: `${Math.min(100, Math.round((mineTimerSum / data.meta.estimerteTimer) * 100))}%`,
              }}
            />
          </div>
          <p className="hjelpetekst">
            Estimatet kommer fra tilbudet, ikke fra hva andre montører har brukt.
          </p>
        </div>
      )}

      <section className="stabel">
        <h2>Tillegg på jobben</h2>
        {data.tillegg.length === 0 ? (
          <p className="tom">Ingen tillegg registrert ennå.</p>
        ) : (
          <div className="liste">
            {data.tillegg.map((t) => (
              <div key={t.id} className="kort kort-tett">
                <div className="rad">
                  <strong>{kroner(t.sum)} kr</strong>
                  <span>
                    {t.type === 'materiell' ? (
                      <span className="merkelapp">Materiell</span>
                    ) : t.signert ? (
                      <span className="merkelapp ok">Signert</span>
                    ) : (
                      <span className="merkelapp advarsel">Mangler signatur</span>
                    )}
                  </span>
                </div>
                <p className="hvisk">
                  {norskDato(t.opprettet.slice(0, 10))} ·{' '}
                  {t.linjer.map((l) => `${l.antall} ${l.enhet} ${l.beskrivelse}`).join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="stabel">
        <h2>Mine siste timer her</h2>
        {data.mineTimer.length === 0 ? (
          <p className="tom">Du har ikke ført timer på denne jobben ennå.</p>
        ) : (
          <div className="tabellrull">
            <table>
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Aktivitet</th>
                  <th className="tall">Timer</th>
                </tr>
              </thead>
              <tbody>
                {[...data.mineTimer]
                  .sort((a, b) => b.dato.localeCompare(a.dato))
                  .slice(0, 12)
                  .map((t) => (
                    <tr key={t.id}>
                      <td>{norskDato(t.dato)}</td>
                      <td>{aktivitetNavn.get(t.aktivitetId) ?? '–'}</td>
                      <td className="tall">{formaterTimer(t.timer)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
