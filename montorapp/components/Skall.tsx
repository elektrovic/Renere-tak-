'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { KoLinje } from './KoLinje';

interface Props {
  navn: string;
  avdelingNavn: string;
  avdelingFarge: string;
  erAdmin: boolean;
  demo: boolean;
  children: React.ReactNode;
}

const MENY = [
  { href: '/', tekst: 'Hjem', ikon: 'hjem' },
  { href: '/jobber', tekst: 'Jobber', ikon: 'jobb' },
  { href: '/timer', tekst: 'Timer', ikon: 'timer' },
  { href: '/toppliste', tekst: 'Toppliste', ikon: 'stjerne' },
  { href: '/kalender', tekst: 'Kalender', ikon: 'kalender' },
] as const;

function Ikon({ navn }: { navn: string }) {
  const felles = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (navn) {
    case 'hjem':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...felles}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'jobb':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...felles}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
        </svg>
      );
    case 'timer':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...felles}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2M9 2h6" />
        </svg>
      );
    case 'stjerne':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...felles}>
          <path d="M12 4l2.4 5 5.6.8-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.8z" />
        </svg>
      );
    case 'kalender':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" {...felles}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    default:
      return null;
  }
}

/** Rammen rundt hele feltappen: toppfelt, køstatus, innhold og bunnmeny. */
export function Skall({ navn, avdelingNavn, avdelingFarge, erAdmin, demo, children }: Props) {
  const sti = usePathname();

  return (
    <div className="skall" style={{ ['--merke' as string]: avdelingFarge }}>
      {demo && (
        <div className="demobanner">
          Demomodus – testdata. Legg inn Tripletex- og Supabase-nøkler for ekte drift.
        </div>
      )}

      <header className="topp">
        <div className="topp-inner">
          <div>
            <div className="avdelingsmerke">{avdelingNavn}</div>
            <div className="topp-tittel">Montørappen</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="topp-under">{navn}</div>
            {erAdmin ? (
              <Link href="/admin" className="topp-under" style={{ fontWeight: 700 }}>
                Admin
              </Link>
            ) : (
              <Link href="/meg" className="topp-under">
                Min side
              </Link>
            )}
          </div>
        </div>
      </header>

      <KoLinje />

      <main className="innhold">{children}</main>

      <nav className="bunnmeny" aria-label="Hovedmeny">
        <div className="bunnmeny-inner">
          {MENY.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="menyknapp"
              aria-current={sti === m.href || (m.href !== '/' && sti.startsWith(m.href)) ? 'page' : undefined}
            >
              <Ikon navn={m.ikon} />
              {m.tekst}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
