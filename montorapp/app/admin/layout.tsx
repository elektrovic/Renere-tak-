import Link from 'next/link';
import { redirect } from 'next/navigation';
import { demoMode } from '@/lib/config';
import { lesInnlogget } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const LENKER = [
  { href: '/admin', tekst: 'Dashbord' },
  { href: '/admin/lonnsomhet', tekst: 'Lønnsomhet' },
  { href: '/admin/prisliste', tekst: 'Prisliste' },
  { href: '/admin/mal', tekst: 'Ukens mål' },
  { href: '/admin/planlegging', tekst: 'Planlegging' },
  { href: '/admin/brukere', tekst: 'Brukere' },
  { href: '/admin/oppsett', tekst: 'Oppsett' },
];

export default async function AdminOppsett({ children }: { children: React.ReactNode }) {
  const innlogget = await lesInnlogget();
  if (!innlogget) redirect('/logg-inn');
  // Rollesjekken ligger både her og i hver API-rute. Det holder ikke å gjette en adresse.
  if (innlogget.profil.rolle !== 'admin') redirect('/');

  return (
    <div className="skall" style={{ ['--merke' as string]: innlogget.avdeling.farge }}>
      {demoMode && (
        <div className="demobanner">
          Demomodus – testdata. Legg inn Tripletex- og Supabase-nøkler for ekte drift.
        </div>
      )}

      <header className="topp">
        <div className="topp-inner" style={{ maxWidth: 1000 }}>
          <div>
            <div className="avdelingsmerke">{innlogget.avdeling.navn}</div>
            <div className="topp-tittel">Administrasjon</div>
          </div>
          <Link href="/" className="knapp knapp-liten">
            Til feltappen
          </Link>
        </div>
      </header>

      <nav
        style={{
          background: 'var(--flate)',
          borderBottom: '1px solid var(--strek)',
          overflowX: 'auto',
        }}
        aria-label="Administrasjon"
      >
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'flex',
            gap: 4,
            padding: '6px 12px',
          }}
        >
          {LENKER.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="knapp knapp-liten"
              style={{ whiteSpace: 'nowrap', border: 0 }}
            >
              {l.tekst}
            </Link>
          ))}
        </div>
      </nav>

      <main className="innhold" style={{ maxWidth: 1000, paddingBottom: 48 }}>
        {children}
      </main>
    </div>
  );
}
