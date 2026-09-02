'use client';

import { useHent } from '@/lib/klient';
import { kroner } from '@/lib/uke';
import type { TopplisteRad } from '@/lib/toppliste';
import type { Maal } from '@/lib/types';

export default function TopplisteSide() {
  const { data, feil, laster } = useHent<{
    rader: TopplisteRad[];
    maal: Maal[];
    megId: string;
    avdeling: string;
  }>('/api/toppliste');

  return (
    <>
      <div>
        <h1>Toppliste</h1>
        <p className="svak">Tilleggssalg denne måneden · {data?.avdeling ?? ''}</p>
      </div>

      {laster && <p className="tom">Regner ut …</p>}
      {feil && <p className="melding feil">{feil}</p>}

      {data && (
        <>
          <div className="liste">
            {data.rader.map((rad, i) => {
              const meg = rad.profilId === data.megId;
              return (
                <div
                  key={rad.profilId}
                  className="kort kort-tett"
                  style={meg ? { borderColor: 'var(--merke)', borderWidth: 2 } : undefined}
                >
                  <div className="rad">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="prikk" style={{ background: rad.farge }} />
                      <div>
                        <strong>
                          {i + 1}. {rad.navn}
                          {meg ? ' (deg)' : ''}
                        </strong>
                        <div className="hvisk">
                          {rad.jobberMedTillegg} av {rad.jobberTotalt} jobber med tillegg
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700 }} className="tall-tabell">
                        {rad.andelJobberMedTillegg} %
                      </div>
                      <div className="hvisk tall-tabell">{kroner(rad.sumKr)} kr</div>
                    </div>
                  </div>

                  <div className="rad" style={{ marginTop: 4 }}>
                    <span className="hvisk">
                      {rad.antall} {rad.antall === 1 ? 'tillegg' : 'tillegg'} · snitt{' '}
                      {kroner(rad.snitt)} kr
                    </span>
                    {rad.usignert > 0 ? (
                      <span className="merkelapp advarsel">{rad.usignert} usignert</span>
                    ) : rad.antall > 0 ? (
                      <span className="merkelapp ok">Alle signert</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {data.rader.length === 0 && <p className="tom">Ingen tillegg registrert i måneden ennå.</p>}

          <div className="melding info">
            Lista sorteres på <strong>andel jobber med tillegg</strong>, ikke på kroner. Ellers ville
            én stor jobb avgjort hele lista. Nevneren er jobbene du faktisk har ført timer på denne
            måneden.
          </div>
        </>
      )}
    </>
  );
}
