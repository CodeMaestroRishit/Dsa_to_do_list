'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { UserStats, Activity, Task, TaskCompletion, DSASession, Goal, WellnessLog } from '@/lib/types';
import { UserCard } from '@/components/UserCard';
import { LiveFeed } from '@/components/LiveFeed';
import { ContributionGraph } from '@/components/ContributionGraph';
import { LeetcodeStats } from '@/components/LeetcodeStats';
import { GithubHeatmap } from '@/components/GithubHeatmap';
import { ShieldAlert, Play, CheckCircle, Target, Activity as WellnessIcon, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const MOTIVATIONAL_QUOTES = [
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Consistent daily effort compounds into massive lifetime success.", author: "Grind Philosophy" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Clean code always looks like it was written by someone who cares.", author: "Michael Feathers" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
  { text: "Your wellness is the foundation of your productivity. Protect it.", author: "Wellness Protocol" },
  { text: "Consistency beats intensity. Grind every day.", author: "System Rule" },
  { text: "Before software can be reusable it first has to be usable.", author: "Ralph Johnson" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Focus is a muscle, and you build it by avoiding distraction.", author: "Focus Rule" },
  { text: "Systems stand where intentions fall. Build your grind system.", author: "Grind Protocol" },
  { text: "DSA is not about memorization; it's about training your mind to solve complexity.", author: "Algorithmic Mindset" },
  { text: "Sleep is not a luxury; it is the clean compilation phase of your brain.", author: "Bio-Grind Rule" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent Van Gogh" },
  { text: "An hour of focus is worth ten hours of distraction.", author: "Focus Rule" },
  { text: "Your only limit is the one you set yourself.", author: "Mindset Rule" },
  { text: "Every day is another opportunity to refine your code and your life.", author: "Refactor Rule" }
];

export default function DashboardPage() {
  const { refreshKey } = useSession();
  const rishitId = '22222222-2222-2222-2222-222222222222'; // Rishit's profile ID
  
  const [rishitStats, setRishitStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);

  // Heatmap datasets
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allCompletions, setAllCompletions] = useState<TaskCompletion[]>([]);
  const [allSessions, setAllSessions] = useState<DSASession[]>([]);

  const dailyQuote = useMemo(() => {
    const day = new Date().getDate();
    return MOTIVATIONAL_QUOTES[day % MOTIVATIONAL_QUOTES.length];
  }, []);

  useEffect(() => {
    const checkPenaltiesAndLoad = async () => {
      try {
        // Run the auto penalty checker on page load
        await dbService.checkAndGeneratePenalties();
      } catch (err) {
        console.error('Error running penalty check:', err);
      } finally {
        await fetchStats();
      }
    };

    checkPenaltiesAndLoad();
  }, [refreshKey]);

  const fetchStats = async () => {
    try {
      const [
        fetchedData,
        fetchedActivities,
        fetchedGoals,
        fetchedWellnessLogs,
        tasksData,
        completionsData,
        sessionsData
      ] = await Promise.all([
        dbService.getUserStats(rishitId, getLocalDateString()),
        dbService.getActivities(20),
        dbService.getGoals(rishitId),
        dbService.getWellnessLogs(rishitId),
        dbService.getTasks(),
        dbService.getTaskCompletions(),
        dbService.getDSASessions(rishitId)
      ]);

      setRishitStats(fetchedData);
      setActivities(fetchedActivities.filter(a => a.user_id === rishitId).slice(0, 8));
      setGoals(fetchedGoals);
      setWellnessLogs(fetchedWellnessLogs);
      setAllTasks(tasksData);
      setAllCompletions(completionsData);
      setAllSessions(sessionsData);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    }
  };

  // Compute stats for Github Heatmap aggregation
  const heatmapLocalData = useMemo(() => {
    const tasksCompleted: Record<string, number> = {};
    const questionsSolved: Record<string, number> = {};

    allTasks.forEach(task => {
      if (task.assign_to === 'rishit' || task.assign_to === 'both') {
        const comp = allCompletions.find(c => c.task_id === task.id && c.user_id === rishitId);
        if (comp?.completed) {
          tasksCompleted[task.date] = (tasksCompleted[task.date] || 0) + 1;
        }
      }
    });

    allSessions.forEach(sess => {
      questionsSolved[sess.date] = (questionsSolved[sess.date] || 0) + sess.questions_count;
    });

    return { tasksCompleted, questionsSolved };
  }, [allTasks, allCompletions, allSessions]);

  // Aggregate local LeetCode stats for LeetcodeStats widget
  const leetcodeLocalStats = useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    allSessions.forEach(sess => {
      easy += sess.difficulty_easy;
      medium += sess.difficulty_medium;
      hard += sess.difficulty_hard;
    });

    // Add profile offset values
    if (rishitStats) {
      easy += rishitStats.progress.leetcode_easy_offset;
      medium += rishitStats.progress.leetcode_medium_offset;
      hard += rishitStats.progress.leetcode_hard_offset;
    }

    return { easy, medium, hard, total: easy + medium + hard };
  }, [allSessions, rishitStats]);

  // Summary targets
  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status !== 'completed').slice(0, 3);
  }, [goals]);

  // Today's wellness log
  const todayWellnessLog = useMemo(() => {
    const todayStr = getLocalDateString();
    return wellnessLogs.find(l => l.date === todayStr);
  }, [wellnessLogs]);

  return (
    <div className="flex-grow bg-transparent px-4 py-6 md:py-10 max-w-7xl mx-auto w-full flex flex-col gap-6 relative z-10 text-black">
      
      {/* Top Banner and Greeting */}
      <section className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-black pb-4 gap-2">
        <div>
          <h2 className="font-orbitron font-black text-xl md:text-2xl tracking-widest text-black uppercase">
            RISHIT&apos;S COMMAND DECK
          </h2>
          <p className="text-[9px] font-bold text-black/60 uppercase tracking-widest mt-0.5">
            Personal Grind Engine · Goals Status: {goals.filter(g => g.status === 'completed').length} / {goals.length} Resolved
          </p>
        </div>
      </section>

      {/* Daily Motivation Quote */}
      <div className="relative overflow-hidden bg-neo-yellow border-[3px] border-black p-4 rounded-2xl flex items-center gap-3.5 shadow-[4px_4px_0px_#000000] text-black">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-serif text-xl font-bold select-none">
          “
        </div>
        <div>
          <p className="text-xs font-bold italic tracking-wide text-black leading-relaxed">
            {dailyQuote.text}
          </p>
          <p className="text-[9px] font-bold text-black/50 uppercase tracking-widest mt-0.5">
            — {dailyQuote.author}
          </p>
        </div>
      </div>

      {/* Grid containing User Profile and LeetCode Stats side by side */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 w-full">
          {rishitStats && <UserCard stats={rishitStats} />}
        </div>
        <div className="lg:col-span-1 w-full">
          <LeetcodeStats userId={rishitId} localStats={leetcodeLocalStats} />
        </div>
      </section>

      {/* Grid of Heatmaps & Widget Sidebars */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full items-start">
        
        {/* Left column: Heatmaps (Span 2) */}
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          {/* GitHub heatmap */}
          <GithubHeatmap userId={rishitId} localData={heatmapLocalData} />

          {/* Local App Activity Heatmap */}
          {rishitStats && (
            <ContributionGraph
              userId={rishitStats.profile.id}
              username="rishit"
              tasks={allTasks}
              completions={allCompletions}
              sessions={allSessions}
            />
          )}
        </div>

        {/* Right column: Wellness, Goals & Live Feed */}
        <div className="xl:col-span-1 w-full flex flex-col gap-6">
          
          {/* Wellness Summary Widget */}
          <div className="bg-white border-[3px] border-black p-4 rounded-2xl glass-card flex flex-col gap-3 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <WellnessIcon size={13} className="text-black" />
                Wellness status
              </h4>
              <Link href="/wellness" className="text-[10px] font-mono text-black font-bold hover:underline flex items-center">
                Wellness Log <ArrowUpRight size={10} className="ml-0.5" />
              </Link>
            </div>
            
            {todayWellnessLog ? (
              <div className="flex flex-col gap-2 text-xs">
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-neo-blue p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000] text-center">
                    <span className="text-[8px] font-bold text-black/60 uppercase tracking-widest block">Sleep Logged</span>
                    <span className="text-sm font-black font-orbitron text-black mt-0.5 block">{todayWellnessLog.sleep_hours} hrs</span>
                  </div>
                  <div className="bg-neo-yellow p-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000000] text-center">
                    <span className="text-[8px] font-bold text-black/60 uppercase tracking-widest block">Productivity Rating</span>
                    <span className="text-sm font-black font-orbitron text-black mt-0.5 block">{todayWellnessLog.productivity_score}/10</span>
                  </div>
                </div>
                {todayWellnessLog.distractions.length > 0 && (
                  <p className="text-[10px] text-black bg-rose-200 border-2 border-black p-2.5 rounded-xl mt-1 shadow-[2px_2px_0px_#000000] font-semibold uppercase">
                    Logged Leaks: {todayWellnessLog.distractions.join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-xs font-semibold text-black/60 tracking-wide flex flex-col gap-2.5 items-center">
                <span>No wellness data logged for today yet.</span>
                <Link
                  href="/wellness"
                  className="px-3 py-1.5 rounded-full border-2 border-black bg-black text-white hover:bg-white hover:text-black font-bold font-orbitron text-[10px] uppercase tracking-wide hover:translate-y-[-1px] transition-all shadow-[2px_2px_0px_#000000]"
                >
                  Log Today&apos;s Day
                </Link>
              </div>
            )}
          </div>

          {/* Current Goals Widget */}
          <div className="bg-white border-[3px] border-black p-4 rounded-2xl glass-card flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-black/10 pb-2">
              <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-black flex items-center gap-1.5">
                <Target size={13} className="text-black" />
                Active Grind Goals
              </h4>
              <Link href="/wellness" className="text-[10px] font-mono text-black font-bold hover:underline flex items-center">
                Manage Goals <ArrowUpRight size={10} className="ml-0.5" />
              </Link>
            </div>

            {activeGoals.length === 0 ? (
              <div className="text-center py-4 text-xs font-semibold text-black/60 tracking-wide">
                No active goals. Log your next target!
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {activeGoals.map(goal => {
                  const getGoalColor = (cat: string) => {
                    switch (cat) {
                      case 'DSA': return 'bg-neo-blue';
                      case 'Wellness': return 'bg-neo-peach';
                      case 'Career': return 'bg-neo-yellow';
                      default: return 'bg-neo-purple';
                    }
                  };
                  return (
                    <div key={goal.id} className={`${getGoalColor(goal.category)} p-2.5 rounded-xl border-2 border-black flex flex-col gap-1 shadow-[2px_2px_0px_#000000]`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-black uppercase">{goal.category}</span>
                        <span className="text-[8px] font-mono font-bold text-black/60">{goal.target_date || 'No deadline'}</span>
                      </div>
                      <span className="text-xs font-bold text-black leading-snug">{goal.title}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Realtime Event Log */}
          <LiveFeed activities={activities} />

          {/* Quick Actions Panel */}
          <div className="bg-white border-[3px] border-black p-4 rounded-2xl glass-card flex flex-col gap-3">
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-black border-b border-black/10 pb-2">
              DECK CONTROL
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Link 
                href="/planner"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full border-2 border-black bg-white hover:bg-black/5 text-black text-xs font-bold tracking-wide shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] transition-all"
              >
                <CheckCircle size={13} className="text-black" />
                <span>Go to Planner</span>
              </Link>
              <Link 
                href="/journal"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full border-2 border-black bg-white hover:bg-black/5 text-black text-xs font-bold tracking-wide shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] transition-all"
              >
                <Play size={13} className="text-black" />
                <span>DSA Journal</span>
              </Link>
            </div>
            <Link
              href="/penalties"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-full border-2 border-black bg-rose-200 hover:bg-rose-300 text-black text-xs font-black tracking-wide uppercase hover:translate-y-[-1px] transition-all shadow-[2px_2px_0px_#000000]"
            >
              <ShieldAlert size={14} className="text-black" />
              <span>WALL OF SHAME (ACTIVE PENALTIES)</span>
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
