'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { DSASession } from '@/lib/types';
import { DifficultyBreakdown, TopicStats, WeeklyGraph } from '@/components/StatsCharts';
import { Plus, BookOpen, Clock, Calendar, CheckSquare, BarChart3, AlertCircle } from 'lucide-react';

export default function JournalPage() {
  const { activeUser, refreshKey, triggerRefresh, profiles } = useSession();
  
  const [sessions, setSessions] = useState<DSASession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User tab view selector (to view Rohit vs Rishit journal)
  const [viewUserTab, setViewUserTab] = useState<string>('');

  // Form states
  const [showLogForm, setShowLogForm] = useState(false);
  const [topic, setTopic] = useState('');
  const [leetcodeTitles, setLeetcodeTitles] = useState('');
  const [easyCount, setEasyCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [hardCount, setHardCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(60); // minutes
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getLocalDateString());

  useEffect(() => {
    if (activeUser) {
      setViewUserTab(activeUser.id);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchJournalData();
  }, [refreshKey, viewUserTab]);

  const fetchJournalData = async () => {
    if (!viewUserTab) return;
    try {
      setLoading(true);
      const fetched = await dbService.getDSASessions(viewUserTab);
      setSessions(fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error('Failed to load journal logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !viewUserTab || !topic.trim()) return;

    const titlesArray = leetcodeTitles
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const questionsCount = easyCount + mediumCount + hardCount;

    try {
      await dbService.addDSASession({
        user_id: viewUserTab,
        topic: topic.trim(),
        questions_count: questionsCount,
        leetcode_questions: titlesArray,
        difficulty_easy: easyCount,
        difficulty_medium: mediumCount,
        difficulty_hard: hardCount,
        time_spent: Number(timeSpent),
        notes: notes.trim() || null,
        date,
      });

      // Clear Form
      setTopic('');
      setLeetcodeTitles('');
      setEasyCount(0);
      setMediumCount(0);
      setHardCount(0);
      setTimeSpent(60);
      setNotes('');
      setShowLogForm(false);
      
      triggerRefresh();
    } catch (err) {
      console.error('Error logging DSA session:', err);
    }
  };

  // Compile calculations for stats display
  const dsaStats = React.useMemo(() => {
    let easy = 0;
    let medium = 0;
    let hard = 0;
    let totalQuestions = 0;
    const topicCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    sessions.forEach((s) => {
      easy += s.difficulty_easy;
      medium += s.difficulty_medium;
      hard += s.difficulty_hard;
      totalQuestions += s.questions_count;
      
      topicCounts[s.topic] = (topicCounts[s.topic] || 0) + s.questions_count;
      dailyCounts[s.date] = (dailyCounts[s.date] || 0) + s.questions_count;
    });

    return { easy, medium, hard, totalQuestions, topicCounts, dailyCounts };
  }, [sessions]);

  const selectedProfile = profiles.find((p) => p.id === viewUserTab);
  const colorAccent = selectedProfile?.color_accent || 'yellow';

  return (
    <div className="flex-grow bg-black px-4 py-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white">
            DSA JOURNAL LOGS
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">
            Log coding grind, leetcode tasks, and study records
          </p>
        </div>

        <div className="flex gap-3">
          {/* User toggle */}
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/5">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setViewUserTab(p.id)}
                className={`px-3 py-1 rounded text-xs font-bold font-orbitron uppercase tracking-wider transition-all ${
                  viewUserTab === p.id
                    ? p.color_accent === 'yellow'
                      ? 'bg-neon-yellow text-black font-black'
                      : 'bg-neon-blue text-black font-black'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {p.display_name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-white/90 transition-all select-none"
          >
            <Plus size={14} />
            <span>{showLogForm ? 'Close Log Form' : 'Log Session'}</span>
          </button>
        </div>
      </div>

      {/* Log Form Panel (Collapsible) */}
      {showLogForm && (
        <div className="bg-[#050505] border border-white/10 rounded-2xl p-6 glass-panel">
          <h2 className="font-orbitron font-black text-sm tracking-wider text-white mb-4 flex items-center gap-1.5">
            <BookOpen size={16} className={colorAccent === 'yellow' ? 'text-neon-yellow' : 'text-neon-blue'} />
            RECORD DSA SESSION FOR {selectedProfile?.display_name.toUpperCase()}
          </h2>

          <form onSubmit={handleLogSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left side inputs */}
            <div className="flex flex-col gap-4">
              {/* Topic */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Topic Studied</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Graphs, Dynamic Programming"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              {/* LeetCode list */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Leetcode Questions Solved (Comma Separated)
                </label>
                <textarea
                  value={leetcodeTitles}
                  onChange={(e) => setLeetcodeTitles(e.target.value)}
                  placeholder="e.g. Number of Islands, Course Schedule, Clone Graph"
                  rows={2}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Study Notes / Insights</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Studied BFS, implemented adjacency list..."
                  rows={3}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>
            </div>

            {/* Right side inputs */}
            <div className="flex flex-col gap-4">
              {/* Difficulty Counter Grid */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Questions Difficulty Split</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Easy */}
                  <div className="flex flex-col gap-1 bg-white/5 border border-white/5 p-2 rounded-lg items-center">
                    <span className="text-[9px] font-bold text-emerald-400">EASY</span>
                    <input
                      type="number"
                      min={0}
                      value={easyCount}
                      onChange={(e) => setEasyCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center bg-black border border-white/10 rounded px-1.5 py-1 text-sm font-mono text-white"
                    />
                  </div>

                  {/* Medium */}
                  <div className="flex flex-col gap-1 bg-white/5 border border-white/5 p-2 rounded-lg items-center">
                    <span className="text-[9px] font-bold text-amber-400">MEDIUM</span>
                    <input
                      type="number"
                      min={0}
                      value={mediumCount}
                      onChange={(e) => setMediumCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center bg-black border border-white/10 rounded px-1.5 py-1 text-sm font-mono text-white"
                    />
                  </div>

                  {/* Hard */}
                  <div className="flex flex-col gap-1 bg-white/5 border border-white/5 p-2 rounded-lg items-center">
                    <span className="text-[9px] font-bold text-rose-400">HARD</span>
                    <input
                      type="number"
                      min={0}
                      value={hardCount}
                      onChange={(e) => setHardCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-12 text-center bg-black border border-white/10 rounded px-1.5 py-1 text-sm font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Time spent & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Time Spent (Minutes)</label>
                  <input
                    type="number"
                    min={10}
                    required
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(Math.max(10, parseInt(e.target.value) || 0))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-mono"
                  />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Grind Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-mono bg-transparent"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className={`mt-auto w-full py-2.5 rounded-lg text-black font-bold font-orbitron text-xs uppercase tracking-widest transition-all hover:opacity-90 ${
                  colorAccent === 'yellow' ? 'bg-neon-yellow shadow-[0_0_8px_#dffe00]' : 'bg-neon-blue shadow-[0_0_8px_#00f0ff]'
                }`}
              >
                COMMIT JOURNAL SESSION
              </button>
            </div>
            
          </form>
        </div>
      )}

      {/* Main Stats Charts Grid */}
      {sessions.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="md:col-span-1">
            <DifficultyBreakdown easy={dsaStats.easy} medium={dsaStats.medium} hard={dsaStats.hard} />
          </div>
          <div className="md:col-span-1">
            <TopicStats topics={dsaStats.topicCounts} />
          </div>
          <div className="md:col-span-1">
            <WeeklyGraph dailySolved={dsaStats.dailyCounts} colorAccent={colorAccent} />
          </div>
        </section>
      )}

      {/* Session Logs History List */}
      <section className="flex flex-col gap-4">
        <h3 className="font-orbitron font-bold text-xs uppercase text-white/50 tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2">
          <BarChart3 size={14} />
          JOURNAL ENTRIES ({sessions.length})
        </h3>
        
        {loading ? (
          <div className="text-center py-8 text-xs text-white/30 font-mono">LOADING JOURNAL PROTOCOL...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white/5 border border-white/5 rounded-2xl py-16 text-center text-xs text-white/30 font-semibold tracking-wider flex flex-col items-center gap-2">
            <AlertCircle size={20} />
            <span>NO DSA JOURNAL SESSIONS REGISTERED FOR THIS USER YET.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar">
            {sessions.map((session) => (
              <div 
                key={session.id}
                className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/10 transition-all flex flex-col gap-3 relative overflow-hidden group"
              >
                {/* Visual Accent Indicator */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${colorAccent === 'yellow' ? 'bg-neon-yellow shadow-[0_0_8px_#dffe00]' : 'bg-neon-blue shadow-[0_0_8px_#00f0ff]'}`} />
                
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-orbitron font-bold text-sm tracking-wide text-white">
                      {session.topic}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-white/30 px-2 py-0.5 rounded border border-white/5 bg-white/5">
                      {session.questions_count} QUESTIONS SOLVED
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-white/40 font-mono font-semibold">
                    <div className="flex items-center gap-1">
                      <Clock size={11} />
                      <span>{session.time_spent} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{session.date}</span>
                    </div>
                  </div>
                </div>

                {/* Question tags list */}
                {session.leetcode_questions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/30 mr-1">Questions:</span>
                    {session.leetcode_questions.map((q, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-semibold text-white/70 px-2 py-0.5 rounded bg-white/5 border border-white/5"
                      >
                        {q}
                      </span>
                    ))}
                  </div>
                )}

                {/* Difficulty count check */}
                <div className="flex gap-4 text-[9px] font-bold font-mono">
                  {session.difficulty_easy > 0 && <span className="text-emerald-400">EASY: {session.difficulty_easy}</span>}
                  {session.difficulty_medium > 0 && <span className="text-amber-400">MEDIUM: {session.difficulty_medium}</span>}
                  {session.difficulty_hard > 0 && <span className="text-rose-400 font-black">HARD: {session.difficulty_hard}</span>}
                </div>

                {/* Study Notes */}
                {session.notes && (
                  <p className="text-xs text-white/60 leading-relaxed border-t border-white/5 pt-2.5 mt-0.5 italic">
                    "{session.notes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
