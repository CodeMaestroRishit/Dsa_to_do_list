export interface Profile {
  id: string;
  username: 'rohit' | 'rishit';
  display_name: string;
  avatar_url?: string | null;
  color_accent: 'yellow' | 'blue';
  created_at?: string;
}

export type TaskCategory = 'DSA' | 'Aptitude' | 'CS Fundamentals' | 'Projects' | 'Gym' | 'Personal' | 'Food' | 'Break';

export interface Task {
  id: string;
  title: string;
  start_time: string; // e.g., "10:30 AM"
  end_time: string;   // e.g., "12:00 PM"
  category: TaskCategory;
  date: string;       // YYYY-MM-DD
  assign_to: 'both' | 'rohit' | 'rishit';
  created_by?: string | null;
  created_at?: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface DSASession {
  id: string;
  user_id: string;
  topic: string;
  questions_count: number;
  leetcode_questions: string[];
  difficulty_easy: number;
  difficulty_medium: number;
  difficulty_hard: number;
  time_spent: number; // in minutes
  notes?: string | null;
  date: string;       // YYYY-MM-DD
  created_at?: string;
}

export interface PlacementProgress {
  user_id: string;
  current_topic: string;
  topics_completed: string[];
  upcoming_topics: string[];
  interview_prep_progress: number; // 0-100
  leetcode_easy_offset: number;
  leetcode_medium_offset: number;
  leetcode_hard_offset: number;
  updated_at?: string;
}

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date?: string | null;
  weekly_consistency: number; // 0-100
  updated_at?: string;
}

export type PenaltyType = 'dsa_miss' | 'cs_miss' | 'gym_miss' | 'custom';

export interface Penalty {
  id: string;
  user_id: string;
  penalty_type: PenaltyType;
  description: string;
  penalty_value: string; // e.g. "2 extra questions"
  status: 'pending' | 'resolved';
  date_incurred: string; // YYYY-MM-DD
  resolved_at?: string | null;
  created_at?: string;
}

export type ActivityType =
  | 'task_completed'
  | 'dsa_session_added'
  | 'topic_completed'
  | 'streak_milestone'
  | 'penalty_incurred'
  | 'penalty_resolved';

export interface Activity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start_date: string; // YYYY-MM-DD
  study_hours: number;
  questions_solved: number;
  topics_covered: string[];
  consistency_score: number; // 0-100
  improvement_suggestions: string[];
  created_at?: string;
}

// Combined frontend types for UI display
export interface UserStats {
  profile: Profile;
  streak: Streak;
  progress: PlacementProgress;
  tasksCompletedToday: number;
  totalTasksToday: number;
  studyHoursToday: number;
  questionsToday: number;
}

// Goals Interface
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  timeframe: 'current' | 'future';
  category: 'DSA' | 'Wellness' | 'Career' | 'Personal';
  status: 'todo' | 'in_progress' | 'completed';
  target_date?: string | null; // YYYY-MM-DD
  created_at: string;
}

// Wellness Log Interface
export interface WellnessLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  sleep_hours: number;
  sleep_quality: number; // 1-10
  water_intake: number; // Liters
  workout_done: boolean;
  meditation_minutes: number;
  mood_rating: number; // 1-10
  screen_time_hours: number;
  productivity_score: number; // 1-10
  distractions: string[]; // e.g. ["Social Media", "YouTube", "Gaming", "Sleep Deprived"]
  notes?: string | null;
  created_at?: string;
}

