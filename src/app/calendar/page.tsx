'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { Task, TaskCompletion, DSASession, Penalty } from '@/lib/types';
import { ChevronLeft, ChevronRight, X, Award, ShieldAlert, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CalendarPage() {
  const { refreshKey } = useSession();
  
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
        const dbServiceWithSupabase = dbService as unknown as {
          supabase: {
            from: (table: string) => {
              select: (fields: string) => Promise<{ data: Record<string, unknown>[] | null }>;
            };
          };
        };
        const { data: dbTasks } = await dbServiceWithSupabase.supabase.from('tasks').select('*');
        const { data: dbComps } = await dbServiceWithSupabase.supabase.from('task_completions').select('*');
        const { data: dbSess } = await dbServiceWithSupabase.supabase.from('dsa_sessions').select('*');
        const { data: dbPenalties } = await dbServiceWithSupabase.supabase.from('penalties').select('*');
        tasksData = (dbTasks || []) as unknown as Task[];
        completionsData = (dbComps || []) as unknown as TaskCompletion[];
        sessionsData = (dbSess || []) as unknown as DSASession[];
        penaltiesData = (dbPenalties || []) as unknown as Penalty[];
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
      
      // Calculate completion levels for Rishit on this day
      const rishitId = '22222222-2222-2222-2222-222222222222';
      const dayTasks = allTasks.filter(t => t.date === dateStr && (t.assign_to === 'both' || t.assign_to === 'rishit'));
      const dayComps = allCompletions.filter(c => {
        const taskObj = allTasks.find(t => t.id === c.task_id);
        return taskObj?.date === dateStr && c.user_id === rishitId && c.completed;
      });

      // Filter sessions and penalties
      const daySessions = allSessions.filter(s => s.date === dateStr && s.user_id === rishitId);
      const dayPenalties = allPenalties.filter(p => p.date_incurred === dateStr && p.user_id === rishitId);

      // Color coding logic:
      // Green = fully completed (all assigned task targets met by everyone)
      // Yellow = partially completed (some tasks completed)
      // Red = failed day (0 tasks completed, but tasks existed)
      
      let status: 'empty' | 'green' | 'yellow' | 'red' = 'empty';
      
      if (dayTasks.length > 0) {
        const totalAssignedChecks = dayTasks.length;
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

  const handleCellClick = (cell: {
    dateStr: string;
    tasks: Task[];
    completions: TaskCompletion[];
    sessions: DSASession[];
    penalties: Penalty[];
  } | null) => {
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
      <div className="flex-grow flex flex-col items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-2 border-t-neon-blue border-white/5 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-transparent px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-6 relative z-10 text-black">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-black">
            COMPLETION CALENDAR LOG
          </h1>
          <p className="text-xs font-bold text-black/60 uppercase tracking-widest mt-0.5">
            Visualize color-coded accountability status and daily recaps
          </p>
        </div>

        {/* Month selector UI */}
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000] text-black">
          <button onClick={handlePrevMonth} className="text-black/60 hover:text-black transition-all font-black">
            <ChevronLeft size={16} />
          </button>
          <span className="font-orbitron font-bold text-xs uppercase tracking-wider text-black select-none min-w-[120px] text-center">
            {monthNames[currentMonth].toUpperCase()} {currentYear}
          </span>
          <button onClick={handleNextMonth} className="text-black/60 hover:text-black transition-all font-black">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend Indicator Banners */}
      <div className="flex flex-wrap gap-4 items-center justify-center text-[10px] font-bold text-black/60 tracking-wider uppercase border-2 border-black bg-white px-4 py-2.5 rounded-xl shadow-[3px_3px_0px_#000000]">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-neo-green border border-black shadow-[1px_1px_0px_#000000]" />
          <span>Fully Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-neo-yellow border border-black shadow-[1px_1px_0px_#000000]" />
          <span>Partially Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-neo-peach border border-black shadow-[1px_1px_0px_#000000]" />
          <span>Failed Targets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-white border border-black/30" />
          <span>No Schedule Set</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-neo-gray border border-black" />
          <span>Sundays (Rest)</span>
        </div>
      </div>

      {/* Grid Layout of Calendar */}
      <section className="bg-white border-[3px] border-black rounded-2xl p-4 md:p-6 glass-panel flex flex-col gap-4 shadow-[4px_4px_0px_#000000]">
        {/* Days of week labels */}
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold font-orbitron tracking-widest text-black/60 select-none pb-2 border-b-2 border-black/10">
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
            let cellBg = 'bg-white border-2 border-black/20 hover:border-black text-black';
            if (cell.status === 'green') {
              cellBg = 'bg-neo-green border-2 border-black text-black font-extrabold hover:bg-neo-green/80';
            } else if (cell.status === 'yellow') {
              cellBg = 'bg-neo-yellow border-2 border-black text-black font-extrabold hover:bg-neo-yellow/80';
            } else if (cell.status === 'red') {
              cellBg = 'bg-neo-peach border-2 border-black text-black font-extrabold hover:bg-neo-peach/80';
            } else if (isSunday) {
              cellBg = 'bg-neo-gray border-2 border-black text-black/50 hover:bg-neo-gray/80';
            }

            return (
              <button
                key={`day-${cell.dayNumber}`}
                onClick={() => handleCellClick(cell)}
                className={`aspect-square rounded-xl border flex flex-col p-2 items-start justify-between transition-all relative select-none shadow-[2px_2px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${cellBg} ${
                  isToday ? 'ring-2 ring-black ring-offset-2 scale-[1.03] border-black font-extrabold' : ''
                }`}
              >
                {/* Day Number */}
                <span className="font-orbitron font-black text-xs md:text-sm">{cell.dayNumber}</span>
                
                {/* Tweak status badge for dots */}
                <div className="flex gap-1 flex-wrap mt-auto">
                  {cell.sessions.length > 0 && (
                    <div className="w-2 h-2 rounded-full bg-neo-blue border border-black" title="DSA study logged" />
                  )}
                  {cell.penalties.length > 0 && (
                    <div className="w-2 h-2 rounded-full bg-red-600 border border-black" title="Penalties issued" />
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border-[3px] border-black rounded-2xl p-6 shadow-2xl relative overflow-hidden text-black"
            >
              <button
                onClick={() => setSelectedDayLog(null)}
                className="absolute right-4 top-4 text-black/40 hover:text-black font-extrabold"
              >
                <X size={16} />
              </button>

              <h2 className="font-orbitron font-black text-base tracking-wider text-black mb-4 border-b-2 border-black pb-2 uppercase">
                RECAP REPORT: {selectedDayLog.dateStr}
              </h2>

              <div className="flex flex-col gap-5 max-h-[450px] overflow-y-auto pr-1 scrollbar-hide">
                
                {/* 1. Daily Objectives */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-black/60 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare size={13} />
                    Daily Objectives ({selectedDayLog.tasks.length})
                  </h4>
                  
                  {selectedDayLog.tasks.length === 0 ? (
                    <div className="text-[11px] text-black/50 font-bold italic">No objectives scheduled.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {selectedDayLog.tasks.map((task) => {
                        const rishitComp = selectedDayLog.completions.find(c => c.task_id === task.id && c.user_id === '22222222-2222-2222-2222-222222222222')?.completed;

                        return (
                          <div key={task.id} className="bg-neo-gray border-2 border-black px-3 py-2 rounded-xl flex items-center justify-between text-xs font-bold shadow-[1px_1px_0px_#000000]">
                            <span className="text-black">{task.title}</span>
                            <span className={rishitComp ? 'text-neo-blue font-extrabold' : 'text-black/30'}>
                              {rishitComp ? 'COMPLETED' : 'MISSED'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. DSA Journal Logs */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-black/60 uppercase tracking-widest flex items-center gap-1.5">
                    <Award size={13} />
                    DSA Journal Logs ({selectedDayLog.sessions.length})
                  </h4>

                  {selectedDayLog.sessions.length === 0 ? (
                    <div className="text-[11px] text-black/50 font-bold italic">No DSA sessions logged.</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedDayLog.sessions.map((sess) => {
                        return (
                          <div key={sess.id} className="border-2 border-black p-3 rounded-xl bg-white shadow-[2px_2px_0px_#000000]">
                            <div className="flex justify-between items-center text-xs font-bold font-orbitron mb-1.5 border-b border-black/10 pb-1">
                              <span className="text-black">
                                {sess.topic}
                              </span>
                              <span className="text-[10px] text-black/50">{sess.time_spent} mins study</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {sess.leetcode_questions.map((q, idx) => (
                                <span key={idx} className="text-[9px] text-black bg-neo-purple px-1.5 py-0.5 rounded border border-black/40 font-bold shadow-[1px_1px_0px_#000000]">
                                  {q}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] text-black/70 leading-relaxed italic">&quot;{sess.notes}&quot;</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Penalties Issued */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-[10px] font-black text-black/60 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert size={13} />
                    Penalties Issued ({selectedDayLog.penalties.length})
                  </h4>

                  {selectedDayLog.penalties.length === 0 ? (
                    <div className="text-[11px] text-black/50 font-bold italic">No penalties issued.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {selectedDayLog.penalties.map((pen) => {
                        return (
                          <div key={pen.id} className="bg-rose-100 border-2 border-black px-3 py-2.5 rounded-xl flex flex-col gap-1 text-xs shadow-[2px_2px_0px_#000000]">
                            <div className="flex justify-between font-bold border-b border-black/10 pb-1">
                              <span className="text-red-700">PENALTY</span>
                              <span className="text-[9px] font-mono text-black/55">{pen.status.toUpperCase()}</span>
                            </div>
                            <p className="text-black font-bold">{pen.description}</p>
                            <p className="text-[10px] text-black/60 font-bold">Fine: {pen.penalty_value}</p>
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
