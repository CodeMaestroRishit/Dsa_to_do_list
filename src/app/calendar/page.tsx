'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { Task, TaskCompletion, DSASession, Penalty, Profile } from '@/lib/types';
import { ChevronLeft, ChevronRight, X, Clock, Award, ShieldAlert, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CalendarPage() {
  const { refreshKey, profiles } = useSession();
  
  // Date states
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed

  // DB datasets
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allCompletions, setAllCompletions] = useState<TaskCompletion[]>([]);
  const [allSessions, setAllSessions] = useState<DSASession[]>([]);
  const [allPenalties, setAllPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal day selector
  const [selectedDayLog, setSelectedDayLog] = useState<{
    dateStr: string;
    tasks: Task[];
    completions: TaskCompletion[];
    sessions: DSASession[];
    penalties: Penalty[];
  } | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [refreshKey]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      // To get color codes for previous days, we fetch all logs.
      // If Supabase is active, we fetch via client queries, else from localStorage.
      let tasksData: Task[] = [];
      let completionsData: TaskCompletion[] = [];
      let sessionsData: DSASession[] = [];
      let penaltiesData: Penalty[] = [];

      if (dbService.isSupabase()) {
        const { data: dbTasks } = await (dbService as any).supabase.from('tasks').select('*');
        const { data: dbComps } = await (dbService as any).supabase.from('task_completions').select('*');
        const { data: dbSess } = await (dbService as any).supabase.from('dsa_sessions').select('*');
        const { data: dbPenalties } = await (dbService as any).supabase.from('penalties').select('*');
        tasksData = dbTasks || [];
        completionsData = dbComps || [];
        sessionsData = dbSess || [];
        penaltiesData = dbPenalties || [];
      } else {
        tasksData = JSON.parse(localStorage.getItem('pd_tasks') || '[]');
        completionsData = JSON.parse(localStorage.getItem('pd_completions') || '[]');
        sessionsData = JSON.parse(localStorage.getItem('pd_dsa_sessions') || '[]');
        penaltiesData = JSON.parse(localStorage.getItem('pd_penalties') || '[]');
      }

      setAllTasks(tasksData);
      setAllCompletions(completionsData);
      setAllSessions(sessionsData);
      setAllPenalties(penaltiesData);
    } catch (err) {
      console.error('Failed to load calendar datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Switch Month Helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Compile calendar grid cells
  const daysInMonth = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const cells = [];
    
    // Day of the week offset for the 1st of the month (0=Sun, 1=Mon, ..., 6=Sat)
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

    // Add empty pads for preceding month
    for (let p = 0; p < firstDayIndex; p++) {
      cells.push(null);
    }

    // Add actual days
    for (let day = 1; day <= totalDays; day++) {
      const targetDate = new Date(currentYear, currentMonth, day);
      const dateStr = getLocalDateString(targetDate);
      
      // Calculate completion levels across Rohit & Rishit on this day
      const dayTasks = allTasks.filter(t => t.date === dateStr);
      const dayComps = allCompletions.filter(c => {
        const taskObj = allTasks.find(t => t.id === c.task_id);
        return taskObj?.date === dateStr && c.completed;
      });

      // Filter sessions and penalties
      const daySessions = allSessions.filter(s => s.date === dateStr);
      const dayPenalties = allPenalties.filter(p => p.date_incurred === dateStr);

      // Color coding logic:
      // Green = fully completed (all assigned task targets met by everyone)
      // Yellow = partially completed (some tasks completed)
      // Red = failed day (0 tasks completed, but tasks existed)
      
      let status: 'empty' | 'green' | 'yellow' | 'red' = 'empty';
      
      if (dayTasks.length > 0) {
        // Calculate completions ratio
        // Total possible user tasks: each task has assigned check.
        let totalAssignedChecks = 0;
        dayTasks.forEach(t => {
          if (t.assign_to === 'both') totalAssignedChecks += 2;
          else totalAssignedChecks += 1;
        });

        const completedChecksCount = dayComps.length;

        if (completedChecksCount === totalAssignedChecks && totalAssignedChecks > 0) {
          status = 'green';
        } else if (completedChecksCount > 0) {
          status = 'yellow';
        } else if (completedChecksCount === 0 && totalAssignedChecks > 0) {
          status = 'red';
        }
      }

      cells.push({
        dayNumber: day,
        dateStr,
        dayOfWeek: targetDate.getDay(),
        status,
        tasks: dayTasks,
        completions: dayComps,
        sessions: daySessions,
        penalties: dayPenalties
      });
    }

    return cells;
  }, [currentYear, currentMonth, allTasks, allCompletions, allSessions, allPenalties]);

  const handleCellClick = (cell: any) => {
    if (!cell) return;
    // Map tasks and completions for display
    const cellComps = allCompletions.filter(c => cell.tasks.some((t: Task) => t.id === c.task_id));
    
    setSelectedDayLog({
      dateStr: cell.dateStr,
      tasks: cell.tasks,
      completions: cellComps,
      sessions: cell.sessions,
      penalties: cell.penalties
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading && allTasks.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-t-neon-yellow border-white/5 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-black px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-6 relative">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white">
            COMPLETION CALENDAR LOG
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">
            Visualize color-coded accountability status and daily recaps
          </p>
        </div>

        {/* Month selector UI */}
        <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
          <button onClick={handlePrevMonth} className="text-white/60 hover:text-white transition-all">
            <ChevronLeft size={16} />
          </button>
          <span className="font-orbitron font-bold text-xs uppercase tracking-wider text-white/80 select-none min-w-[120px] text-center">
            {monthNames[currentMonth].toUpperCase()} {currentYear}
          </span>
          <button onClick={handleNextMonth} className="text-white/60 hover:text-white transition-all">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend Indicator Banners */}
      <div className="flex flex-wrap gap-4 items-center justify-center text-[10px] font-bold text-white/40 tracking-wider uppercase border border-white/5 bg-white/5 px-4 py-2.5 rounded-xl">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-md bg-neon-green/20 border border-neon-green/30 shadow-[0_0_6px_rgba(52,199,89,0.2)]" />
          <span>Fully Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-md bg-neon-yellow/20 border border-neon-yellow/30 shadow-[0_0_6px_rgba(223,254,0,0.2)]" />
          <span>Partially Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-md bg-neon-red/20 border border-neon-red/30 shadow-[0_0_6px_rgba(255,59,48,0.2)]" />
          <span>Failed Targets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-md bg-white/5 border border-white/5" />
          <span>No Schedule Set</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-md bg-[#0d0d0d] border border-red-500/20" />
          <span>Sundays (Rest)</span>
        </div>
      </div>

      {/* Grid Layout of Calendar */}
      <section className="bg-[#050505] border border-white/5 rounded-2xl p-4 md:p-6 glass-panel flex flex-col gap-4">
        {/* Days of week labels */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold font-orbitron tracking-widest text-white/30 select-none pb-2 border-b border-white/5">
          <span>SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {daysInMonth.map((cell, idx) => {
            if (!cell) {
              return <div key={`pad-${idx}`} className="aspect-square bg-transparent rounded-lg" />;
            }

            const isSunday = cell.dayOfWeek === 0;
            const isToday = cell.dateStr === getLocalDateString();
            
            // Map cell background
            let cellBg = 'bg-white/5 border-white/5 hover:border-white/20';
            if (cell.status === 'green') {
              cellBg = 'bg-neon-green/10 border-neon-green/20 text-neon-green hover:border-neon-green/50 shadow-[0_0_8px_rgba(52,199,89,0.08)]';
            } else if (cell.status === 'yellow') {
              cellBg = 'bg-neon-yellow/10 border-neon-yellow/20 text-neon-yellow hover:border-neon-yellow/50 shadow-[0_0_8px_rgba(223,254,0,0.08)]';
            } else if (cell.status === 'red') {
              cellBg = 'bg-neon-red/10 border-neon-red/20 text-neon-red hover:border-neon-red/50 shadow-[0_0_8px_rgba(255,59,48,0.08)]';
            } else if (isSunday) {
              cellBg = 'bg-[#0a0a0a] border-red-500/10 text-white/40 hover:border-red-500/25';
            }

            return (
              <button
                key={`day-${cell.dayNumber}`}
                onClick={() => handleCellClick(cell)}
                className={`aspect-square rounded-xl border flex flex-col p-2 items-start justify-between transition-all relative select-none ${cellBg} ${
                  isToday ? 'ring-1 ring-white/50 border-white/40 scale-[1.03]' : ''
                }`}
              >
                {/* Day Number */}
                <span className="font-orbitron font-black text-xs md:text-sm">{cell.dayNumber}</span>
                
                {/* Tweak status badge for dots */}
                <div className="flex gap-1 flex-wrap mt-auto">
                  {cell.sessions.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-blue shadow-[0_0_4px_#00f0ff]" title="DSA study logged" />
                  )}
                  {cell.penalties.length > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red shadow-[0_0_4px_#ff3b30]" title="Penalties issued" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Detailed day recap modal */}
      <AnimatePresence>
        {selectedDayLog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedDayLog(null)}
                className="absolute right-4 top-4 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>

              <h2 className="font-orbitron font-black text-base tracking-wider text-white mb-4 border-b border-white/5 pb-2">
                RECAP REPORT: {selectedDayLog.dateStr}
              </h2>

              <div className="flex flex-col gap-5 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                
                {/* 1. Daily Objectives */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare size={13} />
                    Daily Objectives ({selectedDayLog.tasks.length})
                  </h4>
                  
                  {selectedDayLog.tasks.length === 0 ? (
                    <div className="text-[11px] text-white/30 italic">No objectives scheduled.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {selectedDayLog.tasks.map((task) => {
                        const rohitComp = selectedDayLog.completions.find(c => c.task_id === task.id && c.user_id === '11111111-1111-1111-1111-111111111111')?.completed;
                        const rishitComp = selectedDayLog.completions.find(c => c.task_id === task.id && c.user_id === '22222222-2222-2222-2222-222222222222')?.completed;

                        return (
                          <div key={task.id} className="bg-white/5 border border-white/5 px-3 py-2 rounded-lg flex items-center justify-between text-xs font-semibold">
                            <span className="text-white/80">{task.title}</span>
                            <div className="flex items-center gap-3 text-[9px] font-mono font-bold">
                              {(task.assign_to === 'both' || task.assign_to === 'rohit') && (
                                <span className={rohitComp ? 'text-neon-yellow' : 'text-white/20'}>
                                  ROHIT: {rohitComp ? 'COMPLETED' : 'MISSED'}
                                </span>
                              )}
                              {(task.assign_to === 'both' || task.assign_to === 'rishit') && (
                                <span className={rishitComp ? 'text-neon-blue' : 'text-white/20'}>
                                  RISHIT: {rishitComp ? 'COMPLETED' : 'MISSED'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. DSA Journal Logs */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={13} />
                    DSA Journal Logs ({selectedDayLog.sessions.length})
                  </h4>

                  {selectedDayLog.sessions.length === 0 ? (
                    <div className="text-[11px] text-white/30 italic">No DSA sessions logged.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedDayLog.sessions.map((sess) => {
                        const isRohit = sess.user_id === '11111111-1111-1111-1111-111111111111';
                        return (
                          <div key={sess.id} className={`border p-3 rounded-lg bg-white/5 ${isRohit ? 'border-neon-yellow/20' : 'border-neon-blue/20'}`}>
                            <div className="flex justify-between items-center text-xs font-bold font-orbitron mb-1.5">
                              <span className={isRohit ? 'text-neon-yellow' : 'text-neon-blue'}>
                                {isRohit ? 'ROHIT' : 'RISHIT'} - {sess.topic}
                              </span>
                              <span className="text-[10px] text-white/40">{sess.time_spent} mins study</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {sess.leetcode_questions.map((q, idx) => (
                                <span key={idx} className="text-[9px] text-white/70 bg-black px-1.5 py-0.5 rounded border border-white/5 font-semibold">
                                  {q}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] text-white/50 leading-relaxed">{sess.notes}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Penalties Issued */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert size={13} />
                    Penalties Issued ({selectedDayLog.penalties.length})
                  </h4>

                  {selectedDayLog.penalties.length === 0 ? (
                    <div className="text-[11px] text-white/30 italic">No penalties issued.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {selectedDayLog.penalties.map((pen) => {
                        const isRohit = pen.user_id === '11111111-1111-1111-1111-111111111111';
                        return (
                          <div key={pen.id} className="bg-neon-red/5 border border-neon-red/20 px-3 py-2.5 rounded-lg flex flex-col gap-1 text-xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-neon-red">{isRohit ? 'ROHIT' : 'RISHIT'} PENALTY</span>
                              <span className="text-[9px] font-mono text-white/40">{pen.status.toUpperCase()}</span>
                            </div>
                            <p className="text-white/80 font-semibold">{pen.description}</p>
                            <p className="text-[10px] text-white/40">Fine: {pen.penalty_value}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
