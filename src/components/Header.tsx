'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/context/SessionContext';
import { ShieldAlert, Award, Calendar, CheckSquare, BookOpen, Activity, LayoutDashboard, TrendingUp, Trash2 } from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { activeUser, setActiveUserById, profiles, dbMode } = useSession();

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
    { name: 'Placement Tracker', path: '/tracker', icon: Award },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Reports', path: '/reports', icon: TrendingUp },
    { name: 'Penalties', path: '/penalties', icon: ShieldAlert },
  ];

  return (
    <header className="w-full bg-[#000000]/80 backdrop-blur-md border-b border-white/5 py-4 sticky top-0 z-50 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        
        {/* Gaming Brand Logo */}
        <div className="flex flex-col items-center md:items-start">
          <Link href="/" className="flex items-center gap-2 select-none">
            <span className="font-orbitron font-black text-2xl md:text-3xl tracking-wider text-neon-yellow text-glow-yellow">
              ROHIT
            </span>
            <span className="font-orbitron font-bold text-lg md:text-xl text-white/50 px-1">
              ×
            </span>
            <span className="font-orbitron font-black text-2xl md:text-3xl tracking-wider text-neon-blue text-glow-blue">
              RISHIT
            </span>
          </Link>
          <p className="text-[10px] font-orbitron font-bold tracking-widest text-white/40 mt-1 select-none">
            MON-SAT GRIND · SUN IS YOURS · NO EXCUSES
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex items-center justify-center flex-wrap gap-1 md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-white/10 text-white border border-white/10 shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-white/60'} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Session Switcher & Status */}
        <div className="flex items-center justify-center md:justify-end gap-3">
          {/* System Reset Button */}
          <button
            onClick={handleSystemReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-neon-red/20 bg-neon-red/5 hover:bg-neon-red hover:text-black hover:border-transparent text-neon-red text-[9px] font-bold tracking-wider font-orbitron transition-all duration-300 select-none cursor-pointer"
            title="Reset grind protocol data"
          >
            <Trash2 size={10} />
            <span>RESET GRIND SYSTEM</span>
          </button>

          {/* DB Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 bg-white/5 text-[9px] font-bold select-none text-white/40">
            <span className={`w-1.5 h-1.5 rounded-full ${dbMode === 'supabase' ? 'bg-neon-green animate-pulse shadow-[0_0_6px_#34c759]' : 'bg-orange-500 animate-pulse shadow-[0_0_6px_#f97316]'}`} />
            {dbMode === 'supabase' ? 'SUPABASE' : 'OFFLINE'}
          </div>

          {/* User selector buttons */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            {profiles.map((p) => {
              const isSelected = activeUser?.id === p.id;
              const isRohit = p.username === 'rohit';
              
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveUserById(p.id)}
                  className={`px-3 py-1 rounded-md text-xs font-bold tracking-wider font-orbitron transition-all duration-300 ${
                    isSelected
                      ? isRohit
                        ? 'bg-neon-yellow text-black glow-shadow-yellow animate-glow-rohit font-black'
                        : 'bg-neon-blue text-black glow-shadow-blue animate-glow-rishit font-black'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p.display_name.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </header>
  );
};
export default Header;
