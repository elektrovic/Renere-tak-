import { demoMode } from '@/lib/config';
import { butikk } from '@/lib/store';
import { DEMO_PIN } from '@/lib/store/seed';
import { LoggInnSkjema } from './LoggInnSkjema';

export const dynamic = 'force-dynamic';

export default async function LoggInnSide() {
  const brukere = demoMode
    ? (await butikk().profiler()).map((p) => ({
        epost: p.epost,
        navn: p.navn,
        rolle: p.rolle,
      }))
    : [];

  return <LoggInnSkjema demo={demoMode} demoPin={DEMO_PIN} demoBrukere={brukere} />;
}
