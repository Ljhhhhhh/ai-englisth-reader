import type { Metadata } from 'next';
import { uiCopy } from '@/lib/ui-copy';
import './globals.css';

export const metadata: Metadata = {
  applicationName: 'Lexora',
  title: {
    default: uiCopy.app.title,
    template: '%s | 言序 Lexora',
  },
  description: uiCopy.app.description,
  openGraph: {
    description: uiCopy.app.description,
    siteName: '言序 Lexora',
    title: uiCopy.app.title,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    description: uiCopy.app.description,
    title: uiCopy.app.title,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={uiCopy.app.htmlLang} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
