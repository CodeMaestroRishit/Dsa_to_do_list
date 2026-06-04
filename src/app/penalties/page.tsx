'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService } from '@/lib/db';
import { Penalty } from '@/lib/types';
import { ShieldAlert, CheckCircle, RefreshCw, XSquare, AlertCircle, Dumbbell, Award, BookOpen } from 'lucide-react';

export default function PenaltiesPage() {
  const { activeUser, refreshKey, triggerRefresh, profiles } = useSession();
  
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPenaltiesData();
  }, [refreshKey]);

  const fetchPenaltiesData = async () => {
    try {
      setLoading(true);
      const fetched = await dbService.getPenalties();
      setPenalties(fetched.sort((a, b) => new Date(b.date_incurred).getTime() - new Date(a.date_incurred).getTime()));
    } catch (err) {
      console.error('Failed to load penalties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolvePenalty = async (id: string, targetUserId: string) => {
    if (!activeUser) return;

    // Enforce active user verification to resolve penalties
    if (activeUser.id !== targetUserId) {
      alert("Grind Protocol Override Warning: You can only resolve penalties assigned to your active profile!");
      return;
    }

    if (!confirm('Have you completed the extra questions / time to clear this penalty?')) return;

    try {
      setResolvingId(id);
      // Nice canvas confetti on resolving penalty
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 50,
        spread: 40,
        colors: activeUser.username === 'rohit' ? ['#dffe00', '#000000'] : ['#00f0ff', '#000000']
      });

      await dbService.resolvePenalty(id);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to resolve penalty:', err);
    } finally {
      setResolvingId(null);
    }
  };

  // Compile totals for side-by-side Wall of Shame dashboard
  const rohitProfile = profiles.find(p => p.username === 'rohit');
  const rishitProfile = profiles.find(p => p.username === 'rishit');

  const getPenaltyStats = (userId: string) => {
    const userPens = penalties.filter(p => p.user_id === userId);
    const active = userPens.filter(p => p.status === 'pending').length;
    const resolved = userPens.filter(p => p.status === 'resolved').length;
    return { active, resolved };
  };

  const rohitStats = rohitProfile ? getPenaltyStats(rohitProfile.id) : { active: 0, resolved: 0 };
  const rishitStats = rishitProfile ? getPenaltyStats(rishitProfile.id) : { active: 0, resolved: 0 };

  const getPenaltyIcon = (type: string) => {
    switch (type) {
      case 'dsa_miss':
        return <Award size={18} className="text-neon-red" />;
      case 'cs_miss':
        return <BookOpen size={18} className="text-neon-red" />;
      case 'gym_miss':
        return <Dumbbell size={18} className="text-neon-red" />;
      default:
        return <AlertCircle size={18} className="text-neon-red" />;
    }
  };

  return (
    <div className="flex-grow bg-black px-4 py-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="border-b border-white/5 pb-4">
        <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white flex items-center gap-2">
          <ShieldAlert className="text-neon-red animate-pulse" />
          ACCOUNTABILITY WALL OF SHAME
        </h1>
        <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">
          Track missed daily tasks, penalty conditions, and clearance status
        </p>
      </div>

      {/* Comparative Penalty Dashboard */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Rohit Dashboard */}
        <div className="bg-[#050505] border border-neon-yellow/10 p-5 rounded-xl glass-card flex justify-between items-center relative overflow-hidden">
          <div className="flex flex-col gap-1">
            <h3 className="font-orbitron font-black text-lg tracking-wider text-neon-yellow text-glow-yellow">ROHIT'S INFRACTIONS</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Penalty clearance board</p>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black font-orbitron text-neon-red text-glow-red">{rohitStats.active}</span>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">Active</span>
            </div>
            <div className="flex flex-col items-center border-l border-white/5 pl-4">
              <span className="text-2xl font-black font-orbitron text-neon-green text-glow-green">{rohitStats.resolved}</span>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">Cleared</span>
            </div>
          </div>
        </div>

        {/* Rishit Dashboard */}
        <div className="bg-[#050505] border border-neon-blue/10 p-5 rounded-xl glass-card flex justify-between items-center relative overflow-hidden">
          <div className="flex flex-col gap-1">
            <h3 className="font-orbitron font-black text-lg tracking-wider text-neon-blue text-glow-blue">RISHIT'S INFRACTIONS</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Penalty clearance board</p>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black font-orbitron text-neon-red text-glow-red">{rishitStats.active}</span>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">Active</span>
            </div>
            <div className="flex flex-col items-center border-l border-white/5 pl-4">
              <span className="text-2xl font-black font-orbitron text-neon-green text-glow-green">{rishitStats.resolved}</span>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">Cleared</span>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-side or Tabbed Lists for Rohit & Rishit */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
        {/* Rohit List */}
        <div className="flex flex-col gap-4">
          <h3 className="font-orbitron font-bold text-xs uppercase text-neon-yellow/70 tracking-widest border-b border-white/5 pb-2">
            ROHIT'S INFRACTIONS LIST
          </h3>

          {loading ? (
            <div className="text-[11px] font-mono text-white/30 text-center py-6">LOADING PROTOCOL...</div>
          ) : penalties.filter(p => p.user_id === rohitProfile?.id).length === 0 ? (
            <div className="text-center py-10 text-[10px] text-white/30 font-semibold uppercase tracking-wider">
              No recorded penalties for Rohit! Perfect record.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1.5 custom-scrollbar">
              {penalties
                .filter(p => p.user_id === rohitProfile?.id)
                .map((pen) => {
                  const isPending = pen.status === 'pending';
                  return (
                    <div 
                      key={pen.id} 
                      className={`border rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all ${
                        isPending 
                          ? 'bg-neon-red/5 border-neon-red/10' 
                          : 'bg-white/5 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getPenaltyIcon(pen.penalty_type)}
                          <span className={`text-xs font-bold uppercase tracking-wider ${isPending ? 'text-neon-red' : 'text-white/40'}`}>
                            {pen.penalty_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-white/30">{pen.date_incurred}</span>
                      </div>

                      <p className="text-xs font-semibold text-white/90">{pen.description}</p>
                      
                      <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Required Fine</span>
                          <span className="text-[11px] font-semibold text-white/70">{pen.penalty_value}</span>
                        </div>

                        {isPending ? (
                          <button
                            onClick={() => handleResolvePenalty(pen.id, pen.user_id)}
                            disabled={resolvingId === pen.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neon-red/10 border border-neon-red/25 hover:bg-neon-red/20 text-neon-red text-[10px] font-bold tracking-wider font-orbitron transition-all"
                          >
                            {resolvingId === pen.id ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <CheckCircle size={11} />
                            )}
                            <span>RESOLVE</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-neon-green text-[10px] font-bold font-orbitron tracking-wider">
                            <CheckCircle size={11} />
                            CLEARED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Rishit List */}
        <div className="flex flex-col gap-4">
          <h3 className="font-orbitron font-bold text-xs uppercase text-neon-blue/70 tracking-widest border-b border-white/5 pb-2">
            RISHIT'S INFRACTIONS LIST
          </h3>

          {loading ? (
            <div className="text-[11px] font-mono text-white/30 text-center py-6">LOADING PROTOCOL...</div>
          ) : penalties.filter(p => p.user_id === rishitProfile?.id).length === 0 ? (
            <div className="text-center py-10 text-[10px] text-white/30 font-semibold uppercase tracking-wider">
              No recorded penalties for Rishit! Perfect record.
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-1.5 custom-scrollbar">
              {penalties
                .filter(p => p.user_id === rishitProfile?.id)
                .map((pen) => {
                  const isPending = pen.status === 'pending';
                  return (
                    <div 
                      key={pen.id} 
                      className={`border rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all ${
                        isPending 
                          ? 'bg-neon-red/5 border-neon-red/10' 
                          : 'bg-white/5 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {getPenaltyIcon(pen.penalty_type)}
                          <span className={`text-xs font-bold uppercase tracking-wider ${isPending ? 'text-neon-red' : 'text-white/40'}`}>
                            {pen.penalty_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-white/30">{pen.date_incurred}</span>
                      </div>

                      <p className="text-xs font-semibold text-white/90">{pen.description}</p>
                      
                      <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Required Fine</span>
                          <span className="text-[11px] font-semibold text-white/70">{pen.penalty_value}</span>
                        </div>

                        {isPending ? (
                          <button
                            onClick={() => handleResolvePenalty(pen.id, pen.user_id)}
                            disabled={resolvingId === pen.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neon-red/10 border border-neon-red/25 hover:bg-neon-red/20 text-neon-red text-[10px] font-bold tracking-wider font-orbitron transition-all"
                          >
                            {resolvingId === pen.id ? (
                              <RefreshCw size={11} className="animate-spin" />
                            ) : (
                              <CheckCircle size={11} />
                            )}
                            <span>RESOLVE</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-neon-green text-[10px] font-bold font-orbitron tracking-wider">
                            <CheckCircle size={11} />
                            CLEARED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
