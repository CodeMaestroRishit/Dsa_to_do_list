'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { WeeklyReport } from '@/lib/types';
import { Award, BookOpen, Clock, Lightbulb, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const { refreshKey } = useSession();

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

  const fetchReports = React.useCallback(async () => {
    try {
      setLoading(true);
      const rishitId = '22222222-2222-2222-2222-222222222222';

      // Load existing reports, or generate on the fly
      const rishitRep = await dbService.generateWeeklyReport(rishitId, weekStartDate);
      setRishitReport(rishitRep);
    } catch (err) {
      console.error('Failed to fetch weekly reports:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStartDate]);

  useEffect(() => {
    fetchReports();
  }, [refreshKey, fetchReports]);

  const handleGenerateReports = async () => {
    try {
      setGenerating(true);
      const rishitId = '22222222-2222-2222-2222-222222222222';

      const rishitRep = await dbService.generateWeeklyReport(rishitId, weekStartDate);
      setRishitReport(rishitRep);
      alert('Weekly report compiled and updated!');
    } catch (err) {
      console.error('Failed to regenerate report:', err);
    } finally {
      setGenerating(false);
    }
  };

  const renderReportCard = (report: WeeklyReport | null, displayTitle: string) => {
    if (!report) return null;

    return (
      <div className="bg-white border-[3px] border-black rounded-2xl p-6 glass-card flex flex-col gap-5 relative overflow-hidden w-full max-w-2xl mx-auto shadow-[5px_5px_0px_#000000] text-black">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black/10 pb-3">
          <div>
            <h3 className="font-orbitron font-black text-lg tracking-wider text-black">
              {displayTitle.toUpperCase()}
            </h3>
            <p className="text-[9px] font-mono text-black/55 uppercase tracking-widest mt-0.5 font-bold">
              Week starting: {report.week_start_date}
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-neo-yellow border-2 border-black text-xs font-black font-orbitron shadow-[2px_2px_0px_#000000]">
            <TrendingUp size={13} className="text-black" />
            <span>SCORE: {report.consistency_score}%</span>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Study Hours */}
          <div className="bg-neo-gray border-2 border-black p-3 rounded-xl flex flex-col items-center justify-center shadow-[2px_2px_0px_#000000]">
            <Clock size={16} className="text-black/60 mb-1" />
            <span className="text-base font-black font-orbitron text-black">{report.study_hours}</span>
            <span className="text-[8px] font-bold text-black/50 tracking-wider uppercase mt-0.5">Grind Hours</span>
          </div>

          {/* Solved Questions */}
          <div className="bg-neo-gray border-2 border-black p-3 rounded-xl flex flex-col items-center justify-center shadow-[2px_2px_0px_#000000]">
            <Award size={16} className="text-black/60 mb-1" />
            <span className="text-base font-black font-orbitron text-black">{report.questions_solved}</span>
            <span className="text-[8px] font-bold text-black/50 tracking-wider uppercase mt-0.5">Qs Solved</span>
          </div>

          {/* Topics Covered */}
          <div className="bg-neo-gray border-2 border-black p-3 rounded-xl flex flex-col items-center justify-center shadow-[2px_2px_0px_#000000]">
            <BookOpen size={16} className="text-black/60 mb-1" />
            <span className="text-base font-black font-orbitron text-black">{report.topics_covered.length}</span>
            <span className="text-[8px] font-bold text-black/50 tracking-wider uppercase mt-0.5">Topics studied</span>
          </div>
        </div>

        {/* Topics Details */}
        {report.topics_covered.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-bold text-black/50 tracking-wider uppercase">Topics Explored:</span>
            <div className="flex flex-wrap gap-1.5">
              {report.topics_covered.map((topic, idx) => (
                <span key={idx} className="text-[10px] font-bold text-black px-2 py-0.5 rounded border-2 border-black bg-neo-purple shadow-[1px_1px_0px_#000000]">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI accountability advisor tips */}
        <div className="bg-neo-blue/15 border-2 border-black p-4 rounded-xl flex flex-col gap-2 shadow-[2px_2px_0px_#000000]">
          <h4 className="text-[10px] font-bold text-black/60 uppercase tracking-widest flex items-center gap-1.5 border-b border-black/10 pb-1.5">
            <Lightbulb size={13} className="text-black" />
            ACCOUNTABILITY COACH ADVICE
          </h4>
          <ul className="flex flex-col gap-2 pl-1">
            {report.improvement_suggestions.map((tip, idx) => (
              <li key={idx} className="text-xs text-black/80 font-bold leading-relaxed list-disc list-inside">
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
      <div className="flex-grow flex flex-col items-center justify-center bg-transparent">
        <div className="w-10 h-10 border-4 border-black border-t-neo-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-grow bg-transparent px-4 py-8 max-w-5xl mx-auto w-full flex flex-col gap-6 relative z-10 text-black">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-4 border-black pb-4 gap-4">
        <div>
          <h1 className="font-orbitron font-black text-xl md:text-2xl tracking-wider text-black flex items-center gap-2">
            <Sparkles className="text-black" />
            WEEKLY PROGRESS PROTOCOLS
          </h1>
          <p className="text-xs font-bold text-black/60 uppercase tracking-widest mt-0.5">
            Aggregate grind metrics, efficiency ratios, and coach analysis
          </p>
        </div>

        <div className="flex gap-3">
          {/* Week date select */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider font-mono">Week starting:</label>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              className="bg-white border-2 border-black rounded-lg px-2.5 py-1.5 text-xs text-black focus:outline-none focus:bg-neo-yellow font-mono shadow-[1px_1px_0px_#000000]"
            />
          </div>

          <button
            onClick={handleGenerateReports}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-black bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-neo-green transition-all shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer"
          >
            <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
            <span>Update report</span>
          </button>
        </div>
      </div>

      {/* Reports layout */}
      <section className="w-full flex justify-center">
        {renderReportCard(rishitReport, "Rishit's Weekly Grind")}
      </section>

    </div>
  );
}
