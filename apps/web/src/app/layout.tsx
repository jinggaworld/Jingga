import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jingga — Publication & Royalty Platform',
  description:
    'A publication and royalty platform for independent writers, researchers, and creators. Built on Stellar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
