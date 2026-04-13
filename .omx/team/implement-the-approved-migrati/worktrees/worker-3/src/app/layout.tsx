import type { Metadata } from 'next';
import { uiCopy } from '@/lib/ui-copy';
import './globals.css';

export const metadata: Metadata = {
  title: uiCopy.app.title,
  description: uiCopy.app.description,
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
