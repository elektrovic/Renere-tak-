import { redirect } from 'next/navigation';
import { demoMode } from '@/lib/config';
import { lesInnlogget } from '@/lib/auth/session';
import { Skall } from '@/components/Skall';

export const dynamic = 'force-dynamic';

export default async function FeltOppsett({ children }: { children: React.ReactNode }) {
  const innlogget = await lesInnlogget();
  if (!innlogget) redirect('/logg-inn');

  return (
    <Skall
      navn={innlogget.profil.navn}
      avdelingNavn={innlogget.avdeling.navn}
      avdelingFarge={innlogget.avdeling.farge}
      erAdmin={innlogget.profil.rolle === 'admin'}
      demo={demoMode}
    >
      {children}
    </Skall>
  );
}
