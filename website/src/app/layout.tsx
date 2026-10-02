import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';

import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const description =
  'Cielo reads the WhatsApp chat you have with your favourite person and teaches you the Spanish for the things you actually say. Everything runs on your phone.';

export const metadata: Metadata = {
  metadataBase: new URL('https://cielo.oluwalonimioyepariola.com'),
  title: 'Cielo: learn Spanish in your own words',
  description,
  applicationName: 'Cielo',
  authors: [{ name: 'Oluwalonimi Oyepariola', url: 'https://oluwalonimioyepariola.com' }],
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Cielo',
    title: 'Cielo: learn Spanish in your own words',
    description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cielo: learn Spanish in your own words',
    description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f4f2' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1918' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
