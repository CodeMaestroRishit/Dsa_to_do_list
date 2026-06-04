'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { UserStats, Activity, Task, TaskCompletion, DSASession } from '@/lib/types';
import { UserCard } from '@/components/UserCard';
import { LiveFeed } from '@/components/LiveFeed';
import { ContributionGraph } from '@/components/ContributionGraph';
import { ShieldAlert, Award, Play, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { refreshKey, triggerRefresh, activeUser } = useSession();
  
  const [rohitStats, setRohitStats] = useState<UserStats | null>(null);
  const [rishitStats, setRishitStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Heatmap datasets
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allCompletions, setAllCompletions] = useState<TaskCompletion[]>([]);
  const [allSessions, setAllSessions] = useState<DSASession[]>([]);

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
      const todayStr = getLocalDateString();
      
      // Profiles IDs (hardcoded or dynamically resolved from profiles list)
      const rohitId = '11111111-1111-1111-1111-111111111111';
      const rishitId = '22222222-2222-2222-2222-222222222222';
      
      const [
        rohitData,
        rishitData,
        recentActs,
        loadedTasks,
        loadedComps,
        loadedSessions
      ] = await Promise.all([
        dbService.getUserStats(rohitId, todayStr),
        dbService.getUserStats(rishitId, todayStr),
        dbService.getActivities(20),
        dbService.getTasks(todayStr), // For today's items
        dbService.getTaskCompletions(todayStr), // For today's completions
        dbService.getDSASessions() // Load all sessions for heatmap
      ]);

      setRohitStats(rohitData);
      setRishitStats(rishitData);
      setActivities(recentActs);
      
      // For the heatmaps, we load tasks & completions for the last 112 days (16 weeks)
      // Since dbService.getTasks loads for a specific date, we can load a broader list.
      // In localStorage mode, all tasks are fetched easily.
      // Let's load the full localStorage items or querying them
      if (dbService.isSupabase()) {
        const { data: dbTasks } = await (dbService as any).supabase.from('tasks').select('*');
        const { data: dbComps } = await (dbService as any).supabase.from('task_completions').select('*');
        setAllTasks(dbTasks || []);
        setAllCompletions(dbComps || []);
      } else {
        // Local driver exposes tasks through local storage keys
        const lsTasks = JSON.parse(localStorage.getItem('pd_tasks') || '[]');
        const lsComps = JSON.parse(localStorage.getItem('pd_completions') || '[]');
        setAllTasks(lsTasks);
        setAllCompletions(lsComps);
      }

      setAllSessions(loadedSessions);
    } catch (err) {
      console.error('Failed to load stats data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-black min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-t-neon-yellow border-r-neon-blue border-b-white/5 border-l-white/5 rounded-full animate-spin shadow-[0_0_15px_rgba(223,254,0,0.2)]" />
        <span className="mt-4 font-orbitron font-bold text-xs uppercase tracking-widest text-white/50 animate-pulse">
          INITIALIZING ACCOUNTABILITY PROTOCOLS...
        </span>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-black px-4 py-6 md:py-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
      {/* Side by Side User Overview */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {rohitStats && <UserCard stats={rohitStats} />}
        {rishitStats && <UserCard stats={rishitStats} />}
      </section>

      {/* Grid of Heatmaps & Ticker Feed */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full items-start">
        {/* Heatmaps Col (Span 2) */}
        <div className="xl:col-span-2 flex flex-col gap-6 w-full">
          {rohitStats && (
            <ContributionGraph
              userId={rohitStats.profile.id}
              username="rohit"
              tasks={allTasks}
              completions={allCompletions}
              sessions={allSessions}
            />
          )}
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

        {/* Realtime Event Log Col (Span 1) */}
        <div className="xl:col-span-1 w-full flex flex-col gap-6">
          <LiveFeed activities={activities} />

          {/* Quick Actions Panel */}
          <div className="bg-[#070707] border border-white/5 p-4 rounded-xl glass-card flex flex-col gap-3">
            <h4 className="font-orbitron font-bold text-xs uppercase tracking-wider text-white/80 border-b border-white/5 pb-2">
              DECK CONTROL
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Link 
                href="/planner"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold tracking-wide transition-all"
              >
                <CheckCircle size={13} className="text-neon-yellow" />
                <span>Go to Planner</span>
              </Link>
              <Link 
                href="/journal"
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold tracking-wide transition-all"
              >
                <Play size={13} className="text-neon-blue" />
                <span>DSA Journal</span>
              </Link>
            </div>
            <Link
              href="/penalties"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-neon-red/35 bg-neon-red/5 hover:bg-neon-red/10 text-xs font-bold tracking-wide uppercase text-neon-red transition-all"
            >
              <ShieldAlert size={14} />
              <span>WALL OF SHAME (ACTIVE PENALTIES)</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
