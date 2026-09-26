import type { Metadata, Viewport } from 'next';
import { Fraunces, Instrument_Sans, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import { SITE } from '@/lib/site';
import './globals.css';

/**
 * Type from the brand board: Fraunces for display, Instrument Sans for the
 * interface, JetBrains Mono for every number. Noto Sans Devanagari covers the
 * Hindi-first labels on the field apps. All self-hosted by next/font, so the
 * installed app renders correctly offline.
 */
const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', axes: ['opsz'] });
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap', weight: ['400', '500'] });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-deva', display: 'swap', weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: track every litre, reconcile every solid`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name}: run your entire dairy on one ledger`,
    description: SITE.description,
  },
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#11201B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/* Marks the page as able to animate before first paint, so motion starts from
   its first frame instead of flashing the finished state. */
const motionScript = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.motion='1'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} ${deva.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body className="bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
