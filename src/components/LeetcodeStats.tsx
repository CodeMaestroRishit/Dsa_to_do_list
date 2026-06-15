'use client';

import React, { useEffect, useState } from 'react';
import { Award, RefreshCw, User, Check, AlertCircle } from 'lucide-react';

interface LeetCodeApiData {
  status: string;
  message: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  acceptanceRate: number;
  ranking: number;
}

interface LeetcodeStatsProps {
  userId: string;
  localStats?: { easy: number; medium: number; hard: number; total: number };
}

export const LeetcodeStats: React.FC<LeetcodeStatsProps> = ({ userId, localStats }) => {
  const [username, setUsername] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempUsername, setTempUsername] = useState<string>('');
  const [data, setData] = useState<LeetCodeApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`pd_leetcode_username_${userId}`);
      if (stored) {
        setUsername(stored);
        setTempUsername(stored);
      }
    }
  }, [userId]);

  const fetchStats = async (user: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://leetcode-stats-api.herokuapp.com/${user}`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      } else {
        throw new Error(json.message || 'Primary API did not return success');
      }
    } catch (primaryErr) {
      console.warn('Primary LeetCode API failed, trying fallback API:', primaryErr);
      try {
        // Fetch profile details (for ranking)
        const profileRes = await fetch(`https://alfa-leetcode-api.onrender.com/${user}`);
        if (!profileRes.ok) throw new Error('Fallback profile fetch failed');
        const profileJson = await profileRes.json();

        // Fetch solved counts
        const solvedRes = await fetch(`https://alfa-leetcode-api.onrender.com/${user}/solved`);
        if (!solvedRes.ok) throw new Error('Fallback solved fetch failed');
        const solvedJson = await solvedRes.json();

        // Calculate acceptance rate from submissions
        let acceptanceRate = 0;
        interface SubmissionItem {
          difficulty: string;
          count: number;
          submissions: number;
        }
        const totalSub = solvedJson.totalSubmissionNum?.find((s: SubmissionItem) => s.difficulty === 'All')?.submissions || 0;
        const acSub = solvedJson.acSubmissionNum?.find((s: SubmissionItem) => s.difficulty === 'All')?.submissions || 0;
        if (totalSub > 0) {
          acceptanceRate = Number(((acSub / totalSub) * 100).toFixed(2));
        }

        setData({
          status: 'success',
          message: 'Success',
          totalSolved: solvedJson.solvedProblem || 0,
          easySolved: solvedJson.easySolved || 0,
          mediumSolved: solvedJson.mediumSolved || 0,
          hardSolved: solvedJson.hardSolved || 0,
          acceptanceRate: acceptanceRate,
          ranking: profileJson.ranking || 0
        });
      } catch (fallbackErr) {
        console.error('All LeetCode API requests failed:', fallbackErr);
        setError('API connection failed. Showing offline data.');
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchStats(username);
    } else {
      setData(null);
    }
  }, [username]);

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = tempUsername.trim();
    setUsername(cleanUser);
    localStorage.setItem(`pd_leetcode_username_${userId}`, cleanUser);
    setIsEditing(false);
  };

  // Aggregate local data
  const finalEasy = data ? data.easySolved : (localStats?.easy || 0);
  const finalMedium = data ? data.mediumSolved : (localStats?.medium || 0);
  const finalHard = data ? data.hardSolved : (localStats?.hard || 0);
  const finalTotal = data ? data.totalSolved : (localStats?.total || 0);
  const acceptance = data ? `${data.acceptanceRate}%` : 'N/A';
  const ranking = data ? `#${data.ranking.toLocaleString()}` : 'N/A';

  // Circular calculations
  const calculateStrokeDashOffset = (solved: number, total: number, radius: number) => {
    const circumference = 2 * Math.PI * radius;
    if (total === 0) return circumference;
    const pct = Math.min(solved / total, 1);
    return circumference - pct * circumference;
  };

  return (
    <div className="w-full bg-white border-[3px] border-black p-5 rounded-2xl glass-card flex flex-col gap-4 text-black shadow-[5px_5px_0px_#000000]">

      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-3 z-10">
        <div className="flex items-center gap-2">
          <Award className="text-black" size={18} />
          <h4 className="font-orbitron font-black text-xs uppercase text-black tracking-wider">
            LEETCODE CRITERION
          </h4>
        </div>
 
        {/* Username Configurator */}
        <div>
          {isEditing ? (
            <form onSubmit={handleSaveUsername} className="flex items-center gap-1">
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Leetcode Username"
                className="bg-white border-2 border-black rounded px-2 py-0.5 text-[10px] font-mono text-black focus:outline-none w-28 shadow-[1px_1px_0px_#000000]"
                required
              />
              <button
                type="submit"
                className="p-1 rounded-full border-2 border-black bg-black text-white hover:bg-white hover:text-black cursor-pointer shadow-[1px_1px_0px_#000000]"
                title="Save username"
              >
                <Check size={10} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-[9px] font-mono font-bold text-black border-2 border-black bg-white hover:bg-black hover:text-white transition-all cursor-pointer px-2 py-0.5 rounded-full shadow-[2px_2px_0px_#000000]"
            >
              <User size={10} />
              <span>{username ? `@${username}` : 'LINK ACCOUNT'}</span>
            </button>
          )}
        </div>
      </div>
 
      {loading ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2">
          <RefreshCw className="animate-spin text-black" size={20} />
          <span className="text-[9px] font-orbitron text-black/60 tracking-wider">CONNECTING SYNC LAYER...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4 z-10">
          {/* Main counts */}
          <div className="flex items-center justify-between gap-4">
            {/* Total Solved circle */}
            <div className="relative flex items-center justify-center w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" className="stroke-black/10" strokeWidth="6" fill="transparent" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  className="stroke-black transition-all duration-1000"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={calculateStrokeDashOffset(finalTotal, 1500, 40)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black font-orbitron text-black">{finalTotal}</span>
                <span className="text-[8px] font-bold text-black/60 uppercase tracking-widest mt-0.5">SOLVED</span>
              </div>
            </div>
 
            {/* Split breakdown */}
            <div className="flex-grow flex flex-col gap-2">
              {/* Easy */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                  <span className="text-[#34c759] font-black">EASY</span>
                  <span className="text-black font-bold">{finalEasy}</span>
                </div>
                <div className="w-full bg-neo-gray border-2 border-black h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-neo-green" style={{ width: `${Math.min((finalEasy / 300) * 100, 100)}%` }} />
                </div>
              </div>
 
              {/* Medium */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                  <span className="text-amber-500 font-black">MEDIUM</span>
                  <span className="text-black font-bold">{finalMedium}</span>
                </div>
                <div className="w-full bg-neo-gray border-2 border-black h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-neo-yellow" style={{ width: `${Math.min((finalMedium / 300) * 100, 100)}%` }} />
                </div>
              </div>
 
              {/* Hard */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                  <span className="text-rose-500 font-black">HARD</span>
                  <span className="text-black font-bold">{finalHard}</span>
                </div>
                <div className="w-full bg-neo-gray border-2 border-black h-3 rounded-full overflow-hidden">
                  <div className="h-full bg-neo-peach" style={{ width: `${Math.min((finalHard / 100) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
 
          {/* Footer stats */}
          <div className="grid grid-cols-2 gap-2 border-t-2 border-black pt-3">
            <div className="bg-neo-yellow p-2 rounded-xl border-2 border-black text-center shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-bold text-black/60 uppercase tracking-widest block">Ranking</span>
              <span className="text-xs font-black font-orbitron text-black mt-0.5 block">{ranking}</span>
            </div>
            <div className="bg-neo-blue p-2 rounded-xl border-2 border-black text-center shadow-[2px_2px_0px_#000000]">
              <span className="text-[8px] font-bold text-black/60 uppercase tracking-widest block">Acceptance</span>
              <span className="text-xs font-black font-orbitron text-black mt-0.5 block">{acceptance}</span>
            </div>
          </div>
 
          {/* Warning / Indicator */}
          {error && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-black bg-rose-200 border-2 border-black p-2.5 rounded-xl mt-1 shadow-[2px_2px_0px_#000000] uppercase">
              <AlertCircle size={10} />
              <span>{error}</span>
            </div>
          )}
          {!username && !error && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-black/50 mt-1 uppercase">
              <AlertCircle size={10} />
              <span>Showing local DSA journal logs. Link your account for live updates.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
