import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI English Read",
  description: "Interactive English deep reading reader",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
