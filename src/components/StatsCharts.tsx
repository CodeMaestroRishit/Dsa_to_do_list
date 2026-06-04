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
    <div className="bg-[#070707] border border-white/5 p-5 rounded-xl glass-card flex flex-col md:flex-row items-center gap-6 justify-around">
      {/* SVG Donut */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Layered circular progress bars */}
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="50" className="stroke-white/5" strokeWidth="10" fill="transparent" />
          
          {/* Easy slice */}
          {total > 0 && (
            <circle
              cx="64"
              cy="64"
              r="50"
              className="stroke-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-1000"
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={2 * Math.PI * 50 * (1 - easy / total)}
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-black font-orbitron text-white">{total}</span>
          <span className="text-[8px] font-bold text-white/40 tracking-widest uppercase">SOLVED</span>
        </div>
      </div>

      {/* Legend and stats */}
      <div className="flex flex-col gap-3 w-full max-w-[200px]">
        <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-white/50 border-b border-white/5 pb-1">
          Difficulty Split
        </h4>
        
        {/* Easy */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="font-semibold text-white/70">Easy</span>
          </div>
          <span className="font-bold font-mono text-emerald-400">{easy} ({easyPct}%)</span>
        </div>

        {/* Medium */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
            <span className="font-semibold text-white/70">Medium</span>
          </div>
          <span className="font-bold font-mono text-amber-400">{medium} ({mediumPct}%)</span>
        </div>

        {/* Hard */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            <span className="font-semibold text-white/70">Hard</span>
          </div>
          <span className="font-bold font-mono text-rose-400">{hard} ({hardPct}%)</span>
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
    <div className="bg-[#070707] border border-white/5 p-5 rounded-xl glass-card flex flex-col gap-4">
      <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-white/80 border-b border-white/5 pb-2">
        TOPIC BREAKDOWN
      </h4>
      {sorted.length === 0 ? (
        <div className="text-center py-6 text-xs text-white/30 font-semibold uppercase tracking-wider">
          No records. Input session in journal.
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
          {sorted.map(([name, val]) => {
            const pct = Math.round((val / maxVal) * 100);
            return (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white/70">{name}</span>
                  <span className="font-bold font-mono text-white/90">{val} Qs</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-white/20 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_4px_rgba(255,255,255,0.1)]"
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
  colorAccent: 'yellow' | 'blue';
}

export const WeeklyGraph: React.FC<WeeklyGraphProps> = ({ dailySolved, colorAccent }) => {
  const isYellow = colorAccent === 'yellow';
  const barColor = isYellow ? '#dffe00' : '#00f0ff';
  const barShadow = isYellow ? 'rgba(223, 254, 0, 0.4)' : 'rgba(0, 240, 255, 0.4)';

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
    <div className="bg-[#070707] border border-white/5 p-5 rounded-xl glass-card flex flex-col gap-4">
      <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-white/80 border-b border-white/5 pb-2">
        WEEKLY VOLUME
      </h4>

      {/* SVG Bar Chart */}
      <div className="w-full h-36 flex items-end justify-between px-2 pt-2 border-b border-white/5">
        {last7Days.map((day, idx) => {
          const heightPct = (day.count / maxVal) * 100;
          return (
            <div key={idx} className="flex flex-col items-center gap-2 w-[12%] h-full justify-end">
              {/* Count tooltip */}
              {day.count > 0 && (
                <span className="text-[9px] font-bold font-mono text-white/80 leading-none">
                  {day.count}
                </span>
              )}
              {/* Bar shape */}
              <div 
                className="w-full rounded-t-sm transition-all duration-1000 ease-out"
                style={{ 
                  height: `${heightPct}%`, 
                  backgroundColor: day.count > 0 ? barColor : 'rgba(255,255,255,0.03)',
                  boxShadow: day.count > 0 ? `0 0 10px ${barShadow}` : 'none'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X Axis Labels */}
      <div className="flex justify-between px-2 text-[9px] font-bold font-mono text-white/30 tracking-wide select-none">
        {last7Days.map((day, idx) => (
          <span key={idx} className="w-[12%] text-center">
            {day.name.toUpperCase()}
          </span>
        ))}
      </div>
    </div>
  );
};
