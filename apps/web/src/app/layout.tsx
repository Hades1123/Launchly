import type { ReactNode } from 'react';
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'vietnamese'],
  weight: ['500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata = { title: 'Launchly' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
