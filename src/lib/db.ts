import { supabase } from './supabase';
import { 
  Profile, Task, TaskCategory, TaskCompletion, DSASession, 
  PlacementProgress, Streak, Penalty, Activity, WeeklyReport, UserStats 
} from './types';
import { MOCK_PROFILES, getMockTasks, MOCK_STREAKS, MOCK_PROGRESS, MOCK_DSA_SESSIONS, MOCK_PENALTIES, MOCK_ACTIVITIES } from './mockData';

// Fallback BroadcastChannel for local realtime sync between tabs
const bc = typeof window !== 'undefined' ? new BroadcastChannel('placement_dashboard_realtime') : null;

// Helper to format date as YYYY-MM-DD
export const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// LocalStorage Keys
const KEYS = {
  PROFILES: 'pd_profiles',
  TASKS: 'pd_tasks',
  COMPLETIONS: 'pd_completions',
  DSA_SESSIONS: 'pd_dsa_sessions',
  PROGRESS: 'pd_progress',
  STREAKS: 'pd_streaks',
  PENALTIES: 'pd_penalties',
  ACTIVITIES: 'pd_activities',
  WEEKLY_REPORTS: 'pd_weekly_reports',
  LAST_PENALTY_CHECK: 'pd_last_penalty_check',
};

// Local Storage Driver Helper
class LocalStorageDriver {
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    const item = localStorage.getItem(key);
    if (!item) {
      this.set(key, defaultValue);
      return defaultValue;
    }
    try {
      return JSON.parse(item);
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
    // Notify other tabs
    bc?.postMessage({ type: 'UPDATE', key });
  }

  // Initialize store with mock data if empty
  init() {
    this.get(KEYS.PROFILES, MOCK_PROFILES);
    this.get(KEYS.STREAKS, MOCK_STREAKS);
    this.get(KEYS.PROGRESS, MOCK_PROGRESS);
    this.get(KEYS.DSA_SESSIONS, MOCK_DSA_SESSIONS);
    this.get(KEYS.PENALTIES, MOCK_PENALTIES);
    this.get(KEYS.ACTIVITIES, MOCK_ACTIVITIES);
    
    // Seed tasks only for today, no completions. Completely empty/dynamic starting state!
    const today = new Date();
    const dateStr = getLocalDateString(today);
    const tasks = this.get<Task[]>(KEYS.TASKS, []);
    if (tasks.length === 0) {
      const todayTasks = getMockTasks(dateStr);
      this.set(KEYS.TASKS, todayTasks);
      this.set(KEYS.COMPLETIONS, []);
    }
  }

  // Dynamic Streak & Consistency Recalculator
  async recalculateStreakAndConsistency(userId: string): Promise<Streak> {
    const tasks = this.get<Task[]>(KEYS.TASKS, []);
    const completions = this.get<TaskCompletion[]>(KEYS.COMPLETIONS, []);
    const streaks = this.get<Record<string, Streak>>(KEYS.STREAKS, MOCK_STREAKS);
    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    const profile = profiles.find(p => p.id === userId);
    
    if (!profile) {
      return { user_id: userId, current_streak: 0, longest_streak: 0, weekly_consistency: 0 };
    }

    // 1. Calculate Weekly Consistency (Last 7 days, including today)
    const today = new Date();
    let totalAssigned = 0;
    let totalCompleted = 0;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(d);
      
      const dayTasks = tasks.filter(t => t.date === dateStr && (t.assign_to === 'both' || t.assign_to === profile.username));
      dayTasks.forEach(t => {
        totalAssigned++;
        const comp = completions.find(c => c.task_id === t.id && c.user_id === userId);
        if (comp?.completed) {
          totalCompleted++;
        }
      });
    }
    const weeklyConsistency = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    // 2. Calculate Active Streak (backtracking day-by-day starting from yesterday)
    let currentStreak = 0;
    let dayOffset = 1; // Start with yesterday
    let streakBroken = false;
    
    while (!streakBroken) {
      const checkDate = new Date();
      checkDate.setDate(today.getDate() - dayOffset);
      const dateStr = getLocalDateString(checkDate);
      
      const dayTasks = tasks.filter(t => t.date === dateStr && (t.assign_to === 'both' || t.assign_to === profile.username));
      
      if (dayTasks.length === 0) {
        // No tasks on this day (e.g. rest day). Skip it without breaking the streak!
        dayOffset++;
        if (dayOffset > 90) break; // safety cap
        continue;
      }
      
      // Check if all assigned tasks on this day were completed
      const dayCompletions = completions.filter(c => {
        const taskObj = tasks.find(t => t.id === c.task_id);
        return taskObj?.date === dateStr && c.user_id === userId && c.completed;
      });
      
      if (dayCompletions.length === dayTasks.length && dayTasks.length > 0) {
        currentStreak++;
        dayOffset++;
      } else {
        // Streak is broken
        streakBroken = true;
      }
    }
    
    // Check today: if today has tasks, and they are ALL completed, today counts in the active streak!
    const todayStr = getLocalDateString(today);
    const todayTasks = tasks.filter(t => t.date === todayStr && (t.assign_to === 'both' || t.assign_to === profile.username));
    if (todayTasks.length > 0) {
      const todayCompletions = completions.filter(c => {
        const taskObj = tasks.find(t => t.id === c.task_id);
        return taskObj?.date === todayStr && c.user_id === userId && c.completed;
      });
      if (todayCompletions.length === todayTasks.length) {
        currentStreak++;
      }
    }

    const userStreak = streaks[userId] || { user_id: userId, current_streak: 0, longest_streak: 0, weekly_consistency: 0 };
    const newLongest = Math.max(userStreak.longest_streak || 0, currentStreak);
    
    const updated: Streak = {
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: newLongest,
      weekly_consistency: weeklyConsistency,
      last_active_date: currentStreak > 0 ? getLocalDateString() : userStreak.last_active_date,
    };
    
    streaks[userId] = updated;
    this.set(KEYS.STREAKS, streaks);
    return updated;
  }

  // Profiles
  async getProfiles(): Promise<Profile[]> {
    return this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
  }

  // Tasks
  async getTasks(date: string): Promise<Task[]> {
    const all = this.get<Task[]>(KEYS.TASKS, []);
    const filtered = all.filter(t => t.date === date);
    if (filtered.length === 0 && date === getLocalDateString()) {
      const todayTasks = getMockTasks(date);
      all.push(...todayTasks);
      this.set(KEYS.TASKS, all);
      return todayTasks;
    }
    return filtered;
  }

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const all = this.get<Task[]>(KEYS.TASKS, []);
    const newTask: Task = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };
    all.push(newTask);
    this.set(KEYS.TASKS, all);
    
    await this.addActivity(
      task.created_by || '11111111-1111-1111-1111-111111111111', 
      'task_completed', 
      `Created task: "${task.title}" assigned to ${task.assign_to}`
    );

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    for (const p of profiles) {
      await this.recalculateStreakAndConsistency(p.id);
    }

    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const all = this.get<Task[]>(KEYS.TASKS, []);
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    all[idx] = { ...all[idx], ...updates };
    this.set(KEYS.TASKS, all);

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    for (const p of profiles) {
      await this.recalculateStreakAndConsistency(p.id);
    }

    return all[idx];
  }

  async deleteTask(id: string): Promise<void> {
    const all = this.get<Task[]>(KEYS.TASKS, []);
    const filtered = all.filter(t => t.id !== id);
    this.set(KEYS.TASKS, filtered);

    const completions = this.get<TaskCompletion[]>(KEYS.COMPLETIONS, []);
    const filteredCompletions = completions.filter(c => c.task_id !== id);
    this.set(KEYS.COMPLETIONS, filteredCompletions);

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    for (const p of profiles) {
      await this.recalculateStreakAndConsistency(p.id);
    }
  }

  // Task Completions
  async getTaskCompletions(date: string): Promise<TaskCompletion[]> {
    const tasks = await this.getTasks(date);
    const taskIds = tasks.map(t => t.id);
    const completions = this.get<TaskCompletion[]>(KEYS.COMPLETIONS, []);
    return completions.filter(c => taskIds.includes(c.task_id));
  }

  async toggleTaskCompletion(taskId: string, userId: string, completed: boolean): Promise<TaskCompletion> {
    const completions = this.get<TaskCompletion[]>(KEYS.COMPLETIONS, []);
    const idx = completions.findIndex(c => c.task_id === taskId && c.user_id === userId);
    
    const tasks = this.get<Task[]>(KEYS.TASKS, []);
    const task = tasks.find(t => t.id === taskId);
    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    const profile = profiles.find(p => p.id === userId);

    let result: TaskCompletion;
    if (idx === -1) {
      result = {
        id: `tc-${taskId}-${userId}`,
        task_id: taskId,
        user_id: userId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      };
      completions.push(result);
    } else {
      completions[idx].completed = completed;
      completions[idx].completed_at = completed ? new Date().toISOString() : null;
      result = completions[idx];
    }
    
    this.set(KEYS.COMPLETIONS, completions);

    if (completed && task && profile) {
      await this.addActivity(
        userId, 
        'task_completed', 
        `${profile.display_name} completed task: ${task.title}`
      );
    }

    await this.recalculateStreakAndConsistency(userId);

    return result;
  }

  // DSA Sessions
  async getDSASessions(userId?: string): Promise<DSASession[]> {
    const all = this.get<DSASession[]>(KEYS.DSA_SESSIONS, MOCK_DSA_SESSIONS);
    if (userId) return all.filter(s => s.user_id === userId);
    return all;
  }

  async addDSASession(session: Omit<DSASession, 'id' | 'created_at'>): Promise<DSASession> {
    const all = this.get<DSASession[]>(KEYS.DSA_SESSIONS, []);
    const newSession: DSASession = {
      ...session,
      id: `session-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    all.push(newSession);
    this.set(KEYS.DSA_SESSIONS, all);

    const progress = this.get<Record<string, PlacementProgress>>(KEYS.PROGRESS, MOCK_PROGRESS);
    if (progress[session.user_id]) {
      progress[session.user_id].leetcode_easy_offset += session.difficulty_easy;
      progress[session.user_id].leetcode_medium_offset += session.difficulty_medium;
      progress[session.user_id].leetcode_hard_offset += session.difficulty_hard;
      this.set(KEYS.PROGRESS, progress);
    }

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    const profile = profiles.find(p => p.id === session.user_id);
    if (profile) {
      await this.addActivity(
        session.user_id,
        'dsa_session_added',
        `${profile.display_name} logged DSA Journal: Study of ${session.topic} (${session.questions_count} questions solved)`
      );
    }

    return newSession;
  }

  // Placement Progress
  async getPlacementProgress(userId: string): Promise<PlacementProgress> {
    const progress = this.get<Record<string, PlacementProgress>>(KEYS.PROGRESS, MOCK_PROGRESS);
    return progress[userId] || {
      user_id: userId,
      current_topic: 'DSA Basics',
      topics_completed: [],
      upcoming_topics: [],
      interview_prep_progress: 0,
      leetcode_easy_offset: 0,
      leetcode_medium_offset: 0,
      leetcode_hard_offset: 0
    };
  }

  async updatePlacementProgress(userId: string, updates: Partial<PlacementProgress>): Promise<PlacementProgress> {
    const progress = this.get<Record<string, PlacementProgress>>(KEYS.PROGRESS, MOCK_PROGRESS);
    if (!progress[userId]) {
      progress[userId] = {
        user_id: userId,
        current_topic: 'DSA Basics',
        topics_completed: [],
        upcoming_topics: [],
        interview_prep_progress: 0,
        leetcode_easy_offset: 0,
        leetcode_medium_offset: 0,
        leetcode_hard_offset: 0
      };
    }
    progress[userId] = { ...progress[userId], ...updates };
    this.set(KEYS.PROGRESS, progress);

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    const profile = profiles.find(p => p.id === userId);
    
    if (updates.topics_completed && profile) {
      const completedTopic = updates.topics_completed[updates.topics_completed.length - 1];
      if (completedTopic) {
        await this.addActivity(
          userId,
          'topic_completed',
          `${profile.display_name} completed topic milestone: "${completedTopic}"`
        );
      }
    }

    return progress[userId];
  }

  // Streaks
  async getStreaks(): Promise<Record<string, Streak>> {
    const profiles = await this.getProfiles();
    for (const p of profiles) {
      await this.recalculateStreakAndConsistency(p.id);
    }
    return this.get<Record<string, Streak>>(KEYS.STREAKS, MOCK_STREAKS);
  }

  async updateStreak(userId: string, updates: Partial<Streak>): Promise<Streak> {
    const streaks = this.get<Record<string, Streak>>(KEYS.STREAKS, MOCK_STREAKS);
    if (!streaks[userId]) {
      streaks[userId] = {
        user_id: userId,
        current_streak: 0,
        longest_streak: 0,
        weekly_consistency: 0,
        last_active_date: null
      };
    }
    streaks[userId] = { ...streaks[userId], ...updates };
    this.set(KEYS.STREAKS, streaks);
    return streaks[userId];
  }

  // Penalties
  async getPenalties(userId?: string): Promise<Penalty[]> {
    const all = this.get<Penalty[]>(KEYS.PENALTIES, MOCK_PENALTIES);
    if (userId) return all.filter(p => p.user_id === userId);
    return all;
  }

  async addPenalty(penalty: Omit<Penalty, 'id' | 'created_at'>): Promise<Penalty> {
    const all = this.get<Penalty[]>(KEYS.PENALTIES, []);
    const newPenalty: Penalty = {
      ...penalty,
      id: `penalty-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    all.push(newPenalty);
    this.set(KEYS.PENALTIES, all);

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    const profile = profiles.find(p => p.id === penalty.user_id);
    if (profile) {
      await this.addActivity(
        penalty.user_id,
        'penalty_incurred',
        `⚠️ Penalty issued to ${profile.display_name}: "${penalty.description}" (${penalty.penalty_value})`
      );
    }

    return newPenalty;
  }

  async resolvePenalty(penaltyId: string): Promise<Penalty> {
    const all = this.get<Penalty[]>(KEYS.PENALTIES, []);
    const idx = all.findIndex(p => p.id === penaltyId);
    if (idx === -1) throw new Error('Penalty not found');
    all[idx].status = 'resolved';
    all[idx].resolved_at = new Date().toISOString();
    this.set(KEYS.PENALTIES, all);

    const profiles = this.get<Profile[]>(KEYS.PROFILES, MOCK_PROFILES);
    const profile = profiles.find(p => p.id === all[idx].user_id);
    if (profile) {
      await this.addActivity(
        all[idx].user_id,
        'penalty_resolved',
        `✅ ${profile.display_name} resolved penalty: "${all[idx].description}"`
      );
    }

    return all[idx];
  }

  // Activities
  async getActivities(limit: number = 20): Promise<Activity[]> {
    const all = this.get<Activity[]>(KEYS.ACTIVITIES, MOCK_ACTIVITIES);
    return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
  }

  async addActivity(userId: string, activityType: string, description: string, metadata?: any): Promise<Activity> {
    const all = this.get<Activity[]>(KEYS.ACTIVITIES, []);
    const newAct: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      activity_type: activityType as ActivityType,
      description,
      metadata,
      created_at: new Date().toISOString()
    };
    all.push(newAct);
    this.set(KEYS.ACTIVITIES, all.slice(-100)); // cap at 100 entries
    return newAct;
  }

  // Weekly Reports
  async getWeeklyReports(userId: string): Promise<WeeklyReport[]> {
    return this.get<WeeklyReport[]>(KEYS.WEEKLY_REPORTS, []).filter(r => r.user_id === userId);
  }

  async generateWeeklyReport(userId: string, weekStartDate: string): Promise<WeeklyReport> {
    const startDate = new Date(weekStartDate);
    const dsaSessions = await this.getDSASessions(userId);
    const tasks = this.get<Task[]>(KEYS.TASKS, []);
    const completions = this.get<TaskCompletion[]>(KEYS.COMPLETIONS, []);

    const weekSessions = dsaSessions.filter(s => {
      const sDate = new Date(s.date);
      const diffTime = sDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < 7;
    });

    let totalStudyTime = 0;
    let questionsSolved = 0;
    const topics: string[] = [];

    weekSessions.forEach(s => {
      totalStudyTime += s.time_spent;
      questionsSolved += s.questions_count;
      if (!topics.includes(s.topic)) topics.push(s.topic);
    });

    const hours = Number((totalStudyTime / 60).toFixed(1));

    let completedCount = 0;
    let totalCount = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);
      const dateStr = getLocalDateString(dayDate);
      const dayTasks = tasks.filter(t => t.date === dateStr && (t.assign_to === 'both' || t.assign_to === (userId === '11111111-1111-1111-1111-111111111111' ? 'rohit' : 'rishit')));
      
      if (dayTasks.length > 0) {
        dayTasks.forEach(t => {
          const comp = completions.find(c => c.task_id === t.id && c.user_id === userId);
          if (comp?.completed) completedCount++;
          totalCount++;
        });
      }
    }

    const consistency = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const suggestions: string[] = [];
    if (consistency < 80) suggestions.push("Focus on completing daily planner objectives, especially during mid-week slumps.");
    if (hours < 10) suggestions.push("Increase daily DSA Grind hours. Target at least 2 hours of focused coding per day.");
    if (questionsSolved < 10) suggestions.push("Solve more medium/hard problems on Leetcode to build confidence on complex data structures.");
    if (suggestions.length === 0) suggestions.push("Incredible consistency! Maintain this speed. Introduce mock test simulations this week.");

    const reports = this.get<WeeklyReport[]>(KEYS.WEEKLY_REPORTS, []);
    const existingIndex = reports.findIndex(r => r.user_id === userId && r.week_start_date === weekStartDate);

    const report: WeeklyReport = {
      id: existingIndex === -1 ? `wr-${Date.now()}` : reports[existingIndex].id,
      user_id: userId,
      week_start_date: weekStartDate,
      study_hours: hours,
      questions_solved: questionsSolved,
      topics_covered: topics,
      consistency_score: consistency,
      improvement_suggestions: suggestions,
    };

    if (existingIndex === -1) {
      reports.push(report);
    } else {
      reports[existingIndex] = report;
    }
    
    this.set(KEYS.WEEKLY_REPORTS, reports);
    return report;
  }

  // Stats compiler
  async getUserStats(userId: string, dateStr: string): Promise<UserStats> {
    const streak = await this.recalculateStreakAndConsistency(userId);
    const progress = await this.getPlacementProgress(userId);
    const allTasks = await this.getTasks(dateStr);
    const profiles = await this.getProfiles();
    const profile = profiles.find(p => p.id === userId) || MOCK_PROFILES[0];
    
    const assignedTasks = allTasks.filter(t => t.assign_to === 'both' || t.assign_to === profile.username);
    const completions = await this.getTaskCompletions(dateStr);
    const userCompletions = completions.filter(c => c.user_id === userId && c.completed);
    
    const sessions = await this.getDSASessions(userId);
    const todaySessions = sessions.filter(s => s.date === dateStr);
    
    const studyHoursToday = todaySessions.reduce((acc, s) => acc + s.time_spent, 0) / 60;
    const questionsToday = todaySessions.reduce((acc, s) => acc + s.questions_count, 0);

    return {
      profile,
      streak,
      progress,
      tasksCompletedToday: userCompletions.length,
      totalTasksToday: assignedTasks.length,
      studyHoursToday: Number(studyHoursToday.toFixed(1)),
      questionsToday
    };
  }
}

const localDriver = new LocalStorageDriver();
if (typeof window !== 'undefined') {
  localDriver.init();
}

// MAIN EXPORTED SERVICE WITH TRY-CATCH FALLBACKS
export const dbService = {
  isSupabase() {
    return !!supabase;
  },

  async recalculateStreakAndConsistency(userId: string): Promise<Streak> {
    return localDriver.recalculateStreakAndConsistency(userId);
  },

  // Profiles
  async getProfiles(): Promise<Profile[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error("No profiles seeded in Supabase");
        return data;
      } catch (err) {
        console.warn("Supabase profiles query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getProfiles();
  },

  // Tasks
  async getTasks(date: string): Promise<Task[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').select('*').eq('date', date);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Supabase tasks query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getTasks(date);
  },

  async createTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').insert([task]).select().single();
        if (error) throw error;
        
        await this.addActivity(
          task.created_by || '11111111-1111-1111-1111-111111111111', 
          'task_completed', 
          `Created task: "${task.title}" assigned to ${task.assign_to}`
        );

        const profiles = await this.getProfiles();
        for (const p of profiles) {
          await this.recalculateStreakAndConsistency(p.id);
        }
        
        return data;
      } catch (err) {
        console.warn("Supabase task creation failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.createTask(task);
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn("Supabase task update failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.updateTask(id, updates);
  },

  async deleteTask(id: string): Promise<void> {
    if (supabase) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return;
      } catch (err) {
        console.warn("Supabase task deletion failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.deleteTask(id);
  },

  // Task Completions
  async getTaskCompletions(date: string): Promise<TaskCompletion[]> {
    if (supabase) {
      try {
        const tasks = await this.getTasks(date);
        const ids = tasks.map(t => t.id);
        if (ids.length === 0) return [];
        const { data, error } = await supabase.from('task_completions').select('*').in('task_id', ids);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Supabase task completions query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getTaskCompletions(date);
  },

  async toggleTaskCompletion(taskId: string, userId: string, completed: boolean): Promise<TaskCompletion> {
    if (supabase) {
      try {
        const { data: existing } = await supabase.from('task_completions').select('*').eq('task_id', taskId).eq('user_id', userId);
        let result;
        if (existing && existing.length > 0) {
          const { data, error } = await supabase.from('task_completions')
            .update({ completed, completed_at: completed ? new Date().toISOString() : null })
            .eq('task_id', taskId).eq('user_id', userId).select().single();
          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await supabase.from('task_completions')
            .insert([{ task_id: taskId, user_id: userId, completed, completed_at: completed ? new Date().toISOString() : null }])
            .select().single();
          if (error) throw error;
          result = data;
        }

        if (completed) {
          const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
          const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
          if (task && profile) {
            await this.addActivity(
              userId, 
              'task_completed', 
              `${profile.display_name} completed task: ${task.title}`
            );
          }
        }
        await this.recalculateStreakAndConsistency(userId);
        return result;
      } catch (err) {
        console.warn("Supabase toggle completion failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.toggleTaskCompletion(taskId, userId, completed);
  },

  // DSA Sessions
  async getDSASessions(userId?: string): Promise<DSASession[]> {
    if (supabase) {
      try {
        let query = supabase.from('dsa_sessions').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Supabase DSA sessions query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getDSASessions(userId);
  },

  async addDSASession(session: Omit<DSASession, 'id' | 'created_at'>): Promise<DSASession> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('dsa_sessions').insert([session]).select().single();
        if (error) throw error;

        const { data: currentProg } = await supabase.from('placement_progress').select('*').eq('user_id', session.user_id).single();
        if (currentProg) {
          await supabase.from('placement_progress').update({
            leetcode_easy_offset: currentProg.leetcode_easy_offset + session.difficulty_easy,
            leetcode_medium_offset: currentProg.leetcode_medium_offset + session.difficulty_medium,
            leetcode_hard_offset: currentProg.leetcode_hard_offset + session.difficulty_hard,
          }).eq('user_id', session.user_id);
        }

        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', session.user_id).single();
        if (profile) {
          await this.addActivity(
            session.user_id,
            'dsa_session_added',
            `${profile.display_name} logged DSA Journal: Study of ${session.topic} (${session.questions_count} questions solved)`
          );
        }
        return data;
      } catch (err) {
        console.warn("Supabase add DSA session failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.addDSASession(session);
  },

  // Placement Progress
  async getPlacementProgress(userId: string): Promise<PlacementProgress> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('placement_progress').select('*').eq('user_id', userId).single();
        if (error && error.code === 'PGRST116') {
          const defaultProg = {
            user_id: userId,
            current_topic: 'DSA Basics',
            topics_completed: [],
            upcoming_topics: [],
            interview_prep_progress: 0,
            leetcode_easy_offset: 0,
            leetcode_medium_offset: 0,
            leetcode_hard_offset: 0
          };
          const { data: created } = await supabase.from('placement_progress').insert([defaultProg]).select().single();
          return created || defaultProg;
        }
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn("Supabase progress query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getPlacementProgress(userId);
  },

  async updatePlacementProgress(userId: string, updates: Partial<PlacementProgress>): Promise<PlacementProgress> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('placement_progress').update(updates).eq('user_id', userId).select().single();
        if (error) throw error;

        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
        if (updates.topics_completed && profile) {
          const completedTopic = updates.topics_completed[updates.topics_completed.length - 1];
          if (completedTopic) {
            await this.addActivity(
              userId,
              'topic_completed',
              `${profile.display_name} completed topic milestone: "${completedTopic}"`
            );
          }
        }
        return data;
      } catch (err) {
        console.warn("Supabase progress update failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.updatePlacementProgress(userId, updates);
  },

  // Streaks
  async getStreaks(): Promise<Record<string, Streak>> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('streaks').select('*');
        if (error) throw error;
        const res: Record<string, Streak> = {};
        data?.forEach(s => { res[s.user_id] = s; });
        return res;
      } catch (err) {
        console.warn("Supabase streaks query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getStreaks();
  },

  async updateStreak(userId: string, updates: Partial<Streak>): Promise<Streak> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('streaks').update(updates).eq('user_id', userId).select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn("Supabase streak update failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.updateStreak(userId, updates);
  },

  // Penalties
  async getPenalties(userId?: string): Promise<Penalty[]> {
    if (supabase) {
      try {
        let query = supabase.from('penalties').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Supabase penalties query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getPenalties(userId);
  },

  async addPenalty(penalty: Omit<Penalty, 'id' | 'created_at'>): Promise<Penalty> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('penalties').insert([penalty]).select().single();
        if (error) throw error;
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', penalty.user_id).single();
        if (profile) {
          await this.addActivity(
            penalty.user_id,
            'penalty_incurred',
            `⚠️ Penalty issued to ${profile.display_name}: "${penalty.description}" (${penalty.penalty_value})`
          );
        }
        return data;
      } catch (err) {
        console.warn("Supabase add penalty failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.addPenalty(penalty);
  },

  async resolvePenalty(penaltyId: string): Promise<Penalty> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('penalties')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('id', penaltyId).select().single();
        if (error) throw error;
        
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', data.user_id).single();
        if (profile) {
          await this.addActivity(
            data.user_id,
            'penalty_resolved',
            `✅ ${profile.display_name} resolved penalty: "${data.description}"`
          );
        }
        return data;
      } catch (err) {
        console.warn("Supabase resolve penalty failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.resolvePenalty(penaltyId);
  },

  // Activities
  async getActivities(limit: number = 20): Promise<Activity[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Supabase activities query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getActivities(limit);
  },

  async addActivity(userId: string, activityType: string, description: string, metadata?: any): Promise<Activity> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('activities')
          .insert([{ user_id: userId, activity_type: activityType, description, metadata }])
          .select().single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn("Supabase add activity failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.addActivity(userId, activityType, description, metadata);
  },

  // Weekly Reports
  async getWeeklyReports(userId: string): Promise<WeeklyReport[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('weekly_reports').select('*').eq('user_id', userId);
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn("Supabase weekly reports query failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getWeeklyReports(userId);
  },

  async generateWeeklyReport(userId: string, weekStartDate: string): Promise<WeeklyReport> {
    if (supabase) {
      try {
        const startDate = new Date(weekStartDate);
        const { data: sessions } = await supabase.from('dsa_sessions').select('*').eq('user_id', userId);
        const { data: allTasks } = await supabase.from('tasks').select('*');
        
        const weekSessions = (sessions || []).filter(s => {
          const sDate = new Date(s.date);
          const diffTime = sDate.getTime() - startDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays < 7;
        });

        let totalStudyTime = 0;
        let questionsSolved = 0;
        const topics: string[] = [];

        weekSessions.forEach(s => {
          totalStudyTime += s.time_spent;
          questionsSolved += s.questions_count;
          if (!topics.includes(s.topic)) topics.push(s.topic);
        });

        const hours = Number((totalStudyTime / 60).toFixed(1));

        let completedCount = 0;
        let totalCount = 0;

        for (let i = 0; i < 7; i++) {
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + i);
          const dateStr = getLocalDateString(dayDate);
          const dayTasks = (allTasks || []).filter(t => t.date === dateStr && (t.assign_to === 'both' || t.assign_to === (userId === '11111111-1111-1111-1111-111111111111' ? 'rohit' : 'rishit')));
          
          if (dayTasks.length > 0) {
            const taskIds = dayTasks.map(t => t.id);
            const { data: comps } = await supabase.from('task_completions').select('*').in('task_id', taskIds).eq('user_id', userId).eq('completed', true);
            completedCount += comps?.length || 0;
            totalCount += dayTasks.length;
          }
        }

        const consistency = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        const suggestions: string[] = [];
        if (consistency < 80) suggestions.push("Focus on completing daily planner objectives, especially during mid-week slumps.");
        if (hours < 10) suggestions.push("Increase daily DSA Grind hours. Target at least 2 hours of focused coding per day.");
        if (questionsSolved < 10) suggestions.push("Solve more medium/hard problems on Leetcode to build confidence on complex data structures.");
        if (suggestions.length === 0) suggestions.push("Incredible consistency! Maintain this speed. Introduce mock test simulations this week.");

        const reportPayload = {
          user_id: userId,
          week_start_date: weekStartDate,
          study_hours: hours,
          questions_solved: questionsSolved,
          topics_covered: topics,
          consistency_score: consistency,
          improvement_suggestions: suggestions,
        };

        const { data: existing } = await supabase.from('weekly_reports').select('id').eq('user_id', userId).eq('week_start_date', weekStartDate);
        let report;
        if (existing && existing.length > 0) {
          const { data, error } = await supabase.from('weekly_reports').update(reportPayload).eq('id', existing[0].id).select().single();
          if (error) throw error;
          report = data;
        } else {
          const { data, error } = await supabase.from('weekly_reports').insert([reportPayload]).select().single();
          if (error) throw error;
          report = data;
        }
        return report;
      } catch (err) {
        console.warn("Supabase generate report failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.generateWeeklyReport(userId, weekStartDate);
  },

  async checkAndGeneratePenalties(): Promise<void> {
    if (typeof window === 'undefined') return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const lastCheck = localStorage.getItem(KEYS.LAST_PENALTY_CHECK);
    if (lastCheck === yesterdayStr) {
      return;
    }

    try {
      const profiles = await this.getProfiles();
      const yesterdayTasks = await this.getTasks(yesterdayStr);
      
      if (yesterdayTasks.length === 0) {
        localStorage.setItem(KEYS.LAST_PENALTY_CHECK, yesterdayStr);
        return;
      }

      const completions = await this.getTaskCompletions(yesterdayStr);

      for (const profile of profiles) {
        const userTasks = yesterdayTasks.filter(t => t.assign_to === 'both' || t.assign_to === profile.username);
        
        for (const task of userTasks) {
          const comp = completions.find(c => c.task_id === task.id && c.user_id === profile.id);
          const isCompleted = comp ? comp.completed : false;

          if (!isCompleted) {
            const activePenalties = await this.getPenalties(profile.id);
            const hasPenalty = activePenalties.some(p => p.description.includes(task.title) && p.date_incurred === yesterdayStr);

            if (!hasPenalty) {
              let penaltyVal = '';
              let penaltyType = 'custom';
              
              if (task.category === 'DSA') {
                penaltyVal = '2 extra LeetCode questions next session';
                penaltyType = 'dsa_miss';
              } else if (task.category === 'CS Fundamentals') {
                penaltyVal = '1 extra CS Fundamentals topic next study session';
                penaltyType = 'cs_miss';
              } else if (task.category === 'Gym') {
                penaltyVal = '20 extra minutes next gym session';
                penaltyType = 'gym_miss';
              } else {
                continue;
              }

              await this.addPenalty({
                user_id: profile.id,
                penalty_type: penaltyType as any,
                description: `Failed task: "${task.title}" on ${yesterdayStr}`,
                penalty_value: penaltyVal,
                status: 'pending',
                date_incurred: yesterdayStr
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase auto penalties checker failed, falling back to LocalStorage:", err);
      // Run checker in local storage
      const profiles = await localDriver.getProfiles();
      const yesterdayTasks = await localDriver.getTasks(yesterdayStr);
      if (yesterdayTasks.length > 0) {
        const completions = await localDriver.getTaskCompletions(yesterdayStr);
        for (const profile of profiles) {
          const userTasks = yesterdayTasks.filter(t => t.assign_to === 'both' || t.assign_to === profile.username);
          for (const task of userTasks) {
            const comp = completions.find(c => c.task_id === task.id && c.user_id === profile.id);
            const isCompleted = comp ? comp.completed : false;
            if (!isCompleted) {
              const activePenalties = await localDriver.getPenalties(profile.id);
              const hasPenalty = activePenalties.some(p => p.description.includes(task.title) && p.date_incurred === yesterdayStr);
              if (!hasPenalty) {
                let penaltyVal = '';
                let penaltyType = 'custom';
                if (task.category === 'DSA') {
                  penaltyVal = '2 extra LeetCode questions next session';
                  penaltyType = 'dsa_miss';
                } else if (task.category === 'CS Fundamentals') {
                  penaltyVal = '1 extra CS Fundamentals topic next study session';
                  penaltyType = 'cs_miss';
                } else if (task.category === 'Gym') {
                  penaltyVal = '20 extra minutes next gym session';
                  penaltyType = 'gym_miss';
                } else {
                  continue;
                }
                await localDriver.addPenalty({
                  user_id: profile.id,
                  penalty_type: penaltyType as any,
                  description: `Failed task: "${task.title}" on ${yesterdayStr}`,
                  penalty_value: penaltyVal,
                  status: 'pending',
                  date_incurred: yesterdayStr
                });
              }
            }
          }
        }
      }
    }

    localStorage.setItem(KEYS.LAST_PENALTY_CHECK, yesterdayStr);
  },

  async getUserStats(userId: string, dateStr: string): Promise<UserStats> {
    if (supabase) {
      try {
        const profiles = await this.getProfiles();
        const profile = profiles.find(p => p.id === userId);
        if (!profile) throw new Error("Profile not seeded in Supabase");

        const streaks = await this.getStreaks();
        const streak = streaks[userId] || { user_id: userId, current_streak: 0, longest_streak: 0, weekly_consistency: 0 };
        
        const progress = await this.getPlacementProgress(userId);
        const allTasks = await this.getTasks(dateStr);
        const assignedTasks = allTasks.filter(t => t.assign_to === 'both' || t.assign_to === profile.username);
        
        const completions = await this.getTaskCompletions(dateStr);
        const userCompletions = completions.filter(c => c.user_id === userId && c.completed);
        
        const sessions = await this.getDSASessions(userId);
        const todaySessions = sessions.filter(s => s.date === dateStr);
        
        const studyHoursToday = todaySessions.reduce((acc, s) => acc + s.time_spent, 0) / 60;
        const questionsToday = todaySessions.reduce((acc, s) => acc + s.questions_count, 0);

        return {
          profile,
          streak,
          progress,
          tasksCompletedToday: userCompletions.length,
          totalTasksToday: assignedTasks.length,
          studyHoursToday: Number(studyHoursToday.toFixed(1)),
          questionsToday
        };
      } catch (err) {
        console.warn("Supabase getUserStats failed, falling back to LocalStorage:", err);
      }
    }
    return localDriver.getUserStats(userId, dateStr);
  }
};

// Listen to other tabs updates for localStorage realtime emulation
if (typeof window !== 'undefined') {
  bc?.addEventListener('message', (event) => {
    if (event.data?.type === 'UPDATE') {
      window.dispatchEvent(new CustomEvent('db-update', { detail: event.data.key }));
    }
  });
}
