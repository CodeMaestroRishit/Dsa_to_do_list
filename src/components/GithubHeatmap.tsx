'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { GitPullRequest, RefreshCw, User, Check, AlertCircle } from 'lucide-react';
import { getLocalDateString } from '@/lib/db';

interface GitHubHeatmapProps {
  userId: string;
  localData: {
    tasksCompleted: Record<string, number>;
    questionsSolved: Record<string, number>;
  };
}

interface GitHubEvent {
  type: string;
  created_at?: string;
  payload?: {
    commits?: unknown[];
  };
}

export const GithubHeatmap: React.FC<GitHubHeatmapProps> = ({ userId, localData }) => {
  const [username, setUsername] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempUsername, setTempUsername] = useState<string>('');
  const [githubContributions, setGithubContributions] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`pd_github_username_${userId}`);
      if (stored) {
        setUsername(stored);
        setTempUsername(stored);
      }
    }
  }, [userId]);

  const fetchGithubActivity = async (user: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/users/${user}/events`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('API Rate Limit exceeded. Showing offline fallback.');
        }
        throw new Error('User not found');
      }
      const events = await res.json();
      
      const counts: Record<string, number> = {};
      if (Array.isArray(events)) {
        events.forEach((event: GitHubEvent) => {
          if (!event.created_at) return;
          const dateStr = event.created_at.substring(0, 10);
          
          let contributionScore = 0;
          if (event.type === 'PushEvent' && event.payload && event.payload.commits) {
            contributionScore += event.payload.commits.length;
          } else if (
            event.type === 'CreateEvent' || 
            event.type === 'PullRequestEvent' || 
            event.type === 'IssuesEvent' || 
            event.type === 'IssueCommentEvent'
          ) {
            contributionScore += 1;
          }
          
          if (contributionScore > 0) {
            counts[dateStr] = (counts[dateStr] || 0) + contributionScore;
          }
        });
      }
      setGithubContributions(counts);
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch GitHub activity.';
      setError(errorMsg);
      setGithubContributions({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchGithubActivity(username);
    } else {
      setGithubContributions({});
    }
  }, [username]);

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = tempUsername.trim();
    setUsername(cleanUser);
    localStorage.setItem(`pd_github_username_${userId}`, cleanUser);
    setIsEditing(false);
  };

  // Grid settings: 16 weeks (112 days)
  const WEEKS_COUNT = 16;
  const DAYS_COUNT = WEEKS_COUNT * 7;

  const gridData = useMemo(() => {
    const today = new Date();
    const dataList = [];
    
    const startOffset = DAYS_COUNT - 1;
    
    for (let i = startOffset; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(targetDate);

      let count = 0;
      let isRealGithub = false;

      if (username && Object.keys(githubContributions).length > 0) {
        count = githubContributions[dateStr] || 0;
        isRealGithub = true;
      } else {
        // Fallback: Compute standard score from local stats
        const tasksDone = localData.tasksCompleted[dateStr] || 0;
        const questions = localData.questionsSolved[dateStr] || 0;
        count = tasksDone * 2 + questions * 3;
      }

      // Determine level: 0 to 4
      let level = 0;
      if (count > 0 && count <= 2) level = 1;
      else if (count > 2 && count <= 5) level = 2;
      else if (count > 5 && count <= 9) level = 3;
      else if (count > 9) level = 4;

      dataList.push({
        date: dateStr,
        dayOfWeek: targetDate.getDay(),
        level,
        count,
        isRealGithub
      });
    }

    return dataList;
  }, [username, githubContributions, localData, DAYS_COUNT]);

  // Group days into columns (weeks)
  const columns = useMemo(() => {
    const cols = [];
    let currentWeek = [];

    const paddedData: (typeof gridData[number] | null)[] = [...gridData];
    const firstDayOfWeek = gridData[0].dayOfWeek;
    
    // Prepend empty pads if first day is not Sunday (0)
    for (let p = 0; p < firstDayOfWeek; p++) {
      paddedData.unshift(null);
    }

    for (let idx = 0; idx < paddedData.length; idx++) {
      currentWeek.push(paddedData[idx]);
      if (currentWeek.length === 7 || idx === paddedData.length - 1) {
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        cols.push(currentWeek);
        currentWeek = [];
      }
    }
    
    return cols.slice(-WEEKS_COUNT);
  }, [gridData]);

  // Neo-Brutalist styling colors
  const getCellColorClass = (level: number, isSunday: boolean) => {
    if (level === 0) {
      return isSunday 
        ? 'bg-rose-100 border border-black/35 hover:border-black' 
        : 'bg-white border border-black/20 hover:border-black';
    }

    switch (level) {
      case 1: return 'bg-neo-purple border border-black shadow-[1px_1px_0px_#000000]';
      case 2: return 'bg-neo-blue border border-black shadow-[1px_1px_0px_#000000]';
      case 3: return 'bg-neo-yellow border border-black shadow-[1px_1px_0px_#000000]';
      case 4: return 'bg-neo-green border border-black shadow-[1.5px_1.5px_0px_#000000]';
      default: return 'bg-white border border-black/25';
    }
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Sum up total contributions
  const totalContributions = useMemo(() => {
    return gridData.reduce((sum, day) => sum + day.count, 0);
  }, [gridData]);

  return (
    <div className="w-full bg-white p-4 rounded-xl glass-card flex flex-col gap-3 relative">
      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <GitPullRequest className="text-black" size={16} />
          <h4 className="font-orbitron font-bold text-xs uppercase text-black tracking-wider">
            {username ? `${username.toUpperCase()}'S GITHUB ACTIVITY` : 'GITHUB HEATMAP'}
          </h4>
        </div>
        
        {/* Username input */}
        <div>
          {isEditing ? (
            <form onSubmit={handleSaveUsername} className="flex items-center gap-1">
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="GitHub Username"
                className="bg-white border-2 border-black rounded px-2 py-0.5 text-[10px] font-mono text-black focus:outline-none focus:bg-neo-yellow w-28 shadow-[1px_1px_0px_#000000]"
                required
              />
              <button
                type="submit"
                className="p-1 rounded border-2 border-black bg-neo-green hover:bg-neo-green/80 text-black cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                title="Save username"
              >
                <Check size={10} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-[9px] font-mono font-bold text-black hover:bg-neo-yellow transition-all cursor-pointer bg-white px-2 py-0.5 rounded-md border-2 border-black shadow-[2px_2px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <User size={10} className="text-black" />
              <span>{username ? `@${username}` : 'LINK GITHUB'}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <RefreshCw className="animate-spin text-black" size={18} />
          <span className="text-[9px] font-orbitron text-black/60 tracking-wider">HARVESTING GIT HISTORY...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 overflow-x-auto scrollbar-hide py-1">
            {/* Row labels */}
            <div className="grid grid-rows-7 gap-1 text-[9px] font-bold font-mono text-black/50 text-center select-none pt-0.5">
              {dayLabels.map((lbl, idx) => (
                <div key={idx} className="w-3.5 h-3.5 flex items-center justify-center">
                  {idx % 2 === 0 ? lbl : ''}
                </div>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="flex gap-1">
              {columns.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-rows-7 gap-1">
                  {week.map((day, dayIdx) => {
                    if (!day) {
                      return <div key={dayIdx} className="w-3.5 h-3.5 rounded bg-transparent" />;
                    }
                    const isSunday = dayIdx === 0;
                    
                    return (
                      <div
                        key={dayIdx}
                        title={`${day.date}: ${day.count} contributions ${day.isRealGithub ? '(GitHub)' : '(Local Grind)'}`}
                        className={`w-3.5 h-3.5 rounded-sm transition-all duration-300 cursor-pointer ${getCellColorClass(
                          day.level,
                          isSunday
                        )}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mt-1 pt-2 border-t border-black/15 text-[9px] font-mono text-black/60 tracking-wide">
            <span>
              TOTAL: <strong className="text-black font-extrabold">{totalContributions} CONTRIBUTIONS</strong> (112 Days)
            </span>
            <div className="flex items-center gap-1.5 font-bold">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-sm bg-white border border-black/25" />
              <div className="w-2.5 h-2.5 rounded-sm bg-neo-purple border border-black" />
              <div className="w-2.5 h-2.5 rounded-sm bg-neo-blue border border-black" />
              <div className="w-2.5 h-2.5 rounded-sm bg-neo-yellow border border-black" />
              <div className="w-2.5 h-2.5 rounded-sm bg-neo-green border border-black" />
              <span>More</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1 text-[8px] font-mono text-red-600 mt-1 uppercase font-bold">
              <AlertCircle size={9} />
              <span>{error}</span>
            </div>
          )}
          {!username && !error && (
            <div className="flex items-center gap-1 text-[8px] font-mono text-black/50 mt-1 uppercase font-bold">
              <AlertCircle size={9} />
              <span>Showing Fallback Grind Heatmap. Link GitHub for actual commit activity.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
