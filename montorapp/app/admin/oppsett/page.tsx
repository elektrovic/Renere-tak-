import { config, oppsettStatus } from '@/lib/config';
import { krevAdmin } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

function Status({ pa, tekst }: { pa: boolean; tekst: string }) {
  return <span className={`merkelapp ${pa ? 'ok' : 'advarsel'}`}>{pa ? 'Koblet på' : tekst}</span>;
}

export default async function OppsettSide() {
  await krevAdmin();

  return (
    <>
      <div>
        <h1>Oppsett</h1>
        <p className="svak">Hva som er koblet på, og hva som gjenstår.</p>
      </div>

      <div className="liste">
        <div className="kort">
          <div className="rad">
            <h2>Tripletex</h2>
            <Status pa={oppsettStatus.tripletex} tekst="Mangler nøkler" />
          </div>
          <p className="svak">
            Prosjekter, timer og ordrelinjer leses og skrives i Tripletex. Uten nøkler kjører appen
            med testdata.
          </p>
          <p className="hvisk">
            Miljøvariabler: <code>TRIPLETEX_CONSUMER_TOKEN</code>,{' '}
            <code>TRIPLETEX_EMPLOYEE_TOKEN</code>, <code>TRIPLETEX_BASE_URL</code>. Nå settes den mot{' '}
            <code>{config.tripletex.baseUrl}</code>.
          </p>
        </div>

        <div className="kort">
          <div className="rad">
            <h2>Database (Supabase)</h2>
            <Status pa={oppsettStatus.supabase} tekst="Lagrer i minnet" />
          </div>
          <p className="svak">
            Her ligger det Tripletex ikke har: prislister, tilleggssalg med signatur, skjemamaler,
            kalender og mål. Uten Supabase forsvinner dataene når serveren startes på nytt.
          </p>
          <p className="hvisk">
            Miljøvariabler: <code>SUPABASE_URL</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>. Kjør
            SQL-filen i <code>supabase/migrations</code> først.
          </p>
        </div>

        <div className="kort">
          <div className="rad">
            <h2>Assistent for kontrollskjema</h2>
            <Status pa={oppsettStatus.anthropic} tekst="Ikke satt opp" />
          </div>
          <p className="svak">
            Foreslår tekst til fritekstfeltene ut fra det som faktisk er ført på jobben. Montøren ser
            alltid forslaget og kan endre det. Uten nøkkel må fritekst skrives for hånd – resten av
            skjemaet virker som før.
          </p>
          <p className="hvisk">
            Miljøvariabel: <code>ANTHROPIC_API_KEY</code>.
          </p>
        </div>

        <div className="kort">
          <div className="rad">
            <h2>Kobbr</h2>
            <Status pa={oppsettStatus.kobbr} tekst="Manuell reserveløsning" />
          </div>
          <p className="svak">
            Kobbr har ingen kjent åpen tilgang i dag. Appen bruker fastprisen fra Tripletex som
            tilbudssum, og admin kan legge inn summen manuelt på prosjektet. Får vi tilgang senere,
            er det bare én fil som skal endres.
          </p>
        </div>
      </div>

      <div className="melding info">
        Alle nøkler leses kun på serveren og sendes aldri til nettleseren. Bytter du en nøkkel i
        Vercel, må prosjektet deployes på nytt for at den skal tas i bruk.
      </div>
    </>
  );
}
