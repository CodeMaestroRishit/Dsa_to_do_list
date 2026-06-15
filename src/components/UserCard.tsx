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
  const borderClass = isRohit ? 'bg-neo-yellow' : 'bg-white';
  
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
      className={`w-full rounded-2xl p-6 border-[3px] border-black ${borderClass} shadow-[5px_5px_0px_#000000] relative overflow-hidden text-black`}
    >

      {/* Profile Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className={`${isRohit ? 'bg-neo-yellow' : 'bg-neo-blue'} border-2 border-black px-3.5 py-1.5 rounded-xl inline-block shadow-[2.5px_2.5px_0px_#000000] mb-1.5`}>
            <h2 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-black">
              {profile.display_name.toUpperCase()}
            </h2>
          </div>
          <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mt-1">
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
              className="stroke-black/10"
              strokeWidth="5"
              fill="transparent"
            />
            {/* Active Progress Circle */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              className="stroke-black transition-all duration-1000 ease-out"
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[11px] font-orbitron font-black text-black leading-none">
              {streak.weekly_consistency}%
            </span>
            <span className="text-[7px] text-black/60 uppercase font-bold mt-0.5">
              CONSIST
            </span>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Streak Block */}
        <div className="bg-neo-yellow border-2 border-black p-3.5 rounded-xl flex items-center gap-3 shadow-[2.5px_2.5px_0px_#000000]">
          <div className="p-2 rounded-lg bg-black text-white border border-black">
            <Flame size={20} className="fill-current text-neo-yellow" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-black">{streak.current_streak}</span>
              <span className="text-[10px] font-bold text-black/40">DAYS</span>
            </div>
            <p className="text-[9px] font-bold text-black/60 uppercase tracking-wide">Current Streak</p>
          </div>
        </div>

        {/* Max Streak Block */}
        <div className="bg-neo-peach border-2 border-black p-3.5 rounded-xl flex items-center gap-3 shadow-[2.5px_2.5px_0px_#000000]">
          <div className="p-2 rounded-lg bg-black text-white border border-black">
            <Flame size={20} className="text-neo-peach" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-black">{streak.longest_streak}</span>
              <span className="text-[10px] font-bold text-black/40">DAYS</span>
            </div>
            <p className="text-[9px] font-bold text-black/60 uppercase tracking-wide">Longest Streak</p>
          </div>
        </div>

        {/* Today's Study Hours */}
        <div className="bg-neo-blue border-2 border-black p-3.5 rounded-xl flex items-center gap-3 shadow-[2.5px_2.5px_0px_#000000]">
          <div className="p-2 rounded-lg bg-black text-white border border-black">
            <Clock size={20} className="text-neo-blue" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-black">{studyHoursToday}</span>
              <span className="text-[10px] font-bold text-black/40">HRS</span>
            </div>
            <p className="text-[9px] font-bold text-black/60 uppercase tracking-wide">Grind Hours Today</p>
          </div>
        </div>

        {/* DSA Questions Solved */}
        <div className="bg-neo-purple border-2 border-black p-3.5 rounded-xl flex items-center gap-3 shadow-[2.5px_2.5px_0px_#000000]">
          <div className="p-2 rounded-lg bg-black text-white border border-black">
            <Award size={20} className="text-neo-purple" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black font-orbitron text-black">{questionsToday}</span>
              <span className="text-[10px] font-bold text-black/40">SOLVED</span>
            </div>
            <p className="text-[9px] font-bold text-black/60 uppercase tracking-wide">Questions Today</p>
          </div>
        </div>
      </div>

      {/* Today's Planner Completion Status */}
      <div className="bg-white border-2 border-black p-4 rounded-xl shadow-[3px_3px_0px_#000000] text-black">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5 text-black">
             <CheckCircle2 size={13} className="text-black font-bold" />
            <span className="text-xs font-bold">Today&apos;s Tasks</span>
          </div>
          <span className="text-xs font-black font-orbitron text-black">
            {tasksCompletedToday} / {totalTasksToday} ({taskPct}%)
          </span>
        </div>
        
        {/* Glowing Progress Bar */}
        <div className="w-full bg-neo-gray border-2 border-black h-4 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-700 ease-out bg-neo-green border-r-2 border-black"
            style={{ width: `${taskPct}%` }}
          />
        </div>
      </div>

      {/* LeetCode Total Summary */}
      <div className="mt-4 pt-4 border-t-2 border-black flex justify-between items-center text-[10px] text-black/60 font-bold tracking-wider uppercase">
        <span>Total LeetCode Solved</span>
        <span className="font-orbitron font-black text-black text-xs">
          {progress.leetcode_easy_offset + progress.leetcode_medium_offset + progress.leetcode_hard_offset}
          <span className="text-[9px] text-black/60 font-bold ml-1">
            (E: {progress.leetcode_easy_offset} / M: {progress.leetcode_medium_offset} / H: {progress.leetcode_hard_offset})
          </span>
        </span>
      </div>

    </motion.div>
  );
};
export default UserCard;
