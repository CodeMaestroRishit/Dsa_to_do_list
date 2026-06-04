'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { UserStats } from '@/lib/types';
import { Flame, Clock, Award, CheckCircle2 } from 'lucide-react';

interface UserCardProps {
  stats: UserStats;
}

export const UserCard: React.FC<UserCardProps> = ({ stats }) => {
  const { profile, streak, progress, tasksCompletedToday, totalTasksToday, studyHoursToday, questionsToday } = stats;
  const isRohit = profile.username === 'rohit';
  const themeColor = isRohit ? 'text-neon-yellow' : 'text-neon-blue';
  const borderClass = isRohit ? 'glass-card-rohit' : 'glass-card-rishit';
  const glowTextClass = isRohit ? 'text-glow-yellow' : 'text-glow-blue';
  
  // Calculate task completion percentage
  const taskPct = totalTasksToday > 0 ? Math.round((tasksCompletedToday / totalTasksToday) * 100) : 0;
  
  // Circular Progress Calculation for Consistency
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (streak.weekly_consistency / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, cubicBezier: [0.16, 1, 0.3, 1] }}
      className={`w-full rounded-2xl p-6 ${borderClass} relative overflow-hidden`}
    >
      {/* Decorative neon ambient back glow */}
      <div 
        className={`absolute -right-16 -top-16 w-32 h-32 rounded-full blur-[80px] pointer-events-none opacity-20 ${
          isRohit ? 'bg-neon-yellow' : 'bg-neon-blue'
        }`} 
      />

      {/* Profile Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className={`font-orbitron font-black text-2xl tracking-wider ${themeColor} ${glowTextClass}`}>
            {profile.display_name.toUpperCase()}
          </h2>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
            Focus: {progress.current_topic}
          </p>
        </div>

        {/* Weekly Consistency Progress Circle */}
        <div className="relative flex items-center justify-center">
          <svg className="w-16 h-16 transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              className="stroke-white/5"
              strokeWidth="5"
              fill="transparent"
            />
            {/* Active Progress Circle */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              className={`${isRohit ? 'stroke-neon-yellow' : 'stroke-neon-blue'} transition-all duration-1000 ease-out`}
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[11px] font-orbitron font-bold text-white leading-none">
              {streak.weekly_consistency}%
            </span>
            <span className="text-[7px] text-white/40 uppercase font-semibold mt-0.5">
              CONSIST
            </span>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Streak Block */}
        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isRohit ? 'bg-neon-yellow/10 text-neon-yellow' : 'bg-neon-blue/10 text-neon-blue'}`}>
            <Flame size={20} className="fill-current" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-white">{streak.current_streak}</span>
              <span className="text-[10px] font-bold text-white/30">DAYS</span>
            </div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wide">Current Streak</p>
          </div>
        </div>

        {/* Max Streak Block */}
        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
            <Flame size={20} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-white">{streak.longest_streak}</span>
              <span className="text-[10px] font-bold text-white/30">DAYS</span>
            </div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wide">Longest Streak</p>
          </div>
        </div>

        {/* Today's Study Hours */}
        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-white">{studyHoursToday}</span>
              <span className="text-[10px] font-bold text-white/30">HRS</span>
            </div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wide">Grind Hours Today</p>
          </div>
        </div>

        {/* DSA Questions Solved */}
        <div className="bg-white/5 border border-white/5 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Award size={20} />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-white">{questionsToday}</span>
              <span className="text-[10px] font-bold text-white/30">SOLVED</span>
            </div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wide">Questions Today</p>
          </div>
        </div>
      </div>

      {/* Today's Planner Completion Status */}
      <div className="bg-white/5 border border-white/5 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5 text-white/60">
            <CheckCircle2 size={13} className={tasksCompletedToday === totalTasksToday && totalTasksToday > 0 ? 'text-neon-green' : ''} />
            <span className="text-xs font-semibold">Today's Tasks</span>
          </div>
          <span className="text-xs font-bold font-orbitron">
            {tasksCompletedToday} / {totalTasksToday} ({taskPct}%)
          </span>
        </div>
        
        {/* Glowing Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isRohit 
                ? 'bg-neon-yellow shadow-[0_0_8px_#dffe00]' 
                : 'bg-neon-blue shadow-[0_0_8px_#00f0ff]'
            }`}
            style={{ width: `${taskPct}%` }}
          />
        </div>
      </div>

      {/* LeetCode Total Summary */}
      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/40 font-semibold tracking-wider uppercase">
        <span>Total LeetCode Solved</span>
        <span className={`font-orbitron font-bold text-white text-xs`}>
          {progress.leetcode_easy_offset + progress.leetcode_medium_offset + progress.leetcode_hard_offset}
          <span className="text-[9px] text-white/40 font-normal ml-1">
            (E: {progress.leetcode_easy_offset} / M: {progress.leetcode_medium_offset} / H: {progress.leetcode_hard_offset})
          </span>
        </span>
      </div>

    </motion.div>
  );
};
export default UserCard;
