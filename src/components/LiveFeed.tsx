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
      return <CheckSquare size={13} className="text-black" />;
    case 'dsa_session_added':
      return <BookOpen size={13} className="text-black" />;
    case 'topic_completed':
      return <Award size={13} className="text-black" />;
    case 'streak_milestone':
      return <Flame size={13} className="text-black" />;
    case 'penalty_incurred':
      return <ShieldAlert size={13} className="text-black" />;
    case 'penalty_resolved':
      return <Sparkles size={13} className="text-black" />;
    default:
      return <Zap size={13} className="text-black" />;
  }
};

const getActivityStyles = (type: string) => {
  switch (type) {
    case 'penalty_incurred':
      return 'border-2 border-black bg-rose-200 text-black shadow-[2px_2px_0px_#000000]';
    case 'penalty_resolved':
      return 'border-2 border-black bg-neo-green text-black shadow-[2px_2px_0px_#000000]';
    case 'dsa_session_added':
      return 'border-2 border-black bg-neo-blue text-black shadow-[2px_2px_0px_#000000]';
    case 'task_completed':
      return 'border-2 border-black bg-neo-yellow text-black shadow-[2px_2px_0px_#000000]';
    default:
      return 'border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000000]';
  }
};

export const LiveFeed: React.FC<LiveFeedProps> = ({ activities }) => {
  return (
    <div className="w-full bg-white rounded-2xl p-4 glass-panel flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-black/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neo-green border border-black animate-pulse" />
          <h3 className="font-orbitron font-bold text-xs tracking-wider uppercase text-black">
            REALTIME ACTIVITY PROTOCOL
          </h3>
        </div>
        <span className="text-[9px] font-mono text-black/50 tracking-widest font-bold">
          SYS_STATUS: ACTIVE
        </span>
      </div>

      {/* Feed List */}
      <div className="max-h-[220px] overflow-y-auto flex flex-col gap-2.5 pr-1.5 scrollbar-hide">
        <AnimatePresence initial={false}>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-xs text-black/50 font-bold tracking-wide">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs leading-relaxed transition-all duration-300 ${getActivityStyles(act.activity_type)}`}
              >
                <div className="flex-shrink-0">
                  {getActivityIcon(act.activity_type)}
                </div>
                
                <div className="flex-grow font-bold">
                  {act.description}
                </div>

                <div className="flex-shrink-0 font-mono text-[9px] text-black/50 select-none font-bold">
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
