'use client';

import React, { useMemo } from 'react';
import { Task, TaskCompletion, DSASession } from '@/lib/types';
import { getLocalDateString } from '@/lib/db';

interface ContributionGraphProps {
  userId: string;
  username: 'rohit' | 'rishit';
  tasks: Task[];
  completions: TaskCompletion[];
  sessions: DSASession[];
}

export const ContributionGraph: React.FC<ContributionGraphProps> = ({
  userId,
  username,
  tasks,
  completions,
  sessions,
}) => {
  const isRohit = username === 'rohit';
  const themeColor = isRohit ? 'bg-neon-yellow' : 'bg-neon-blue';
  
  // Grid settings: 16 weeks (112 days)
  const WEEKS_COUNT = 16;
  const DAYS_COUNT = WEEKS_COUNT * 7;

  const gridData = useMemo(() => {
    const today = new Date();
    const dataList = [];
    
    // We want the grid to end on today. So we backtrack DAYS_COUNT days
    // To align properly (having Sundays highlighted or aligning row-wise), we can calculate the offset.
    // Standard GitHub grid starts with Sunday on top, Saturday at the bottom.
    // Let's match: rows are days of the week (0=Sun, 1=Mon, ..., 6=Sat).
    
    const startOffset = DAYS_COUNT - 1;
    
    for (let i = startOffset; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(targetDate);
      
      // Calculate level of contribution: tasks completed + LeetCode questions solved
      const dayTasks = tasks.filter(t => t.date === dateStr && (t.assign_to === 'both' || t.assign_to === username));
      const dayCompletions = completions.filter(c => {
        const taskObj = tasks.find(t => t.id === c.task_id);
        return taskObj?.date === dateStr && c.user_id === userId && c.completed;
      });
      
      const daySessions = sessions.filter(s => s.date === dateStr);
      const questionsCount = daySessions.reduce((sum, s) => sum + s.questions_count, 0);

      const tasksCompletedCount = dayCompletions.length;
      const tasksTotalCount = dayTasks.length;

      // Contribution weight calculation
      let score = 0;
      score += tasksCompletedCount * 2; // Each task completed is 2 points
      score += questionsCount * 3;     // Each DSA question solved is 3 points

      let level = 0; // 0: none, 1: low, 2: medium, 3: high, 4: max grind
      if (score > 0 && score <= 3) level = 1;
      else if (score > 3 && score <= 6) level = 2;
      else if (score > 6 && score <= 10) level = 3;
      else if (score > 10) level = 4;

      dataList.push({
        date: dateStr,
        dayOfWeek: targetDate.getDay(),
        level,
        tasksCompleted: tasksCompletedCount,
        tasksTotal: tasksTotalCount,
        questionsSolved: questionsCount,
        score
      });
    }

    return dataList;
  }, [userId, username, tasks, completions, sessions]);

  // Group days into columns (weeks)
  const columns = useMemo(() => {
    const cols = [];
    let currentWeek = [];

    // To align the cells so that they form perfect columns where the bottom row is Saturday,
    // we want columns to contain 7 elements.
    // The gridData has chronological items. Let's group them in batches of 7.
    // To make sure each column represents a week aligning by dayOfWeek:
    // We pad the beginning of gridData so that the first element matches its dayOfWeek.
    const paddedData: (typeof gridData[number] | null)[] = [...gridData];
    const firstDayOfWeek = gridData[0].dayOfWeek;
    
    // Prepend empty pads if first day is not Sunday (0)
    for (let p = 0; p < firstDayOfWeek; p++) {
      paddedData.unshift(null);
    }

    for (let idx = 0; idx < paddedData.length; idx++) {
      currentWeek.push(paddedData[idx]);
      if (currentWeek.length === 7 || idx === paddedData.length - 1) {
        // Pad the last week if incomplete
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        cols.push(currentWeek);
        currentWeek = [];
      }
    }
    
    return cols.slice(-WEEKS_COUNT); // Return exact weeks count
  }, [gridData]);

  // Color mapper depending on level and user
  const getCellColorClass = (level: number, isSunday: boolean) => {
    if (level === 0) {
      return isSunday 
        ? 'bg-red-500/10 border border-red-500/10 hover:border-red-500/30' 
        : 'bg-white/5 border border-white/5 hover:border-white/15';
    }

    if (isRohit) {
      switch (level) {
        case 1: return 'bg-neon-yellow/20 border border-neon-yellow/30 shadow-[0_0_4px_rgba(223,254,0,0.1)]';
        case 2: return 'bg-neon-yellow/45 border border-neon-yellow/60 shadow-[0_0_6px_rgba(223,254,0,0.2)]';
        case 3: return 'bg-neon-yellow/75 border border-neon-yellow/80 shadow-[0_0_8px_rgba(223,254,0,0.35)]';
        case 4: return 'bg-neon-yellow border border-white shadow-[0_0_12px_#dffe00]';
        default: return 'bg-white/5';
      }
    } else {
      switch (level) {
        case 1: return 'bg-neon-blue/20 border border-neon-blue/30 shadow-[0_0_4px_rgba(0,240,255,0.1)]';
        case 2: return 'bg-neon-blue/45 border border-neon-blue/60 shadow-[0_0_6px_rgba(0,240,255,0.2)]';
        case 3: return 'bg-neon-blue/75 border border-neon-blue/80 shadow-[0_0_8px_rgba(0,240,255,0.35)]';
        case 4: return 'bg-neon-blue border border-white shadow-[0_0_12px_#00f0ff]';
        default: return 'bg-white/5';
      }
    }
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="w-full bg-[#070707] border border-white/5 p-4 rounded-xl glass-card">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-orbitron font-bold text-xs uppercase text-white/70 tracking-wider">
          {username.toUpperCase()}'S HEATMAP CONSISTENCY
        </h4>
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/40">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded bg-white/5 border border-white/5" />
          <div className={`w-2.5 h-2.5 rounded ${isRohit ? 'bg-neon-yellow/30' : 'bg-neon-blue/30'}`} />
          <div className={`w-2.5 h-2.5 rounded ${isRohit ? 'bg-neon-yellow/60' : 'bg-neon-blue/60'}`} />
          <div className={`w-2.5 h-2.5 rounded ${isRohit ? 'bg-neon-yellow' : 'bg-neon-blue'}`} />
          <span>More</span>
        </div>
      </div>

      <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide py-1">
        {/* Row labels */}
        <div className="grid grid-rows-7 gap-1 text-[9px] font-bold font-mono text-white/30 text-center select-none pt-0.5">
          {dayLabels.map((lbl, idx) => (
            <div key={idx} className="w-3.5 h-3.5 flex items-center justify-center">
              {idx % 2 === 0 ? lbl : ''}
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="flex gap-1">
          {columns.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-rows-7 gap-1">
              {week.map((day, dayIdx) => {
                if (!day) {
                  return <div key={dayIdx} className="w-3.5 h-3.5 rounded bg-transparent" />;
                }
                const isSunday = dayIdx === 0;
                
                return (
                  <div
                    key={dayIdx}
                    title={`${day.date}: ${day.questionsSolved} questions, ${day.tasksCompleted}/${day.tasksTotal} tasks completed. score: ${day.score}`}
                    className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 cursor-pointer ${getCellColorClass(
                      day.level,
                      isSunday
                    )}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-white/5 text-[9px] font-mono text-white/30 tracking-wide uppercase">
        <span>← 16 Weeks Ago</span>
        <span>Today</span>
      </div>
    </div>
  );
};
export default ContributionGraph;
