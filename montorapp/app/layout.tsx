import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegistrerServicearbeider } from '@/components/RegistrerServicearbeider';

export const metadata: Metadata = {
  title: 'Montørappen',
  description: 'Timer, materiell og tilleggssalg for Halland Gruppen',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Montørappen', statusBarStyle: 'default' },
  icons: { icon: '/ikon.svg', apple: '/ikon-180.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F4F0' },
    { media: '(prefers-color-scheme: dark)', color: '#121513' },
  ],
};

export default function RotOppsett({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>
        {children}
        <RegistrerServicearbeider />
      </body>
    </html>
  );
}
