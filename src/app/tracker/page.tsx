'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService } from '@/lib/db';
import { PlacementProgress } from '@/lib/types';
import { Award, RefreshCw, Layers, CheckCircle2, Circle, ArrowRight, Save } from 'lucide-react';

const STANDARD_TOPICS = [
  'Arrays & Hashing',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Binary Search',
  'Linked List',
  'Trees',
  'Tries',
  'Heaps / Priority Queue',
  'Backtracking',
  'Graphs',
  'Advanced Graphs',
  '1-D Dynamic Programming',
  '2-D Dynamic Programming',
  'Greedy Algorithms',
  'Intervals',
  'Bit Manipulation',
  'Math & Geometry',
  'System Design',
  'Object Oriented Programming',
  'SQL & Databases'
];

export default function TrackerPage() {
  const { activeUser, refreshKey, triggerRefresh, profiles } = useSession();
  
  const [viewUserTab, setViewUserTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states matching PlacementProgress
  const [currentTopic, setCurrentTopic] = useState('');
  const [topicsCompleted, setTopicsCompleted] = useState<string[]>([]);
  const [upcomingTopics, setUpcomingTopics] = useState<string[]>([]);
  const [interviewPrepProgress, setInterviewPrepProgress] = useState(0);
  const [easyOffset, setEasyOffset] = useState(0);
  const [mediumOffset, setMediumOffset] = useState(0);
  const [hardOffset, setHardOffset] = useState(0);

  useEffect(() => {
    if (activeUser && !viewUserTab) {
      setViewUserTab(activeUser.id);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchTrackerData();
  }, [refreshKey, viewUserTab]);

  const fetchTrackerData = async () => {
    if (!viewUserTab) return;
    try {
      setLoading(true);
      const data = await dbService.getPlacementProgress(viewUserTab);
      setCurrentTopic(data.current_topic || 'Arrays & Hashing');
      setTopicsCompleted(data.topics_completed || []);
      setUpcomingTopics(data.upcoming_topics || []);
      setInterviewPrepProgress(data.interview_prep_progress || 0);
      setEasyOffset(data.leetcode_easy_offset || 0);
      setMediumOffset(data.leetcode_medium_offset || 0);
      setHardOffset(data.leetcode_hard_offset || 0);
    } catch (err) {
      console.error('Failed to load tracker progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTopic = (topicName: string) => {
    // If completed, move to upcoming. If upcoming, move to completed.
    if (topicsCompleted.includes(topicName)) {
      setTopicsCompleted(prev => prev.filter(t => t !== topicName));
      setUpcomingTopics(prev => [...prev, topicName]);
    } else {
      setTopicsCompleted(prev => [...prev, topicName]);
      setUpcomingTopics(prev => prev.filter(t => t !== topicName));
    }
  };

  const handleSaveProgress = async () => {
    if (!viewUserTab) return;
    try {
      setSaving(true);
      
      // Enforce active user matching save trigger to maintain true accountability
      if (activeUser?.id !== viewUserTab) {
        alert("Grind Protocol Warning: You cannot modify stats for the other user. Please toggle active profiles first!");
        setSaving(false);
        return;
      }

      await dbService.updatePlacementProgress(viewUserTab, {
        current_topic: currentTopic.trim(),
        topics_completed: topicsCompleted,
        upcoming_topics: upcomingTopics,
        interview_prep_progress: interviewPrepProgress,
        leetcode_easy_offset: Number(easyOffset),
        leetcode_medium_offset: Number(mediumOffset),
        leetcode_hard_offset: Number(hardOffset),
      });

      alert('Placement tracker protocol updated successfully!');
      triggerRefresh();
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setSaving(false);
    }
  };

  // Quick reset standard checklist structure
  const handleLoadStandardChecklist = () => {
    if (!confirm('This will reorganize your completed/upcoming topics. Proceed?')) return;
    setTopicsCompleted(['Arrays & Hashing']);
    setUpcomingTopics(STANDARD_TOPICS.filter(t => t !== 'Arrays & Hashing'));
  };

  const selectedProfile = profiles.find((p) => p.id === viewUserTab);
  const colorAccent = selectedProfile?.color_accent || 'yellow';
  const isYellow = colorAccent === 'yellow';

  if (loading && !saving) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-black">
        <div className="w-10 h-10 border-2 border-t-neon-yellow border-white/5 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-black px-4 py-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 gap-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white">
            PLACEMENT TRACKER BOARD
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">
            Monitor total LeetCode solves and structure your preparation map
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
            onClick={handleSaveProgress}
            disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-black font-bold text-xs font-orbitron uppercase tracking-wide transition-all select-none hover:opacity-95 ${
              isYellow ? 'bg-neon-yellow shadow-[0_0_8px_#dffe00]' : 'bg-neon-blue shadow-[0_0_8px_#00f0ff]'
            }`}
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Tracker'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Leetcode Solved Inputs & Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Core Stats Panel (Column 1) */}
        <div className="md:col-span-1 bg-[#050505] border border-white/5 p-5 rounded-xl glass-card flex flex-col gap-4">
          <h3 className="font-orbitron font-bold text-xs uppercase text-white/60 tracking-wider flex items-center gap-2">
            <Award size={14} className={isYellow ? 'text-neon-yellow' : 'text-neon-blue'} />
            LEETCODE SOLVES OVERRIDE
          </h3>
          <p className="text-[10px] text-white/40 font-semibold leading-relaxed uppercase">
            Include Leetcode solved counts before using this tracker app.
          </p>

          {/* Easy count input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Easy solved</label>
            <input
              type="number"
              min={0}
              value={easyOffset}
              onChange={(e) => setEasyOffset(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Medium count input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Medium solved</label>
            <input
              type="number"
              min={0}
              value={mediumOffset}
              onChange={(e) => setMediumOffset(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Hard count input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Hard solved</label>
            <input
              type="number"
              min={0}
              value={hardOffset}
              onChange={(e) => setHardOffset(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500/50"
            />
          </div>

          {/* Current Focus Topic */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Current Focus Topic</label>
            <input
              type="text"
              value={currentTopic}
              onChange={(e) => setCurrentTopic(e.target.value)}
              placeholder="e.g. Graphs, System Design"
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Preparation Checklists (Column 2 & 3) */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Interview Prep Progress Indicator Slider */}
          <div className="bg-[#050505] border border-white/5 p-5 rounded-xl glass-card flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs font-bold font-orbitron">
              <span className="text-white/60 tracking-wider">INTERVIEW PREPARATION READINESS</span>
              <span className={isYellow ? 'text-neon-yellow text-glow-yellow' : 'text-neon-blue text-glow-blue'}>
                {interviewPrepProgress}%
              </span>
            </div>
            
            {/* Slider bar input */}
            <input
              type="range"
              min={0}
              max={100}
              value={interviewPrepProgress}
              onChange={(e) => setInterviewPrepProgress(parseInt(e.target.value) || 0)}
              className="w-full cursor-pointer accent-white"
            />
            
            {/* Progress Display Bar */}
            <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isYellow ? 'bg-neon-yellow shadow-[0_0_8px_#dffe00]' : 'bg-neon-blue shadow-[0_0_8px_#00f0ff]'
                }`}
                style={{ width: `${interviewPrepProgress}%` }}
              />
            </div>
          </div>

          {/* Re-load checklist quick action */}
          <div className="flex justify-between items-center">
            <h3 className="font-orbitron font-bold text-xs uppercase text-white/50 tracking-wider flex items-center gap-2">
              <Layers size={14} />
              PLACEMENT SYLLABUS TOPICS
            </h3>
            <button
              onClick={handleLoadStandardChecklist}
              className="text-[9px] font-mono font-bold text-white/30 hover:text-white border border-white/5 bg-white/5 px-2 py-1 rounded"
            >
              RESET TO NEST CHECKLIST
            </button>
          </div>

          {/* Lists layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Completed Topics Column */}
            <div className="bg-[#050505] border border-white/5 rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
              <h4 className="font-orbitron font-bold text-[11px] text-emerald-400 tracking-wider border-b border-white/5 pb-2 uppercase">
                Completed Topics ({topicsCompleted.length})
              </h4>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                {topicsCompleted.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                    No completed topics yet. Keep grinding!
                  </div>
                ) : (
                  topicsCompleted.map((topicName) => (
                    <button
                      key={topicName}
                      onClick={() => handleToggleTopic(topicName)}
                      className="flex items-center justify-between text-left px-3 py-2 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold transition-all group"
                    >
                      <span className="text-white/80">{topicName}</span>
                      <CheckCircle2 size={13} className="text-emerald-400 group-hover:hidden" />
                      <ArrowRight size={13} className="text-white/30 hidden group-hover:block" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming / Target Topics Column */}
            <div className="bg-[#050505] border border-white/5 rounded-xl p-4 flex flex-col gap-3 min-h-[300px]">
              <h4 className="font-orbitron font-bold text-[11px] text-white/50 tracking-wider border-b border-white/5 pb-2 uppercase">
                Upcoming Targets ({upcomingTopics.length})
              </h4>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                {upcomingTopics.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-white/30 font-semibold uppercase tracking-wider">
                    All topics completed! Ready for interview protocol.
                  </div>
                ) : (
                  upcomingTopics.map((topicName) => (
                    <button
                      key={topicName}
                      onClick={() => handleToggleTopic(topicName)}
                      className="flex items-center justify-between text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold transition-all group"
                    >
                      <span className="text-white/70">{topicName}</span>
                      <Circle size={13} className="text-white/20 group-hover:hidden" />
                      <CheckCircle2 size={13} className="text-emerald-400 hidden group-hover:block" />
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
