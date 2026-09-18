import Link from 'next/link';
import { krevAdmin } from '@/lib/auth/session';
import { butikk } from '@/lib/store';
import { toppliste } from '@/lib/toppliste';
import { forsteIManeden, isoUke, kroner } from '@/lib/uke';

export const dynamic = 'force-dynamic';

export default async function AdminDashbord() {
  const { avdeling } = await krevAdmin();
  const db = butikk();

  const [rader, tillegg, maal] = await Promise.all([
    toppliste(avdeling.id, forsteIManeden()),
    db.alleTillegg({ avdelingId: avdeling.id, fraDato: `${forsteIManeden()}T00:00:00.000Z` }),
    db.maal(avdeling.id, isoUke()),
  ]);

  const sum = tillegg.reduce((s, t) => s + t.sum, 0);
  const usignert = tillegg.filter((t) => t.type === 'tillegg' && !t.signertTid).length;
  const snittAndel = rader.length
    ? Math.round((rader.reduce((s, r) => s + r.andelJobberMedTillegg, 0) / rader.length) * 10) / 10
    : 0;

  return (
    <>
      <div>
        <h1>Dashbord</h1>
        <p className="svak">{avdeling.navn} · denne måneden</p>
      </div>

      <div className="tallrad">
        <div className="tallboks">
          <div className="verdi">{kroner(sum)}</div>
          <div className="etikett">Tilleggssalg kr</div>
        </div>
        <div className="tallboks">
          <div className="verdi">{tillegg.length}</div>
          <div className="etikett">Antall tillegg</div>
        </div>
        <div className="tallboks">
          <div className="verdi">{snittAndel} %</div>
          <div className="etikett">Snitt jobber med tillegg</div>
        </div>
        <div className="tallboks">
          <div className="verdi">{usignert}</div>
          <div className="etikett">Uten signatur</div>
        </div>
      </div>

      {usignert > 0 && (
        <p className="melding advarsel">
          {usignert} {usignert === 1 ? 'tillegg mangler' : 'tillegg mangler'} kundesignatur. Det er
          de som blir vanskelige å fakturere.
        </p>
      )}

      <section className="stabel">
        <h2>Montørene denne måneden</h2>
        <div className="tabellrull">
          <table>
            <thead>
              <tr>
                <th>Montør</th>
                <th className="tall">Andel jobber</th>
                <th className="tall">Kroner</th>
                <th className="tall">Antall</th>
                <th className="tall">Snitt</th>
                <th className="tall">Usignert</th>
              </tr>
            </thead>
            <tbody>
              {rader.map((r) => (
                <tr key={r.profilId}>
                  <td>{r.navn}</td>
                  <td className="tall">{r.andelJobberMedTillegg} %</td>
                  <td className="tall">{kroner(r.sumKr)}</td>
                  <td className="tall">{r.antall}</td>
                  <td className="tall">{kroner(r.snitt)}</td>
                  <td className="tall">{r.usignert}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stabel">
        <h2>Ukens mål ({isoUke()})</h2>
        {maal.length === 0 ? (
          <p className="tom">Ingen mål satt for denne uka.</p>
        ) : (
          <div className="liste">
            {maal.map((m) => (
              <div key={m.id} className="kort kort-tett">
                <strong>{m.beskrivelse || m.type}</strong>
                <span className="svak">
                  Mål: {m.type === 'tilleggssalg_kr' ? `${kroner(m.malverdi)} kr` : m.malverdi}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/mal" className="knapp">
          Sett mål
        </Link>
      </section>
    </>
  );
}
