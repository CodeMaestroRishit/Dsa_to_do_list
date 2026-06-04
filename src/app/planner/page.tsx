'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { Task, TaskCategory, TaskCompletion } from '@/lib/types';
import { Plus, Trash2, Edit2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Category color mappings
const CATEGORY_STYLES: Record<TaskCategory, { bg: string, text: string, border: string, glow: string }> = {
  'DSA': { 
    bg: 'bg-rose-500/10', 
    text: 'text-rose-400', 
    border: 'border-rose-500/20',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.2)]'
  },
  'Aptitude': { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-400', 
    border: 'border-amber-500/20',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.2)]'
  },
  'CS Fundamentals': { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-400', 
    border: 'border-emerald-500/20',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.2)]'
  },
  'Projects': { 
    bg: 'bg-indigo-500/10', 
    text: 'text-indigo-400', 
    border: 'border-indigo-500/20',
    glow: 'shadow-[0_0_8px_rgba(99,102,241,0.2)]'
  },
  'Gym': { 
    bg: 'bg-purple-500/10', 
    text: 'text-purple-400', 
    border: 'border-purple-500/20',
    glow: 'shadow-[0_0_8px_rgba(168,85,247,0.2)]'
  },
  'Personal': { 
    bg: 'bg-sky-500/10', 
    text: 'text-sky-400', 
    border: 'border-sky-500/20',
    glow: 'shadow-[0_0_8px_rgba(14,165,233,0.2)]'
  },
  'Food': { 
    bg: 'bg-orange-500/10', 
    text: 'text-orange-400', 
    border: 'border-orange-500/20',
    glow: 'shadow-[0_0_8px_rgba(249,115,22,0.2)]'
  },
  'Break': { 
    bg: 'bg-zinc-500/10', 
    text: 'text-zinc-400', 
    border: 'border-zinc-500/20',
    glow: 'shadow-[0_0_8px_rgba(113,113,122,0.2)]'
  }
};

const TIMELINE_HOURS = [
  '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
  '12:00 AM'
];

// Convert "10:30 AM" or "1:00 PM" into minutes from midnight for sorting
const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  const [_, hours, minutes, ampm] = match;
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

export default function PlannerPage() {
  const { activeUser, refreshKey, triggerRefresh, profiles } = useSession();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('11:00 AM');
  const [category, setCategory] = useState<TaskCategory>('DSA');
  const [assignTo, setAssignTo] = useState<'both' | 'rohit' | 'rishit'>('both');
  
  // Custom warnings
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPlannerData();
  }, [refreshKey]);

  const fetchPlannerData = async () => {
    try {
      const todayStr = getLocalDateString();
      const [fetchedTasks, fetchedComps] = await Promise.all([
        dbService.getTasks(todayStr),
        dbService.getTaskCompletions(todayStr),
      ]);

      // Sort tasks chronologically by start time
      const sortedTasks = [...fetchedTasks].sort((a, b) => {
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      });

      setTasks(sortedTasks);
      setCompletions(fetchedComps);
    } catch (err) {
      console.error('Failed to load planner:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setStartTime('10:30 AM');
    setEndTime('11:30 AM');
    setCategory('DSA');
    setAssignTo('both');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setStartTime(task.start_time);
    setEndTime(task.end_time);
    setCategory(task.category);
    setAssignTo(task.assign_to);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeUser) return;

    try {
      const todayStr = getLocalDateString();
      const taskData = {
        title: title.trim(),
        start_time: startTime,
        end_time: endTime,
        category,
        assign_to: assignTo,
        date: todayStr,
        created_by: activeUser.id,
      };

      if (editingTask) {
        await dbService.updateTask(editingTask.id, taskData);
      } else {
        await dbService.createTask(taskData);
      }
      
      setIsModalOpen(false);
      triggerRefresh();
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await dbService.deleteTask(id);
      triggerRefresh();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleToggleCompletion = async (taskId: string, targetUserId: string) => {
    if (!activeUser) return;
    
    // To maintain accountability, we warning/prevent users from checking boxes for each other!
    if (activeUser.id !== targetUserId) {
      const targetProfile = profiles.find(p => p.id === targetUserId);
      setWarningMsg(
        `Warning: You are active as ${activeUser.display_name.toUpperCase()}. Switch session to check tasks for ${targetProfile?.display_name.toUpperCase()}!`
      );
      setTimeout(() => setWarningMsg(null), 5000);
      return;
    }

    const currentStatus = completions.find(c => c.task_id === taskId && c.user_id === targetUserId)?.completed || false;
    
    try {
      // Import confetti dynamically on successful check for visual wow effect!
      if (!currentStatus) {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: activeUser.username === 'rohit' ? ['#dffe00', '#ffffff'] : ['#00f0ff', '#ffffff']
        });
      }

      await dbService.toggleTaskCompletion(taskId, targetUserId, !currentStatus);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Compile calculations for today's side-by-side planner progress
  const getDailyProgress = (userObj: typeof activeUser) => {
    if (!userObj) return { completed: 0, total: 0, pct: 0 };
    const userTasks = tasks.filter(t => t.assign_to === 'both' || t.assign_to === userObj.username);
    const userComps = completions.filter(c => c.user_id === userObj.id && c.completed && tasks.some(t => t.id === c.task_id));
    const completed = userComps.length;
    const total = userTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  };

  const rohitProfile = profiles.find(p => p.username === 'rohit');
  const rishitProfile = profiles.find(p => p.username === 'rishit');
  
  const rohitProg = getDailyProgress(rohitProfile || null);
  const rishitProg = getDailyProgress(rishitProfile || null);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-t-neon-yellow border-white/5 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-black px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-6 relative">
      
      {/* Dynamic Warning Notification */}
      <AnimatePresence>
        {warningMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border border-neon-red/35 bg-black/90 backdrop-blur text-neon-red text-xs font-bold uppercase tracking-wide shadow-[0_0_15px_rgba(255,59,48,0.25)]"
          >
            <AlertTriangle size={15} />
            <span>{warningMsg}</span>
            <button onClick={() => setWarningMsg(null)} className="ml-2 hover:text-white">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white">
            DAILY PLANNER PROTOCOL
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">
            {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-white/90 transition-all select-none"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Side-by-side comparative progress gauges */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Rohit Prog */}
        <div className="bg-[#050505] border border-neon-yellow/10 p-4 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold font-orbitron">
            <span className="text-neon-yellow text-glow-yellow">ROHIT'S DAILY COMPLETION</span>
            <span>{rohitProg.completed}/{rohitProg.total} ({rohitProg.pct}%)</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-neon-yellow shadow-[0_0_6px_#dffe00] transition-all duration-700" 
              style={{ width: `${rohitProg.pct}%` }} 
            />
          </div>
        </div>
        {/* Rishit Prog */}
        <div className="bg-[#050505] border border-neon-blue/10 p-4 rounded-xl flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-bold font-orbitron">
            <span className="text-neon-blue text-glow-blue">RISHIT'S DAILY COMPLETION</span>
            <span>{rishitProg.completed}/{rishitProg.total} ({rishitProg.pct}%)</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full rounded-full bg-neon-blue shadow-[0_0_6px_#00f0ff] transition-all duration-700" 
              style={{ width: `${rishitProg.pct}%` }} 
            />
          </div>
        </div>
      </section>

      {/* Daily schedule timeline layout */}
      <section className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-2xl py-12 text-center text-xs text-white/30 font-semibold tracking-wider">
            NO OBJECTIVES PLANNED FOR TODAY. PROTOCOL OFFLINE.
          </div>
        ) : (
          tasks.map((task) => {
            const catStyle = CATEGORY_STYLES[task.category] || CATEGORY_STYLES['Personal'];
            
            // Check completions
            const isRohitDone = completions.find(c => c.task_id === task.id && c.user_id === rohitProfile?.id)?.completed || false;
            const isRishitDone = completions.find(c => c.task_id === task.id && c.user_id === rishitProfile?.id)?.completed || false;

            const isAssignedToRohit = task.assign_to === 'both' || task.assign_to === 'rohit';
            const isAssignedToRishit = task.assign_to === 'both' || task.assign_to === 'rishit';

            return (
              <div 
                key={task.id}
                className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:bg-white/10 transition-all group"
              >
                {/* Time & Title info */}
                <div className="flex items-start gap-4">
                  {/* Time label */}
                  <div className="flex flex-col text-left font-mono min-w-[70px]">
                    <span className="text-xs font-bold text-white/80">{task.start_time}</span>
                    <span className="text-[9px] font-semibold text-white/30">{task.end_time}</span>
                  </div>

                  {/* Title & Category Badge */}
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-sm font-semibold tracking-wide text-white/90 ${(task.assign_to === 'both' && isRohitDone && isRishitDone) || (task.assign_to === 'rohit' && isRohitDone) || (task.assign_to === 'rishit' && isRishitDone) ? 'line-through text-white/30' : ''}`}>
                      {task.title}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border w-fit font-mono tracking-wider ${catStyle.bg} ${catStyle.text} ${catStyle.border} ${catStyle.glow}`}>
                      {task.category.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Checkboxes & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                  {/* Completion columns */}
                  <div className="flex items-center gap-4">
                    {/* Rohit col */}
                    {isAssignedToRohit && (
                      <div className="flex flex-col items-center gap-1 select-none">
                        <span className="text-[8px] font-bold font-orbitron text-white/30 tracking-widest">ROHIT</span>
                        <input
                          type="checkbox"
                          checked={isRohitDone}
                          onChange={() => handleToggleCompletion(task.id, rohitProfile?.id || '')}
                          className="w-5 h-5 rounded border-white/10 bg-black text-black focus:ring-0 focus:ring-offset-0 cursor-pointer glow-checkbox-rohit"
                        />
                      </div>
                    )}

                    {/* Rishit col */}
                    {isAssignedToRishit && (
                      <div className="flex flex-col items-center gap-1 select-none">
                        <span className="text-[8px] font-bold font-orbitron text-white/30 tracking-widest">RISHIT</span>
                        <input
                          type="checkbox"
                          checked={isRishitDone}
                          onChange={() => handleToggleCompletion(task.id, rishitProfile?.id || '')}
                          className="w-5 h-5 rounded border-white/10 bg-black text-black focus:ring-0 focus:ring-offset-0 cursor-pointer glow-checkbox-rishit"
                        />
                      </div>
                    )}
                  </div>

                  {/* Edit & Delete actions */}
                  <div className="flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(task)}
                      className="p-1.5 rounded hover:bg-white/5 hover:text-neon-blue transition-all"
                      title="Edit objective"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded hover:bg-white/5 hover:text-neon-red transition-all"
                      title="Delete objective"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </section>

      {/* Custom Add/Edit Task Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>

              <h2 className="font-orbitron font-black text-base tracking-wider text-white mb-4">
                {editingTask ? 'EDIT OBJECTIVE PROTOCOL' : 'NEW OBJECTIVE LOG'}
              </h2>

              <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Objective Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. DSA - Sliding Window"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Start Time</label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-mono bg-[#0d0d0d]"
                    >
                      {TIMELINE_HOURS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">End Time</label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-mono bg-[#0d0d0d]"
                    >
                      {TIMELINE_HOURS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category & Assignment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as TaskCategory)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 bg-[#0d0d0d]"
                    >
                      <option value="DSA">DSA</option>
                      <option value="Aptitude">Aptitude</option>
                      <option value="CS Fundamentals">CS Fundamentals</option>
                      <option value="Projects">Projects</option>
                      <option value="Gym">Gym</option>
                      <option value="Personal">Personal</option>
                      <option value="Food">Food</option>
                      <option value="Break">Break</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Assign To</label>
                    <select
                      value={assignTo}
                      onChange={(e) => setAssignTo(e.target.value as 'both' | 'rohit' | 'rishit')}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 bg-[#0d0d0d]"
                    >
                      <option value="both">Both</option>
                      <option value="rohit">Rohit Only</option>
                      <option value="rishit">Rishit Only</option>
                    </select>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="mt-2 w-full py-2.5 rounded-lg bg-white text-black font-bold font-orbitron text-xs uppercase tracking-widest hover:bg-white/90 transition-all select-none"
                >
                  SAVE OBJECTIVE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
