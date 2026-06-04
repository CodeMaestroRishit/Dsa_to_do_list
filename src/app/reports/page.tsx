'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { WeeklyReport } from '@/lib/types';
import { Award, BookOpen, Clock, Lightbulb, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const { activeUser, refreshKey, profiles } = useSession();

  const [rohitReport, setRohitReport] = useState<WeeklyReport | null>(null);
  const [rishitReport, setRishitReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Default week starting date is Monday of current week
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
    return getLocalDateString(monday);
  });

  useEffect(() => {
    fetchReports();
  }, [refreshKey, weekStartDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const rohitId = '11111111-1111-1111-1111-111111111111';
      const rishitId = '22222222-2222-2222-2222-222222222222';

      // Load existing reports, or generate on the fly
      const [rohitRep, rishitRep] = await Promise.all([
        dbService.generateWeeklyReport(rohitId, weekStartDate),
        dbService.generateWeeklyReport(rishitId, weekStartDate)
      ]);

      setRohitReport(rohitRep);
      setRishitReport(rishitRep);
    } catch (err) {
      console.error('Failed to fetch weekly reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReports = async () => {
    try {
      setGenerating(true);
      const rohitId = '11111111-1111-1111-1111-111111111111';
      const rishitId = '22222222-2222-2222-2222-222222222222';

      const [rohitRep, rishitRep] = await Promise.all([
        dbService.generateWeeklyReport(rohitId, weekStartDate),
        dbService.generateWeeklyReport(rishitId, weekStartDate)
      ]);

      setRohitReport(rohitRep);
      setRishitReport(rishitRep);
      alert('Weekly reports compiled and updated!');
    } catch (err) {
      console.error('Failed to regenerate reports:', err);
    } finally {
      setGenerating(false);
    }
  };

  const renderReportCard = (report: WeeklyReport | null, displayTitle: string, isRohit: boolean) => {
    if (!report) return null;
    const themeColor = isRohit ? 'text-neon-yellow' : 'text-neon-blue';
    const borderClass = isRohit ? 'border-neon-yellow/10' : 'border-neon-blue/10';
    const glowClass = isRohit ? 'text-glow-yellow' : 'text-glow-blue';

    return (
      <div className={`bg-[#050505] border ${borderClass} rounded-2xl p-6 glass-card flex flex-col gap-5 relative overflow-hidden`}>
        {/* Header */}
        <div className="flex justify-between items-start border-b border-white/5 pb-3">
          <div>
            <h3 className={`font-orbitron font-black text-lg tracking-wider ${themeColor} ${glowClass}`}>
              {displayTitle.toUpperCase()}
            </h3>
            <p className="text-[9px] font-mono text-white/40 uppercase tracking-widest mt-0.5">
              Week starting: {report.week_start_date}
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 border border-white/5 text-xs font-bold font-orbitron">
            <TrendingUp size={13} className={themeColor} />
            <span>SCORE: {report.consistency_score}%</span>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Study Hours */}
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center">
            <Clock size={16} className="text-white/40 mb-1" />
            <span className="text-base font-black font-orbitron text-white">{report.study_hours}</span>
            <span className="text-[8px] font-bold text-white/30 tracking-wider uppercase mt-0.5">Grind Hours</span>
          </div>

          {/* Solved Questions */}
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center">
            <Award size={16} className="text-white/40 mb-1" />
            <span className="text-base font-black font-orbitron text-white">{report.questions_solved}</span>
            <span className="text-[8px] font-bold text-white/30 tracking-wider uppercase mt-0.5">Qs Solved</span>
          </div>

          {/* Topics Covered */}
          <div className="bg-white/5 border border-white/5 p-3 rounded-xl flex flex-col items-center justify-center">
            <BookOpen size={16} className="text-white/40 mb-1" />
            <span className="text-base font-black font-orbitron text-white">{report.topics_covered.length}</span>
            <span className="text-[8px] font-bold text-white/30 tracking-wider uppercase mt-0.5">Topics studied</span>
          </div>
        </div>

        {/* Topics Details */}
        {report.topics_covered.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-white/40 tracking-wider uppercase">Topics Explored:</span>
            <div className="flex flex-wrap gap-1.5">
              {report.topics_covered.map((topic, idx) => (
                <span key={idx} className="text-[10px] font-semibold text-white/80 px-2 py-0.5 rounded bg-white/5 border border-white/5">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI accountability advisor tips */}
        <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
          <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-1.5">
            <Lightbulb size={13} className="text-neon-yellow" />
            ACCOUNTABILITY COACH ADVICE
          </h4>
          <ul className="flex flex-col gap-2 pl-1">
            {report.improvement_suggestions.map((tip, idx) => (
              <li key={idx} className="text-xs text-white/70 leading-relaxed list-disc list-inside">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  if (loading && !generating) {
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
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-white flex items-center gap-2">
            <Sparkles className="text-neon-yellow" />
            WEEKLY PROGRESS PROTOCOLS
          </h1>
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-0.5">
            Aggregate grind metrics, efficiency ratios, and coach analysis
          </p>
        </div>

        <div className="flex gap-3">
          {/* Week date select */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider font-mono">Week starting:</label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/30 font-mono bg-transparent"
            />
          </div>

          <button
            onClick={handleGenerateReports}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-white/90 transition-all select-none"
          >
            <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
            <span>Update report</span>
          </button>
        </div>
      </div>

      {/* Side-by-side comparative reports cards */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
        {renderReportCard(rohitReport, "Rohit's Weekly Grind", true)}
        {renderReportCard(rishitReport, "Rishit's Weekly Grind", false)}
      </section>

    </div>
  );
}
