import { krevAdmin } from '@/lib/auth/session';
import { lonnsomhet } from '@/lib/lonnsomhet';
import { kroner, timer as formaterTimer } from '@/lib/uke';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function LonnsomhetSide() {
  const { avdeling } = await krevAdmin();
  const rader = await lonnsomhet(avdeling, 10);

  return (
    <>
      <div>
        <h1>Topp 10 etter dekningsgrad</h1>
        <p className="svak">{avdeling.navn}. Kun synlig for administratorer.</p>
      </div>

      {rader.length === 0 ? (
        <p className="tom">Ingen prosjekter med inntekt å vise ennå.</p>
      ) : (
        <div className="tabellrull">
          <table>
            <thead>
              <tr>
                <th>Prosjekt</th>
                <th>Kunde</th>
                <th className="tall">Dekningsgrad</th>
                <th className="tall">Inntekt</th>
                <th className="tall">Kostnad</th>
                <th className="tall">Tillegg</th>
                <th className="tall">Timer</th>
                <th className="tall">Mot estimat</th>
              </tr>
            </thead>
            <tbody>
              {rader.map((r) => (
                <tr key={r.prosjekt.id}>
                  <td>
                    <strong>{r.prosjekt.navn}</strong>
                    <div className="hvisk">{r.prosjekt.nummer}</div>
                  </td>
                  <td>{r.prosjekt.kunde}</td>
                  <td className="tall">
                    <strong>{r.okonomi.dekningsgrad} %</strong>
                  </td>
                  <td className="tall">{kroner(r.okonomi.inntekt)}</td>
                  <td className="tall">{kroner(r.okonomi.kostnad)}</td>
                  <td className="tall">{kroner(r.tilleggSum)}</td>
                  <td className="tall">{formaterTimer(r.okonomi.forteTimer)}</td>
                  <td className="tall">
                    {r.timerMotEstimat !== null ? (
                      <span className={r.timerMotEstimat > 100 ? 'merkelapp advarsel' : 'merkelapp ok'}>
                        {r.timerMotEstimat} %
                      </span>
                    ) : (
                      <span className="hvisk">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="melding info">
        «Mot estimat» er førte timer delt på estimerte timer fra tilbudet. Under 100 % betyr at
        jobben gikk raskere enn kalkulert. Vi sammenlikner aldri montører mot hverandre på tid – bare
        jobben mot sitt eget estimat.
      </div>
    </>
  );
}
