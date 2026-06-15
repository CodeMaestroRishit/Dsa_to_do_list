'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { ShieldAlert, Award, Calendar, CheckSquare, BookOpen, Activity, LayoutDashboard, TrendingUp, Trash2 } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { dbMode } = useSession();

  const handleSystemReset = () => {
    if (typeof window === 'undefined') return;
    const confirmReset = window.confirm(
      "🚨 SYSTEM RESET DECREE:\n\nThis will completely purge all tasks, DSA logs, streaks, penalties, and activities for both Rohit and Rishit.\n\nAre you ready to initiate a clean grind state? This cannot be undone."
    );
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Today', path: '/planner', icon: CheckSquare },
    { name: 'DSA Journal', path: '/journal', icon: BookOpen },
    { name: 'Wellness & Goals', path: '/wellness', icon: Activity },
    { name: 'Placement Tracker', path: '/tracker', icon: Award },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Penalties', path: '/penalties', icon: ShieldAlert },
  ];

  return (
    <header className="w-full bg-white border-b-4 border-black py-4 sticky top-0 z-50 px-4 md:px-8 text-black shadow-[0_4px_0px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        {/* Gaming Brand Logo */}
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="flex items-center gap-2 select-none">
            <span className="font-orbitron font-black text-2xl md:text-3xl tracking-wider text-black">
              RISHIT.GRIND
            </span>
          </Link>
          <p className="text-[10px] font-orbitron font-bold tracking-widest text-black/60 mt-1 select-none">
            MON-SAT GRIND · SUN IS YOURS · NO EXCUSES
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1.5 md:gap-2.5 overflow-x-auto whitespace-nowrap scrollbar-hide w-full md:w-auto pb-1.5 md:pb-0 scroll-smooth">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-200 select-none flex-shrink-0 border-2 border-black ${
                  isActive
                    ? 'bg-black text-white shadow-[2px_2px_0px_#000000]'
                    : 'bg-white text-black hover:bg-black/5 hover:translate-y-[-1px] shadow-[2px_2px_0px_#000000]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-black/70'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* System Status & Actions */}
        <div className="flex items-center justify-center md:justify-end gap-3">
          {/* System Reset Button */}
          <button
            onClick={handleSystemReset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-black bg-rose-200 text-black hover:bg-rose-300 text-[9px] font-bold tracking-wider font-orbitron transition-all select-none cursor-pointer shadow-[2px_2px_0px_#000000]"
            title="Reset grind protocol data"
          >
            <Trash2 size={10} />
            <span>RESET GRIND SYSTEM</span>
          </button>

          {/* DB Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-black bg-white text-[9px] font-bold select-none text-black shadow-[2px_2px_0px_#000000]">
            <span className={`w-2 h-2 rounded-full border border-black ${dbMode === 'supabase' ? 'bg-[#7ccd95]' : 'bg-orange-400'}`} />
            {dbMode === 'supabase' ? 'SUPABASE' : 'OFFLINE'}
          </div>
        </div>

      </div>
    </header>
  );
};
export default Header;
