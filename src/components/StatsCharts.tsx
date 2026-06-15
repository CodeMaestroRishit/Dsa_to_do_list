'use client';

import React from 'react';

// -------------------------------------------------------------
// 1. DIFFICULTY BREAKDOWN CHART (Donut SVG Chart)
// -------------------------------------------------------------
interface DifficultyBreakdownProps {
  easy: number;
  medium: number;
  hard: number;
}

export const DifficultyBreakdown: React.FC<DifficultyBreakdownProps> = ({ easy, medium, hard }) => {
  const total = easy + medium + hard;
  
  // Percentages
  const easyPct = total > 0 ? Math.round((easy / total) * 100) : 0;
  const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
  const hardPct = total > 0 ? Math.round((hard / total) * 100) : 0;

  return (
    <div className="bg-white border-[3px] border-black p-5 rounded-2xl glass-card flex flex-col md:flex-row items-center gap-6 justify-around text-black shadow-[4px_4px_0px_#000000]">
      {/* SVG Donut */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Layered circular progress bars */}
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="50" className="stroke-black/10" strokeWidth="10" fill="transparent" />
          
          {/* Easy slice */}
          {total > 0 && (
            <circle
              cx="64"
              cy="64"
              r="50"
              className="stroke-black transition-all duration-1000"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 * (1 - easy / total)}
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black font-orbitron text-black">{total}</span>
          <span className="text-[8px] font-bold text-black/50 tracking-widest uppercase">SOLVED</span>
        </div>
      </div>

      {/* Legend and stats */}
      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-black/60 border-b border-black/10 pb-1">
          Difficulty Split
        </h4>
        
        {/* Easy */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-neo-green border border-black" />
            <span className="font-bold text-black/75">Easy</span>
          </div>
          <span className="font-extrabold font-mono text-black">{easy} ({easyPct}%)</span>
        </div>

        {/* Medium */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-neo-yellow border border-black" />
            <span className="font-bold text-black/75">Medium</span>
          </div>
          <span className="font-extrabold font-mono text-black">{medium} ({mediumPct}%)</span>
        </div>

        {/* Hard */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-neo-peach border border-black" />
            <span className="font-bold text-black/75">Hard</span>
          </div>
          <span className="font-extrabold font-mono text-black">{hard} ({hardPct}%)</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. TOPIC STATS (Horizontal bars)
// -------------------------------------------------------------
interface TopicStatsProps {
  topics: Record<string, number>; // e.g. { Graphs: 10, DP: 15 }
}

export const TopicStats: React.FC<TopicStatsProps> = ({ topics }) => {
  const sorted = Object.entries(topics).sort((a, b) => b[1] - a[1]);
  const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

  return (
    <div className="bg-white border-[3px] border-black p-5 rounded-2xl glass-card flex flex-col gap-4 text-black shadow-[4px_4px_0px_#000000]">
      <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-black border-b border-black/10 pb-2">
        TOPIC BREAKDOWN
      </h4>
      {sorted.length === 0 ? (
        <div className="text-center py-6 text-xs text-black/50 font-bold uppercase tracking-wider">
          No records. Input session in journal.
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-hide">
          {sorted.map(([name, val]) => {
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-black/85">{name}</span>
                  <span className="font-extrabold font-mono text-black">{val} Qs</span>
                </div>
                <div className="w-full bg-neo-gray border border-black/20 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-neo-blue h-full rounded-full transition-all duration-1000 ease-out border-r border-black"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// 3. WEEKLY GRAPH (Custom SVG bar chart)
// -------------------------------------------------------------
interface WeeklyGraphProps {
  dailySolved: Record<string, number>; // e.g. { "2026-06-03": 5, "2026-06-02": 3 }
  colorAccent: string;
}

export const WeeklyGraph: React.FC<WeeklyGraphProps> = ({ dailySolved }) => {
  // Compile last 7 days metrics
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const name = d.toLocaleDateString([], { weekday: 'short' });
    const count = dailySolved[dateStr] || 0;
    return { name, count, dateStr };
  });

  const maxVal = Math.max(...last7Days.map(x => x.count), 2); // default minimum ceiling is 2

  return (
    <div className="bg-white border-[3px] border-black p-5 rounded-2xl glass-card flex flex-col gap-4 text-black shadow-[4px_4px_0px_#000000]">
      <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-black border-b border-black/10 pb-2">
        WEEKLY VOLUME
      </h4>

      {/* SVG Bar Chart */}
      <div className="w-full h-36 flex items-end justify-between px-2 pt-2 border-b-2 border-black/10">
        {last7Days.map((day, idx) => {
          const heightPct = (day.count / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col items-center gap-2 w-[12%] h-full justify-end">
              {/* Count tooltip */}
              {day.count > 0 && (
                <span className="text-[9px] font-extrabold font-mono text-black leading-none">
                  {day.count}
                </span>
              )}
              {/* Bar shape */}
              <div 
                className="w-full rounded-t-md transition-all duration-1000 ease-out border-t-2 border-x-2 border-black"
                style={{ 
                  height: `${heightPct}%`, 
                  backgroundColor: day.count > 0 ? '#badbeb' : '#ebebeb',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between px-2 text-[9px] font-black font-mono text-black/50 tracking-wide select-none">
        {last7Days.map((day, idx) => (
          <span key={idx} className="w-[12%] text-center">
            {day.name.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
};
