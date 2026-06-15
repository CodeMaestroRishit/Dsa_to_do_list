'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
    if (activeUser) {
      setViewUserTab(activeUser.id);
    }
  }, [activeUser]);

  const fetchTrackerData = useCallback(async () => {
    if (!viewUserTab) return;
    try {
      setLoading(true);
      const data: PlacementProgress = await dbService.getPlacementProgress(viewUserTab);
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
  }, [viewUserTab]);

  useEffect(() => {
    fetchTrackerData();
  }, [refreshKey, fetchTrackerData]);

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

  const handleLoadStandardChecklist = () => {
    if (!confirm('This will reorganize your completed/upcoming topics. Proceed?')) return;
    setTopicsCompleted([]);
    setUpcomingTopics(STANDARD_TOPICS);
  };

  const selectedProfile = profiles.find((p) => p.id === viewUserTab);
  const colorAccent = selectedProfile?.color_accent || 'blue';
  const isYellow = colorAccent === 'yellow';

  if (loading && !saving) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-transparent min-h-[400px]">
        <div className="w-12 h-12 border-4 border-black border-t-neo-blue rounded-full animate-spin shadow-[4px_4px_0px_#000000]" />
        <span className="mt-4 font-orbitron font-bold text-xs text-black uppercase tracking-wider">SYNCING PLACEMENT METRICS...</span>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-transparent px-4 py-8 max-w-5xl mx-auto w-full flex flex-col gap-6 relative z-10 text-black">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-4 border-black pb-4 gap-4">
        <div>
          <h1 className="font-orbitron font-black text-2xl tracking-wider text-black flex items-center gap-2">
            <Award className="text-black animate-pulse" size={24} />
            <span>PLACEMENT TRACKER BOARD</span>
          </h1>
          <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mt-1">
            Monitor total LeetCode solves and structure your preparation map
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSaveProgress}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-black bg-neo-green text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-neo-green/80 transition-all shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Saving...' : 'Save Tracker'}</span>
          </button>
        </div>
      </div>

      {/* Grid of Leetcode Solved Inputs & Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Core Stats Panel (Column 1) */}
        <div className="md:col-span-1 bg-white border-[3px] border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-4 text-black">
          <h3 className="font-orbitron font-black text-xs uppercase text-black tracking-wider flex items-center gap-2 border-b-2 border-black pb-2">
            <Award size={16} className="text-black" />
            SOLVES OVERRIDE
          </h3>
          <p className="text-[10px] text-black/60 font-bold leading-relaxed uppercase">
            Include Leetcode solved counts before using this tracker app.
          </p>

          {/* Easy count input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-black uppercase tracking-wider flex justify-between">
              <span>Easy solved</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-[#7ccd95] border border-black rounded text-black font-extrabold font-mono">EASY</span>
            </label>
            <input
              type="number"
              min={0}
              value={easyOffset}
              onChange={(e) => setEasyOffset(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-white border-2 border-black rounded-xl px-3 py-2 text-sm text-black font-mono font-bold focus:outline-none focus:bg-neo-green focus:ring-0 shadow-[2px_2px_0px_#000000] transition-all"
            />
          </div>

          {/* Medium count input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-black uppercase tracking-wider flex justify-between">
              <span>Medium solved</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-[#fdf2a9] border border-black rounded text-black font-extrabold font-mono">MEDIUM</span>
            </label>
            <input
              type="number"
              min={0}
              value={mediumOffset}
              onChange={(e) => setMediumOffset(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-white border-2 border-black rounded-xl px-3 py-2 text-sm text-black font-mono font-bold focus:outline-none focus:bg-neo-yellow focus:ring-0 shadow-[2px_2px_0px_#000000] transition-all"
            />
          </div>

          {/* Hard count input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-black uppercase tracking-wider flex justify-between">
              <span>Hard solved</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-[#ffb7b2] border border-black rounded text-black font-extrabold font-mono">HARD</span>
            </label>
            <input
              type="number"
              min={0}
              value={hardOffset}
              onChange={(e) => setHardOffset(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-white border-2 border-black rounded-xl px-3 py-2 text-sm text-black font-mono font-bold focus:outline-none focus:bg-neo-peach focus:ring-0 shadow-[2px_2px_0px_#000000] transition-all"
            />
          </div>

          {/* Current Focus Topic */}
          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-[10px] font-bold text-black uppercase tracking-wider">Current Focus Topic</label>
            <input
              type="text"
              value={currentTopic}
              onChange={(e) => setCurrentTopic(e.target.value)}
              placeholder="e.g. Graphs, System Design"
              className="bg-white border-2 border-black rounded-xl px-3 py-2 text-sm text-black font-bold focus:outline-none focus:bg-neo-blue focus:ring-0 shadow-[2px_2px_0px_#000000] transition-all"
            />
          </div>
        </div>

        {/* Preparation Checklists (Column 2 & 3) */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Interview Prep Progress Indicator Slider */}
          <div className="bg-white border-[3px] border-black p-5 rounded-2xl shadow-[4px_4px_0px_0px_#000000] flex flex-col gap-4 text-black">
            <div className="flex justify-between items-center text-xs font-black font-orbitron">
              <span className="text-black tracking-wider">INTERVIEW PREPARATION READINESS</span>
              <span className={isYellow ? 'text-glow-yellow' : 'text-glow-blue'}>
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
              className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
            />
            
            {/* Progress Display Bar */}
            <div className="w-full bg-neo-gray border-[3px] border-black h-5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 border-r-2 border-black ${
                  isYellow ? 'bg-neo-yellow' : 'bg-neo-blue'
                }`}
                style={{ width: `${interviewPrepProgress}%` }}
              />
            </div>
          </div>

          {/* Re-load checklist quick action */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h3 className="font-orbitron font-black text-xs uppercase text-black tracking-wider flex items-center gap-2">
              <Layers size={14} />
              PLACEMENT SYLLABUS TOPICS
            </h3>
            <button
              onClick={handleLoadStandardChecklist}
              className="text-[10px] font-bold text-black border-2 border-black bg-neo-peach px-3 py-1.5 rounded-xl shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all cursor-pointer"
            >
              RESET TO STANDARD SYLLABUS
            </button>
          </div>

          {/* Lists layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Completed Topics Column */}
            <div className="bg-white border-[3px] border-black rounded-2xl p-4 flex flex-col gap-3 min-h-[350px] shadow-[4px_4px_0px_0px_#000000]">
              <h4 className="font-orbitron font-black text-xs text-[#2e7d32] tracking-wider border-b-2 border-black pb-2 uppercase flex items-center justify-between">
                <span>Completed Topics</span>
                <span className="px-2 py-0.5 bg-neo-green border border-black rounded-full font-mono text-[10px] font-extrabold text-black">
                  {topicsCompleted.length}
                </span>
              </h4>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                {topicsCompleted.length === 0 ? (
                  <div className="text-center py-16 text-[11px] text-black/40 font-bold uppercase tracking-wider">
                    No completed topics yet.<br/>Keep grinding!
                  </div>
                ) : (
                  topicsCompleted.map((topicName) => (
                    <button
                      key={topicName}
                      onClick={() => handleToggleTopic(topicName)}
                      className="flex items-center justify-between text-left px-3 py-2.5 rounded-xl bg-neo-green/20 hover:bg-neo-green/40 border-2 border-black text-xs font-bold text-black shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all cursor-pointer group"
                    >
                      <span>{topicName}</span>
                      <div className="flex items-center">
                        <CheckCircle2 size={14} className="text-black group-hover:hidden" />
                        <ArrowRight size={14} className="text-black hidden group-hover:block" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Upcoming / Target Topics Column */}
            <div className="bg-white border-[3px] border-black rounded-2xl p-4 flex flex-col gap-3 min-h-[350px] shadow-[4px_4px_0px_0px_#000000]">
              <h4 className="font-orbitron font-black text-xs text-black/60 tracking-wider border-b-2 border-black pb-2 uppercase flex items-center justify-between">
                <span>Upcoming Targets</span>
                <span className="px-2 py-0.5 bg-neo-gray border border-black rounded-full font-mono text-[10px] font-extrabold text-black">
                  {upcomingTopics.length}
                </span>
              </h4>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                {upcomingTopics.length === 0 ? (
                  <div className="text-center py-16 text-[11px] text-black/40 font-bold uppercase tracking-wider">
                    All topics completed!<br/>Ready for interview protocol.
                  </div>
                ) : (
                  upcomingTopics.map((topicName) => (
                    <button
                      key={topicName}
                      onClick={() => handleToggleTopic(topicName)}
                      className="flex items-center justify-between text-left px-3 py-2.5 rounded-xl bg-white hover:bg-neo-blue/20 border-2 border-black text-xs font-bold text-black shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[1px] active:translate-x-[1px] active:shadow-none transition-all cursor-pointer group"
                    >
                      <span>{topicName}</span>
                      <div className="flex items-center">
                        <Circle size={14} className="text-black/30 group-hover:hidden" />
                        <CheckCircle2 size={14} className="text-black hidden group-hover:block" />
                      </div>
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
