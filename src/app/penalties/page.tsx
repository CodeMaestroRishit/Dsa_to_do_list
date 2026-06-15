'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService } from '@/lib/db';
import { Penalty } from '@/lib/types';
import { ShieldAlert, CheckCircle, RefreshCw, AlertCircle, Dumbbell, Award, BookOpen } from 'lucide-react';

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
        colors: ['#00f0ff', '#000000']
      });

      await dbService.resolvePenalty(id);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to resolve penalty:', err);
    } finally {
      setResolvingId(null);
    }
  };

  // Compile totals for Wall of Shame dashboard
  const rishitProfile = profiles.find(p => p.username === 'rishit');

  const getPenaltyStats = (userId: string) => {
    const userPens = penalties.filter(p => p.user_id === userId);
    const active = userPens.filter(p => p.status === 'pending').length;
    const resolved = userPens.filter(p => p.status === 'resolved').length;
    return { active, resolved };
  };

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
    <div className="flex-grow bg-transparent px-4 py-8 max-w-5xl mx-auto w-full flex flex-col gap-6 relative z-10 text-black">
      
      {/* Page Header */}
      <div className="border-b-4 border-black pb-4">
        <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-black flex items-center gap-2">
          <ShieldAlert className="text-red-600 animate-pulse" />
          ACCOUNTABILITY WALL OF SHAME
        </h1>
        <p className="text-xs font-bold text-black/60 uppercase tracking-widest mt-0.5">
          Track missed daily tasks, penalty conditions, and clearance status
        </p>
      </div>

      {/* Rishit Penalty Dashboard */}
      <section className="w-full">
        <div className="bg-white border-[3px] border-black p-5 rounded-2xl glass-card flex justify-between items-center relative overflow-hidden shadow-[4px_4px_0px_#000000] text-black">
          <div className="flex flex-col gap-1">
            <h3 className="font-orbitron font-black text-lg tracking-wider text-black">RISHIT&apos;S INFRACTIONS</h3>
            <p className="text-[10px] text-black/60 font-bold uppercase tracking-wider">Penalty clearance board</p>
          </div>
          <div className="flex gap-4 font-bold">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black font-orbitron text-red-600">{rishitStats.active}</span>
              <span className="text-[8px] font-bold text-black/55 uppercase tracking-wider">Active</span>
            </div>
            <div className="flex flex-col items-center border-l-2 border-black/15 pl-4">
              <span className="text-2xl font-black font-orbitron text-neo-green">{rishitStats.resolved}</span>
              <span className="text-[8px] font-bold text-black/55 uppercase tracking-wider">Cleared</span>
            </div>
          </div>
        </div>
      </section>

      {/* Rishit Infractions List */}
      <section className="w-full">
        <div className="flex flex-col gap-4">
          <h3 className="font-orbitron font-bold text-xs uppercase text-black/70 tracking-widest border-b-2 border-black pb-2">
            RISHIT&apos;S INFRACTIONS LIST
          </h3>

          {loading ? (
            <div className="text-[11px] font-mono text-black/55 font-bold text-center py-6">LOADING PROTOCOL...</div>
          ) : penalties.filter(p => p.user_id === rishitProfile?.id).length === 0 ? (
            <div className="text-center py-10 text-[10px] text-black/50 font-bold uppercase tracking-wider">
              No recorded penalties for Rishit! Perfect record.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {penalties
                .filter(p => p.user_id === rishitProfile?.id)
                .map((pen) => {
                  const isPending = pen.status === 'pending';
                  return (
                    <div 
                      key={pen.id} 
                      className={`border-2 border-black rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all shadow-[2px_2px_0px_#000000] ${
                        isPending 
                          ? 'bg-rose-100' 
                          : 'bg-neo-gray opacity-60 shadow-none'
                      }`}
                    >
                      <div className="flex justify-between items-start border-b border-black/10 pb-1">
                        <div className="flex items-center gap-2">
                          {getPenaltyIcon(pen.penalty_type)}
                          <span className={`text-xs font-black uppercase tracking-wider ${isPending ? 'text-red-700' : 'text-black/50'}`}>
                            {pen.penalty_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-black/55">{pen.date_incurred}</span>
                      </div>

                      <p className="text-xs font-bold text-black">{pen.description}</p>
                      
                      <div className="mt-1 pt-2 border-t border-black/10 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-black/50 uppercase tracking-widest">Required Fine</span>
                          <span className="text-[11px] font-extrabold text-black">{pen.penalty_value}</span>
                        </div>

                        {isPending ? (
                          <button
                            onClick={() => handleResolvePenalty(pen.id, pen.user_id)}
                            disabled={resolvingId === pen.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border-2 border-black hover:bg-neo-yellow text-black text-[10px] font-black tracking-wider font-orbitron transition-all shadow-[1.5px_1.5px_0px_#000000] active:translate-y-[1px] active:shadow-none cursor-pointer"
                          >
                            {resolvingId === pen.id ? (
                              <RefreshCw size={11} className="animate-spin text-black" />
                            ) : (
                              <CheckCircle size={11} className="text-black" />
                            )}
                            <span>RESOLVE</span>
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-neo-green text-[10px] font-extrabold font-orbitron tracking-wider">
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
