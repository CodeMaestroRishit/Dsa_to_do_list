import type { Metadata } from 'next';
import { SessionProvider } from '@/context/SessionContext';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'RISHIT.GRIND | Placement Accountability & Wellness Dashboard',
  description: 'A premium gaming-themed, cyber-neon accountability and wellness tracker personalized for Rishit. Streak tracking, daily planner, DSA journal, and auto-penalties.',
  keywords: ['DSA', 'Placement Tracker', 'Accountability Dashboard', 'Leetcode Tracker', 'Next.js 15', 'Tailwind CSS'],
  authors: [{ name: 'Rishit' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-neo-green text-black min-h-screen flex flex-col">
        <SessionProvider>
          <Header />
          <main className="flex-grow flex flex-col">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
