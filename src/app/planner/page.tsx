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
    bg: 'bg-neo-blue', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'Aptitude': { 
    bg: 'bg-neo-purple', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'CS Fundamentals': { 
    bg: 'bg-neo-green', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'Projects': { 
    bg: 'bg-neo-yellow', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'Gym': { 
    bg: 'bg-neo-peach', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'Personal': { 
    bg: 'bg-white', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'Food': { 
    bg: 'bg-neo-gray', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
  },
  'Break': { 
    bg: 'bg-[#f0f0f0]', 
    text: 'text-black font-extrabold', 
    border: 'border-2 border-black',
    glow: 'shadow-[1.5px_1.5px_0px_#000000]'
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
  const [, hours, minutes, ampm] = match;
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
          colors: ['#7ccd95', '#fdf2a9', '#badbeb', '#c7ceea', '#000000']
        });
      }

      await dbService.toggleTaskCompletion(taskId, targetUserId, !currentStatus);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Compile calculations for today's planner progress
  const getDailyProgress = (userObj: typeof activeUser) => {
    if (!userObj) return { completed: 0, total: 0, pct: 0 };
    const userTasks = tasks.filter(t => t.assign_to === 'rishit' || t.assign_to === 'both');
    const userComps = completions.filter(c => c.user_id === userObj.id && c.completed && tasks.some(t => t.id === c.task_id));
    const completed = userComps.length;
    const total = userTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, pct };
  };

  const rishitProfile = profiles.find(p => p.username === 'rishit');
  const rishitProg = getDailyProgress(rishitProfile || null);

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-black border-t-neo-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-transparent px-4 py-8 max-w-4xl mx-auto w-full flex flex-col gap-6 relative z-10 text-black">
      
      {/* Dynamic Warning Notification */}
      <AnimatePresence>
        {warningMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-black bg-rose-200 text-black text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0px_#000000]"
          >
            <AlertTriangle size={15} />
            <span>{warningMsg}</span>
            <button onClick={() => setWarningMsg(null)} className="ml-2 hover:text-black font-extrabold">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-black">
            DAILY PLANNER PROTOCOL
          </h1>
          <p className="text-xs font-bold text-black/60 uppercase tracking-widest mt-0.5">
            {new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-black bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-neo-green transition-all shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Progress gauges */}
      <section className="w-full">
        {/* Rishit Prog */}
        <div className="bg-white border-[3px] border-black p-4 rounded-xl flex flex-col gap-2 shadow-[4px_4px_0px_#000000]">
          <div className="flex justify-between items-center text-xs font-bold font-orbitron text-black">
            <span>RISHIT&apos;S DAILY COMPLETION</span>
            <span>{rishitProg.completed}/{rishitProg.total} ({rishitProg.pct}%)</span>
          </div>
          <div className="w-full bg-neo-gray border-2 border-black h-3 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full bg-black transition-all duration-700" 
              style={{ width: `${rishitProg.pct}%` }} 
            />
          </div>
        </div>
      </section>

      {/* Daily schedule timeline layout */}
      <section className="flex flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="bg-white border-[3px] border-black rounded-2xl py-12 text-center text-xs text-black/60 font-bold tracking-wider shadow-[4px_4px_0px_#000000]">
            NO OBJECTIVES PLANNED FOR TODAY. PROTOCOL OFFLINE.
          </div>
        ) : (
          tasks.map((task) => {
            const catStyle = CATEGORY_STYLES[task.category] || CATEGORY_STYLES['Personal'];
            
            // Check completions
            const isRishitDone = completions.find(c => c.task_id === task.id && c.user_id === rishitProfile?.id)?.completed || false;
            const isAssignedToRishit = task.assign_to === 'both' || task.assign_to === 'rishit';

            if (!isAssignedToRishit) return null;

            return (
              <div 
                key={task.id}
                className="bg-white border-[3px] border-black rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:translate-y-[-1px] transition-all group shadow-[3px_3px_0px_#000000]"
              >
                {/* Time & Title info */}
                <div className="flex items-start gap-4">
                  {/* Time label */}
                  <div className="flex flex-col text-left font-mono min-w-[75px]">
                    <span className="text-xs font-bold text-black">{task.start_time}</span>
                    <span className="text-[9px] font-bold text-black/50">{task.end_time}</span>
                  </div>

                  {/* Title & Category Badge */}
                  <div className="flex flex-col gap-1.5">
                    <span className={`text-sm font-bold tracking-wide text-black ${isRishitDone ? 'line-through text-black/35 font-normal' : ''}`}>
                      {task.title}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border-2 border-black w-fit font-mono tracking-wider shadow-[1px_1px_0px_#000000] ${catStyle.bg} ${catStyle.text}`}>
                      {task.category.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Checkboxes & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-black/10">
                  {/* Completion columns */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1 select-none">
                      <span className="text-[8px] font-bold font-orbitron text-black/50 tracking-widest">STATUS</span>
                      <input
                        type="checkbox"
                        checked={isRishitDone}
                        onChange={() => handleToggleCompletion(task.id, rishitProfile?.id || '')}
                        className="w-5 h-5 rounded border-2 border-black bg-white text-black focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Edit & Delete actions */}
                  <div className="flex items-center gap-2 sm:opacity-30 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(task)}
                      className="p-1.5 rounded-md border-2 border-black bg-white text-black hover:bg-neo-blue shadow-[1px_1px_0px_#000000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                      title="Edit objective"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 rounded-md border-2 border-black bg-white text-black hover:bg-rose-200 shadow-[1px_1px_0px_#000000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                      title="Delete objective"
                    >
                      <Trash2 size={12} />
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border-[3px] border-black rounded-2xl p-6 shadow-2xl relative overflow-hidden text-black"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-black/40 hover:text-black font-extrabold"
              >
                <X size={16} />
              </button>

              <h2 className="font-orbitron font-black text-base tracking-wider text-black mb-4 uppercase border-b-2 border-black pb-2">
                {editingTask ? 'EDIT OBJECTIVE PROTOCOL' : 'NEW OBJECTIVE LOG'}
              </h2>

              <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Objective Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. DSA - Sliding Window"
                    className="bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:bg-neo-yellow shadow-[1px_1px_0px_#000000]"
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Start Time</label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:bg-neo-blue shadow-[1px_1px_0px_#000000] font-mono"
                    >
                      {TIMELINE_HOURS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">End Time</label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:bg-neo-blue shadow-[1px_1px_0px_#000000] font-mono"
                    >
                      {TIMELINE_HOURS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TaskCategory)}
                    className="bg-white border-2 border-black rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:bg-neo-blue shadow-[1px_1px_0px_#000000]"
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

                {/* Submit button */}
                <button
                  type="submit"
                  className="mt-2 w-full py-2.5 rounded-xl border-2 border-black bg-neo-green text-black font-bold font-orbitron text-xs uppercase tracking-widest hover:bg-neo-green/80 shadow-[3px_3px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all select-none cursor-pointer"
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
