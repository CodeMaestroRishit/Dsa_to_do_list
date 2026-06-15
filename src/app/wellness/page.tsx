'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSession } from '@/context/SessionContext';
import { dbService, getLocalDateString } from '@/lib/db';
import { WellnessLog, Goal } from '@/lib/types';
import { 
  Moon, Droplet, Dumbbell, Activity, 
  Trash2, Plus, Check, Clock, AlertTriangle, 
  CheckCircle2, Target, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WellnessPage() {
  const { refreshKey, triggerRefresh } = useSession();
  const userId = '22222222-2222-2222-2222-222222222222'; // Rishit's profile ID

  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLogForm, setShowLogForm] = useState<boolean>(false);
  const [showGoalForm, setShowGoalForm] = useState<boolean>(false);

  // Wellness Form State
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [sleepQuality, setSleepQuality] = useState<number>(7);
  const [waterIntake, setWaterIntake] = useState<number>(2.5);
  const [workoutDone, setWorkoutDone] = useState<boolean>(false);
  const [meditationMinutes, setMeditationMinutes] = useState<number>(15);
  const [moodRating, setMoodRating] = useState<number>(7);
  const [screenTimeHours, setScreenTimeHours] = useState<number>(5.5);
  const [productivityScore, setProductivityScore] = useState<number>(7);
  const [selectedDistractions, setSelectedDistractions] = useState<string[]>([]);
  const [wellnessNotes, setWellnessNotes] = useState<string>('');
  const [logDate, setLogDate] = useState<string>(getLocalDateString());

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState<string>('');
  const [goalDescription, setGoalDescription] = useState<string>('');
  const [goalTimeframe, setGoalTimeframe] = useState<'current' | 'future'>('current');
  const [goalCategory, setGoalCategory] = useState<'DSA' | 'Wellness' | 'Career' | 'Personal'>('Wellness');
  const [goalTargetDate, setGoalTargetDate] = useState<string>('');

  const distractionOptions = [
    'Social Media',
    'YouTube',
    'Gaming',
    'Cluttered Desk',
    'Procrastination',
    'Unplanned Breaks',
    'Lack of sleep',
    'No clear daily plan'
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [loadedLogs, loadedGoals] = await Promise.all([
          dbService.getWellnessLogs(userId),
          dbService.getGoals(userId)
        ]);
        setLogs(loadedLogs);
        setGoals(loadedGoals);
      } catch (err) {
        console.error('Failed to load wellness datasets:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshKey]);

  // Submit Wellness Log
  const handleLogWellness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dbService.addWellnessLog({
        user_id: userId,
        date: logDate,
        sleep_hours: Number(sleepHours),
        sleep_quality: Number(sleepQuality),
        water_intake: Number(waterIntake),
        workout_done: workoutDone,
        meditation_minutes: Number(meditationMinutes),
        mood_rating: Number(moodRating),
        screen_time_hours: Number(screenTimeHours),
        productivity_score: Number(productivityScore),
        distractions: selectedDistractions,
        notes: wellnessNotes.trim() || null
      });

      // Clear Form & Close
      setWellnessNotes('');
      setSelectedDistractions([]);
      setShowLogForm(false);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to commit wellness log:', err);
    }
  };

  // Submit Goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    try {
      await dbService.createGoal({
        user_id: userId,
        title: goalTitle.trim(),
        description: goalDescription.trim() || undefined,
        timeframe: goalTimeframe,
        category: goalCategory,
        status: 'todo',
        target_date: goalTargetDate || null
      });

      setGoalTitle('');
      setGoalDescription('');
      setGoalTargetDate('');
      setShowGoalForm(false);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  // Toggle Goal Status
  const handleToggleGoalStatus = async (goal: Goal) => {
    const nextStatusMap: Record<Goal['status'], Goal['status']> = {
      'todo': 'in_progress',
      'in_progress': 'completed',
      'completed': 'todo'
    };
    const nextStatus = nextStatusMap[goal.status];
    try {
      await dbService.updateGoal(goal.id, { status: nextStatus });
      triggerRefresh();
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await dbService.deleteGoal(id);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  // Toggle Distraction Checklist
  const handleToggleDistraction = (item: string) => {
    setSelectedDistractions(prev => 
      prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item]
    );
  };

  // Aggregate Wellness Stats
  const wellnessAverages = useMemo(() => {
    if (logs.length === 0) {
      return {
        sleep: 0,
        quality: 0,
        water: 0,
        workouts: 0,
        meditation: 0,
        mood: 0,
        screen: 0,
        productivity: 0,
        totalLogs: 0
      };
    }

    const sum = logs.reduce((acc, log) => {
      acc.sleep += log.sleep_hours;
      acc.quality += log.sleep_quality;
      acc.water += log.water_intake;
      acc.workouts += log.workout_done ? 1 : 0;
      acc.meditation += log.meditation_minutes;
      acc.mood += log.mood_rating;
      acc.screen += log.screen_time_hours;
      acc.productivity += log.productivity_score;
      return acc;
    }, { sleep: 0, quality: 0, water: 0, workouts: 0, meditation: 0, mood: 0, screen: 0, productivity: 0 });

    const count = logs.length;
    return {
      sleep: Number((sum.sleep / count).toFixed(1)),
      quality: Number((sum.quality / count).toFixed(1)),
      water: Number((sum.water / count).toFixed(1)),
      workouts: Math.round((sum.workouts / count) * 100),
      meditation: Math.round(sum.meditation / count),
      mood: Number((sum.mood / count).toFixed(1)),
      screen: Number((sum.screen / count).toFixed(1)),
      productivity: Number((sum.productivity / count).toFixed(1)),
      totalLogs: count
    };
  }, [logs]);

  // "Where Am I Lacking?" Productivity Analytics engine
  const productivityLeaks = useMemo(() => {
    if (logs.length < 2) {
      return {
        alerts: [
          'Log at least 2 days of metrics to generate productivity leak analysis and see where you are lacking behind.'
        ],
        correlations: []
      };
    }

    const alerts: string[] = [];
    const correlations: { factor: string; description: string; scoreImpact: number }[] = [];

    // Distraction Counter
    const distractionCounts: Record<string, number> = {};

    // Filter low productivity days (rating < 6)
    const lowProdLogs = logs.filter(l => l.productivity_score < 6);
    lowProdLogs.forEach(log => {
      log.distractions.forEach(d => {
        distractionCounts[d] = (distractionCounts[d] || 0) + 1;
      });
    });

    // Top Distraction Analysis
    const sortedDistractions = Object.entries(distractionCounts).sort((a, b) => b[1] - a[1]);
    if (sortedDistractions.length > 0) {
      const [topDist, frequency] = sortedDistractions[0];
      const pct = Math.round((frequency / lowProdLogs.length) * 100);
      alerts.push(`Top Leak: "${topDist}" was present in ${pct}% of your low-productivity logs. Consider isolating this blocker.`);
    }

    // Sleep Correlation
    const lowSleepLogs = logs.filter(l => l.sleep_hours < 6.5);
    const goodSleepLogs = logs.filter(l => l.sleep_hours >= 6.5);

    if (lowSleepLogs.length > 0 && goodSleepLogs.length > 0) {
      const avgLowSleepProd = lowSleepLogs.reduce((sum, l) => sum + l.productivity_score, 0) / lowSleepLogs.length;
      const avgGoodSleepProd = goodSleepLogs.reduce((sum, l) => sum + l.productivity_score, 0) / goodSleepLogs.length;
      const diff = avgGoodSleepProd - avgLowSleepProd;

      if (diff > 1) {
        alerts.push(`Sleep Deficit: Your productivity drops by ${Math.round((diff / avgGoodSleepProd) * 100)}% when getting less than 6.5 hours of sleep.`);
        correlations.push({
          factor: 'Sleep Duration',
          description: 'Productivity when sleep >= 6.5h vs sleep < 6.5h',
          scoreImpact: Number(diff.toFixed(1))
        });
      }
    }

    // Screen Time Correlation
    const highScreenLogs = logs.filter(l => l.screen_time_hours > 7);
    const lowScreenLogs = logs.filter(l => l.screen_time_hours <= 7);

    if (highScreenLogs.length > 0 && lowScreenLogs.length > 0) {
      const avgHighScreenProd = highScreenLogs.reduce((sum, l) => sum + l.productivity_score, 0) / highScreenLogs.length;
      const avgLowScreenProd = lowScreenLogs.reduce((sum, l) => sum + l.productivity_score, 0) / lowScreenLogs.length;
      const diff = avgLowScreenProd - avgHighScreenProd;

      if (diff > 1) {
        alerts.push(`Screen Exhaustion: Screen times above 7 hours drag productivity down by ${Number(diff.toFixed(1))} points on average.`);
        correlations.push({
          factor: 'High Screen Time',
          description: 'Productivity when screen <= 7h vs screen > 7h',
          scoreImpact: Number(diff.toFixed(1))
        });
      }
    }

    // General workout boost
    const workoutLogs = logs.filter(l => l.workout_done);
    const noWorkoutLogs = logs.filter(l => !l.workout_done);
    if (workoutLogs.length > 0 && noWorkoutLogs.length > 0) {
      const avgWorkoutProd = workoutLogs.reduce((sum, l) => sum + l.productivity_score, 0) / workoutLogs.length;
      const avgNoWorkoutProd = noWorkoutLogs.reduce((sum, l) => sum + l.productivity_score, 0) / noWorkoutLogs.length;
      const diff = avgWorkoutProd - avgNoWorkoutProd;

      if (diff > 0.5) {
        alerts.push(`Fitness Boost: Workouts boost your daily focus rating by ${Math.round(diff * 10)}%. Maintain physical momentum.`);
      }
    }

    if (alerts.length === 0) {
      alerts.push('Your daily metrics are consistent! Maintain current discipline and watch for distractions.');
    }

    return { alerts, correlations };
  }, [logs]);

  // Split Goals
  const currentGoals = useMemo(() => goals.filter(g => g.timeframe === 'current'), [goals]);
  const futureGoals = useMemo(() => goals.filter(g => g.timeframe === 'future'), [goals]);

  if (loading) {
    return (
      <div className="flex-grow bg-transparent flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Activity className="animate-spin text-neon-blue" size={24} />
        <span className="text-[10px] font-orbitron text-white/40 tracking-wider">SYNCING WELLNESS CORE...</span>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-transparent px-4 py-8 max-w-7xl mx-auto w-full flex flex-col gap-8 relative z-10 text-black">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b-4 border-black pb-4 gap-4">
        <div>
          <h1 className="font-orbitron font-black text-2xl tracking-wider text-black flex items-center gap-2">
            <Activity className="text-black animate-pulse" size={24} />
            <span>WELLNESS & GOALS PROTOCOL</span>
          </h1>
          <p className="text-[10px] font-bold text-black/60 uppercase tracking-widest mt-1">
            Personal wellness database, daily logs, productivity audit, and goal alignment
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowLogForm(!showLogForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-black bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide hover:bg-neo-yellow transition-all shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none select-none cursor-pointer"
          >
            <Plus size={14} />
            <span>{showLogForm ? 'Close Logger' : 'Log Wellness Today'}</span>
          </button>
          <button
            onClick={() => setShowGoalForm(!showGoalForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-black bg-white text-black font-bold text-xs font-orbitron uppercase tracking-wide transition-all select-none cursor-pointer shadow-[3px_3px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            <Target size={14} className="text-black" />
            <span>{showGoalForm ? 'Close Goal Form' : 'Add Target Goal'}</span>
          </button>
        </div>
      </div>

      {/* Form Panels Section */}
      <AnimatePresence>
        {/* Wellness Logger Form */}
        {showLogForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-[3px] border-black rounded-2xl p-6 glass-panel overflow-hidden shadow-[5px_5px_0px_#000000] text-black"
          >
            <h2 className="font-orbitron font-black text-sm tracking-wider text-black mb-4 flex items-center gap-1.5 uppercase border-b-2 border-black pb-2">
              <Moon size={16} className="text-black" />
              RECORD WELLNESS METRICS
            </h2>

            <form onSubmit={handleLogWellness} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Col 1: Sleep & Water */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Sleep Duration</span>
                    <span className="font-mono text-black font-extrabold">{sleepHours} Hours</span>
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Sleep Quality</span>
                    <span className="font-mono text-black font-extrabold">{sleepQuality}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Water Intake</span>
                    <span className="font-mono text-black font-extrabold">{waterIntake} Liters</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    step="0.25"
                    value={waterIntake}
                    onChange={(e) => setWaterIntake(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                {/* Workout Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-black shadow-[2px_2px_0px_#000000]">
                  <span className="text-[10px] font-bold text-black uppercase tracking-wide flex items-center gap-1.5">
                    <Dumbbell size={14} className="text-black" />
                    Workout Completed?
                  </span>
                  <input
                    type="checkbox"
                    checked={workoutDone}
                    onChange={(e) => setWorkoutDone(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-black bg-white text-black focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Col 2: Screen time, Mood, Focus */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Meditation / Focus Session</span>
                    <span className="font-mono text-black font-extrabold">{meditationMinutes} Mins</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={meditationMinutes}
                    onChange={(e) => setMeditationMinutes(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Mood / Mental State</span>
                    <span className="font-mono text-black font-extrabold">{moodRating}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={moodRating}
                    onChange={(e) => setMoodRating(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Screen Time (Non-Study)</span>
                    <span className="font-mono text-black font-extrabold">{screenTimeHours} Hours</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="0.5"
                    value={screenTimeHours}
                    onChange={(e) => setScreenTimeHours(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider flex justify-between">
                    <span>Productivity Score</span>
                    <span className="font-mono text-black font-extrabold">{productivityScore}/10</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={productivityScore}
                    onChange={(e) => setProductivityScore(Number(e.target.value))}
                    className="w-full h-2 bg-neo-gray border-2 border-black rounded-lg appearance-none cursor-pointer accent-black"
                  />
                </div>
              </div>

              {/* Col 3: Distractions & Date */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Productivity Blockers</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {distractionOptions.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleToggleDistraction(option)}
                        className={`px-2 py-1.5 rounded-lg text-left text-[9px] font-extrabold transition-all border-2 border-black ${
                          selectedDistractions.includes(option)
                            ? 'bg-black text-white shadow-[1px_1px_0px_#000000]'
                            : 'bg-white text-black hover:bg-neo-yellow shadow-[2px_2px_0px_#000000] active:translate-y-[1px] active:shadow-none'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Log Date</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      className="bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs text-black focus:outline-none focus:bg-neo-yellow font-mono flex-grow shadow-[1px_1px_0px_#000000]"
                      required
                    />
                    <input
                      type="text"
                      value={wellnessNotes}
                      onChange={(e) => setWellnessNotes(e.target.value)}
                      placeholder="Notes (optional)..."
                      className="bg-white border-2 border-black rounded-lg px-3 py-1.5 text-xs text-black focus:outline-none focus:bg-neo-yellow flex-grow shadow-[1px_1px_0px_#000000]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl border-2 border-black bg-neo-green text-black font-bold font-orbitron text-xs uppercase tracking-widest hover:bg-neo-green/80 shadow-[3px_3px_0px_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer mt-auto"
                >
                  COMMIT WELLNESS LOG
                </button>
              </div>

            </form>
          </motion.div>
        )}

        {/* Target Goal Creation Form */}
        {showGoalForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-[3px] border-black rounded-2xl p-6 glass-panel overflow-hidden shadow-[5px_5px_0px_#000000] text-black"
          >
            <h2 className="font-orbitron font-black text-sm tracking-wider text-black mb-4 flex items-center gap-1.5 uppercase border-b-2 border-black pb-2">
              <Target size={16} className="text-black" />
              CREATE NEW TARGET GOAL
            </h2>

            <form onSubmit={handleCreateGoal} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Goal Title</label>
                <input
                  type="text"
                  required
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Solve 50 DP medium problems"
                  className="bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:bg-neo-yellow shadow-[1px_1px_0px_#000000]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  placeholder="e.g. Focus on knapsack and LCS variants"
                  className="bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:bg-neo-yellow shadow-[1px_1px_0px_#000000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Timeframe</label>
                  <select
                    value={goalTimeframe}
                    onChange={(e) => setGoalTimeframe(e.target.value as Goal['timeframe'])}
                    className="bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:bg-neo-blue shadow-[1px_1px_0px_#000000]"
                  >
                    <option value="current">Current Goal</option>
                    <option value="future">Future Goal</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Category</label>
                  <select
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value as Goal['category'])}
                    className="bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:bg-neo-blue shadow-[1px_1px_0px_#000000]"
                  >
                    <option value="DSA">DSA Grind</option>
                    <option value="Wellness">Wellness</option>
                    <option value="Career">Career Prep</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-grow">
                  <label className="text-[10px] font-bold text-black/60 uppercase tracking-wider">Target Date</label>
                  <input
                    type="date"
                    value={goalTargetDate}
                    onChange={(e) => setGoalTargetDate(e.target.value)}
                    className="bg-white border-2 border-black rounded-lg px-3 py-2 text-xs text-black focus:outline-none focus:bg-neo-yellow shadow-[1px_1px_0px_#000000] font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl border-2 border-black bg-neo-green text-black font-bold font-orbitron text-xs uppercase tracking-wide hover:bg-neo-green/80 shadow-[2px_2px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer h-[38px]"
                >
                  SAVE
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wellness Averages Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {/* Sleep card */}
        <div className="bg-neo-blue border-[3px] border-black p-4 rounded-xl flex items-center gap-3 shadow-[4px_4px_0px_#000000] text-black">
          <div className="p-2 rounded-lg bg-white/30 text-black border border-black/10">
            <Moon size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-black/60 uppercase tracking-wider block">Sleep Avg</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black font-orbitron text-black">{wellnessAverages.sleep}</span>
              <span className="text-[9px] font-bold text-black/50">HRS</span>
              <span className="text-[9px] font-mono text-black/60">({wellnessAverages.quality}/10 Q)</span>
            </div>
          </div>
        </div>

        {/* Water card */}
        <div className="bg-neo-purple border-[3px] border-black p-4 rounded-xl flex items-center gap-3 shadow-[4px_4px_0px_#000000] text-black">
          <div className="p-2 rounded-lg bg-white/30 text-black border border-black/10">
            <Droplet size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-black/60 uppercase tracking-wider block">Hydration</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black font-orbitron text-black">{wellnessAverages.water}</span>
              <span className="text-[9px] font-bold text-black/50">LITERS</span>
            </div>
          </div>
        </div>

        {/* Workout consistency card */}
        <div className="bg-neo-peach border-[3px] border-black p-4 rounded-xl flex items-center gap-3 shadow-[4px_4px_0px_#000000] text-black">
          <div className="p-2 rounded-lg bg-white/30 text-black border border-black/10">
            <Dumbbell size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-black/60 uppercase tracking-wider block">Fitness grind</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black font-orbitron text-black">{wellnessAverages.workouts}%</span>
              <span className="text-[9px] font-bold text-black/50">CONSISTENCY</span>
            </div>
          </div>
        </div>

        {/* Productivity rating card */}
        <div className="bg-neo-yellow border-[3px] border-black p-4 rounded-xl flex items-center gap-3 shadow-[4px_4px_0px_#000000] text-black">
          <div className="p-2 rounded-lg bg-white/30 text-black border border-black/10">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-black/60 uppercase tracking-wider block">Productivity Avg</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black font-orbitron text-black">{wellnessAverages.productivity}</span>
              <span className="text-[9px] font-bold text-black/50">/10 RATING</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Lacking behind audit & Goals Kanban Board */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
        
        {/* Lacking Behind Productivity Audit Panel (Col 1) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border-[3px] border-black p-5 rounded-2xl glass-card relative overflow-hidden flex flex-col gap-4 text-black shadow-[4px_4px_0px_#000000]">
            
            <h3 className="font-orbitron font-black text-xs uppercase text-black tracking-widest flex items-center gap-2 border-b-2 border-black pb-3">
              <AlertTriangle className="text-black" size={16} />
              PRODUCTIVITY LEAKS AUDIT
            </h3>

            {/* Averages mini summary list */}
            <div className="flex flex-col gap-3 text-xs font-bold">
              <div className="flex justify-between items-center bg-neo-gray border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_#000000]">
                <span className="text-black/70">Focus Meditation Avg:</span>
                <span className="text-black font-mono font-extrabold">{wellnessAverages.meditation} mins</span>
              </div>
              <div className="flex justify-between items-center bg-neo-gray border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_#000000]">
                <span className="text-black/70">Daily Screen Time:</span>
                <span className="text-black font-mono font-extrabold">{wellnessAverages.screen} hrs</span>
              </div>
              <div className="flex justify-between items-center bg-neo-gray border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_#000000]">
                <span className="text-black/70">Mood/Energy Index:</span>
                <span className="text-black font-mono font-extrabold">{wellnessAverages.mood}/10</span>
              </div>
            </div>

            {/* Lacking Behind alerts list */}
            <div className="flex flex-col gap-3.5 mt-2">
              <span className="text-[10px] font-black text-black/60 uppercase tracking-widest">Lacking behind indicators</span>
              {productivityLeaks.alerts.map((alert, idx) => (
                <div key={idx} className="flex gap-2.5 items-start bg-rose-200 border-2 border-black p-3 rounded-xl text-xs leading-relaxed text-black font-semibold shadow-[2px_2px_0px_#000000]">
                  <div className="p-0.5 rounded bg-black text-white mt-0.5 flex-shrink-0">
                    <CheckCircle2 size={12} />
                  </div>
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Goals Board Section (Col 2 & 3) */}
        <div className="lg:col-span-2 flex flex-col gap-6 w-full">
          <div className="bg-white border-[3px] border-black p-5 rounded-2xl glass-card w-full flex flex-col gap-5 text-black shadow-[4px_4px_0px_#000000]">
            
            <h3 className="font-orbitron font-black text-xs uppercase text-black tracking-widest flex items-center gap-2 border-b-2 border-black pb-3">
              <Target className="text-black" size={16} />
              TARGET GOALS INDEX
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Column 1: Current Active Goals */}
              <div className="flex flex-col gap-4">
                <h4 className="font-orbitron font-bold text-xs uppercase text-black/60 tracking-wider flex items-center gap-1.5 border-b border-black/10 pb-1">
                  <Clock size={12} className="text-black" />
                  CURRENT GOALS (MON-SAT)
                </h4>
                
                {currentGoals.length === 0 ? (
                  <div className="text-center py-8 bg-neo-gray border-2 border-black rounded-xl text-xs font-bold text-black/40 tracking-wide shadow-[1px_1px_0px_#000000]">
                    No active short-term goals. Add one!
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {currentGoals.map(goal => (
                      <div 
                        key={goal.id} 
                        className={`bg-white border-2 border-black p-3.5 rounded-xl flex items-start justify-between gap-3 transition-all relative overflow-hidden group shadow-[2px_2px_0px_#000000] ${
                          goal.status === 'completed' ? 'border-black/30 opacity-60 shadow-none' : 'border-black'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black ${
                              goal.category === 'DSA' ? 'bg-neo-blue text-black' :
                              goal.category === 'Wellness' ? 'bg-neo-green text-black' :
                              goal.category === 'Career' ? 'bg-neo-purple text-black' :
                              'bg-neo-yellow text-black'
                            }`}>
                              {goal.category}
                            </span>
                            {goal.target_date && (
                              <span className="text-[9px] font-mono text-black/50 flex items-center gap-1 font-bold">
                                <Calendar size={10} />
                                {goal.target_date}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-bold text-black mt-1.5 leading-relaxed ${goal.status === 'completed' ? 'line-through text-black/40' : ''}`}>
                            {goal.title}
                          </span>
                          {goal.description && (
                            <span className="text-[10px] text-black/60 italic leading-relaxed">
                              &quot;{goal.description}&quot;
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleGoalStatus(goal)}
                            className={`p-1.5 rounded-lg border-2 border-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                              goal.status === 'completed'
                                ? 'bg-neo-green text-black font-bold'
                                : goal.status === 'in_progress'
                                ? 'bg-neo-yellow text-black font-bold'
                                : 'bg-white text-black/40 hover:text-black'
                            }`}
                            title={`Status: ${goal.status}. Click to advance.`}
                          >
                            <Check size={12} />
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-rose-200 hover:text-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            title="Delete goal"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Future / Long-Term Goals */}
              <div className="flex flex-col gap-4">
                <h4 className="font-orbitron font-bold text-xs uppercase text-black/60 tracking-wider flex items-center gap-1.5 border-b border-black/10 pb-1">
                  <Target size={12} className="text-black" />
                  FUTURE GOALS (LONG-TERM)
                </h4>

                {futureGoals.length === 0 ? (
                  <div className="text-center py-8 bg-neo-gray border-2 border-black rounded-xl text-xs font-bold text-black/40 tracking-wide shadow-[1px_1px_0px_#000000]">
                    No active long-term goals. Add one!
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {futureGoals.map(goal => (
                      <div 
                        key={goal.id} 
                        className={`bg-white border-2 border-black p-3.5 rounded-xl flex items-start justify-between gap-3 transition-all relative overflow-hidden group shadow-[2px_2px_0px_#000000] ${
                          goal.status === 'completed' ? 'border-black/30 opacity-60 shadow-none' : 'border-black'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-black ${
                              goal.category === 'DSA' ? 'bg-neo-blue text-black' :
                              goal.category === 'Wellness' ? 'bg-neo-green text-black' :
                              goal.category === 'Career' ? 'bg-neo-purple text-black' :
                              'bg-neo-yellow text-black'
                            }`}>
                              {goal.category}
                            </span>
                            {goal.target_date && (
                              <span className="text-[9px] font-mono text-black/50 flex items-center gap-1 font-bold">
                                <Calendar size={10} />
                                {goal.target_date}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs font-bold text-black mt-1.5 leading-relaxed ${goal.status === 'completed' ? 'line-through text-black/40' : ''}`}>
                            {goal.title}
                          </span>
                          {goal.description && (
                            <span className="text-[10px] text-black/60 italic leading-relaxed">
                              &quot;{goal.description}&quot;
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Toggle Status Button */}
                          <button
                            onClick={() => handleToggleGoalStatus(goal)}
                            className={`p-1.5 rounded-lg border-2 border-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                              goal.status === 'completed'
                                ? 'bg-neo-green text-black font-bold'
                                : goal.status === 'in_progress'
                                ? 'bg-neo-yellow text-black font-bold'
                                : 'bg-white text-black/40 hover:text-black'
                            }`}
                            title={`Status: ${goal.status}. Click to advance.`}
                          >
                            <Check size={12} />
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="p-1.5 rounded-lg bg-white border-2 border-black text-black hover:bg-rose-200 hover:text-black transition-all cursor-pointer shadow-[1px_1px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            title="Delete goal"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </section>
      
      {/* Wellness log history (Recent Logs) */}
      <section className="flex flex-col gap-4">
        <h3 className="font-orbitron font-bold text-xs uppercase text-black/60 tracking-widest flex items-center gap-1.5 border-b-2 border-black pb-2">
          <Calendar size={14} />
          WELLNESS DATABASE ENTRIES ({logs.length})
        </h3>
        
        {logs.length === 0 ? (
          <div className="bg-white border-[3px] border-black rounded-2xl py-12 text-center text-xs text-black/55 font-bold tracking-wider flex flex-col items-center gap-2 shadow-[4px_4px_0px_#000000]">
            <AlertTriangle size={20} />
            <span>NO DAILY WELLNESS METRICS COMMITTED YET.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-1.5 scrollbar-hide">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="bg-white border-[3px] border-black rounded-xl p-5 hover:translate-y-[-2px] transition-all flex flex-col gap-3 relative shadow-[4px_4px_0px_#000000] text-black"
              >
                {/* Accent indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-neo-blue border-r-2 border-black" />

                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pl-2">
                  <div className="flex items-center gap-3">
                    <span className="font-orbitron font-extrabold text-sm text-black">
                      Log: {log.date}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-black border-2 border-black bg-neo-yellow px-2 py-0.5 rounded shadow-[1px_1px_0px_#000000]">
                      PRODUCTIVITY: {log.productivity_score}/10
                    </span>
                    <span className="text-[9px] font-mono font-bold text-black border-2 border-black bg-neo-purple px-2 py-0.5 rounded shadow-[1px_1px_0px_#000000]">
                      MOOD: {log.mood_rating}/10
                    </span>
                  </div>
                  <span className="text-[10px] text-black/70 font-bold font-mono flex items-center gap-1.5">
                    <Moon size={11} /> {log.sleep_hours}h sleep ({log.sleep_quality}/10) | <Droplet size={11} /> {log.water_intake}L | Screen: {log.screen_time_hours}h
                  </span>
                </div>

                {/* Distractions tags */}
                {log.distractions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center mt-0.5 pl-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-black/50">Leaks logged:</span>
                    {log.distractions.map((dist, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] font-extrabold text-red-700 bg-rose-200 border-2 border-black px-2.5 py-0.5 rounded shadow-[1px_1px_0px_#000000]"
                      >
                        {dist}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {log.notes && (
                  <p className="text-xs text-black/80 leading-relaxed italic border-t-2 border-black/10 pt-2.5 mt-0.5 pl-2">
                    &quot;{log.notes}&quot;
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
