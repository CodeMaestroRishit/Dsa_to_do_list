'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from '@/lib/types';
import { Zap, CheckSquare, Award, Flame, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

interface LiveFeedProps {
  activities: Activity[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'task_completed':
      return <CheckSquare size={13} className="text-neon-green" />;
    case 'dsa_session_added':
      return <BookOpen size={13} className="text-neon-blue" />;
    case 'topic_completed':
      return <Award size={13} className="text-purple-400" />;
    case 'streak_milestone':
      return <Flame size={13} className="text-orange-400 fill-orange-400/20" />;
    case 'penalty_incurred':
      return <ShieldAlert size={13} className="text-neon-red" />;
    case 'penalty_resolved':
      return <Sparkles size={13} className="text-neon-yellow" />;
    default:
      return <Zap size={13} className="text-white/60" />;
  }
};

const getActivityStyles = (type: string) => {
  switch (type) {
    case 'penalty_incurred':
      return 'border-neon-red/20 bg-neon-red/5 text-neon-red/90';
    case 'penalty_resolved':
      return 'border-neon-yellow/20 bg-neon-yellow/5 text-neon-yellow/90';
    case 'dsa_session_added':
      return 'border-neon-blue/20 bg-neon-blue/5 text-neon-blue/90';
    default:
      return 'border-white/5 bg-white/5 text-white/80';
  }
};

export const LiveFeed: React.FC<LiveFeedProps> = ({ activities }) => {
  return (
    <div className="w-full bg-[#050505] border border-white/5 rounded-xl p-4 glass-panel">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-ping" />
          <h3 className="font-orbitron font-bold text-xs tracking-wider uppercase text-white/80">
            REALTIME ACTIVITY PROTOCOL
          </h3>
        </div>
        <span className="text-[9px] font-mono text-white/30 tracking-widest">
          SYS_STATUS: ACTIVE
        </span>
      </div>

      {/* Feed List */}
      <div className="max-h-[220px] overflow-y-auto flex flex-col gap-2 pr-1.5 custom-scrollbar">
        <AnimatePresence initial={false}>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-xs text-white/30 font-semibold tracking-wide">
              NO ACTIVITY REGISTERED YET. GRIND BEGINS NOW.
            </div>
          ) : (
            activities.map((act) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs leading-relaxed transition-all duration-300 ${getActivityStyles(act.activity_type)}`}
              >
                <div className="flex-shrink-0">
                  {getActivityIcon(act.activity_type)}
                </div>
                
                <div className="flex-grow font-semibold">
                  {act.description}
                </div>

                <div className="flex-shrink-0 font-mono text-[9px] text-white/30 select-none">
                  {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default LiveFeed;
