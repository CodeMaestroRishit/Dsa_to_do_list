import type { Metadata } from 'next';
import { SessionProvider } from '@/context/SessionContext';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'ROHIT × RISHIT | Placement Accountability Dashboard',
  description: 'A premium gaming-themed, dark-mode placement preparation and accountability tracker for Rohit and Rishit. Streak tracking, daily planner, DSA journal, and auto-penalties.',
  keywords: ['DSA', 'Placement Tracker', 'Accountability Dashboard', 'Leetcode Tracker', 'Next.js 15', 'Tailwind CSS'],
  authors: [{ name: 'Rohit & Rishit' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white min-h-screen flex flex-col">
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
