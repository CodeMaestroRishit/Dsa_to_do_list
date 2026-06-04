import { Profile, Task, TaskCategory, DSASession, PlacementProgress, Streak, Penalty, Activity } from './types';

export const MOCK_PROFILES: Profile[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'rohit',
    display_name: 'Rohit',
    avatar_url: null,
    color_accent: 'yellow',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'rishit',
    display_name: 'Rishit',
    avatar_url: null,
    color_accent: 'blue',
  }
];

// Seed template matching user screenshot
export const DEFAULT_DAILY_TASKS = [
  { title: 'Wake Up + Breakfast', start_time: '10:00 AM', end_time: '10:30 AM', category: 'Food' as TaskCategory },
  { title: 'DSA - Striver Study', start_time: '10:30 AM', end_time: '1:00 PM', category: 'DSA' as TaskCategory },
  { title: 'Lunch', start_time: '1:00 PM', end_time: '1:30 PM', category: 'Food' as TaskCategory },
  { title: 'DSA - LeetCode', start_time: '1:30 PM', end_time: '4:00 PM', category: 'DSA' as TaskCategory },
  { title: 'Break / Free Time', start_time: '4:00 PM', end_time: '5:00 PM', category: 'Break' as TaskCategory },
  { title: 'CS Fundamentals', start_time: '5:00 PM', end_time: '6:30 PM', category: 'CS Fundamentals' as TaskCategory },
  { title: 'Fun / Decompress', start_time: '8:30 PM', end_time: '11:00 PM', category: 'Break' as TaskCategory },
];

export const getMockTasks = (dateStr: string): Task[] => {
  return DEFAULT_DAILY_TASKS.map((t, idx) => ({
    id: `task-${dateStr}-${idx}`,
    title: t.title,
    start_time: t.start_time,
    end_time: t.end_time,
    category: t.category,
    date: dateStr,
    assign_to: 'both',
    created_at: new Date().toISOString(),
  }));
};

export const MOCK_STREAKS: Record<string, Streak> = {
  '11111111-1111-1111-1111-111111111111': {
    user_id: '11111111-1111-1111-1111-111111111111',
    current_streak: 0,
    longest_streak: 0,
    weekly_consistency: 0,
    last_active_date: null,
  },
  '22222222-2222-2222-2222-222222222222': {
    user_id: '22222222-2222-2222-2222-222222222222',
    current_streak: 0,
    longest_streak: 0,
    weekly_consistency: 0,
    last_active_date: null,
  }
};

export const MOCK_PROGRESS: Record<string, PlacementProgress> = {
  '11111111-1111-1111-1111-111111111111': {
    user_id: '11111111-1111-1111-1111-111111111111',
    current_topic: 'Arrays & Hashing',
    topics_completed: [],
    upcoming_topics: ['Two Pointers', 'Sliding Window', 'Stack', 'Binary Search', 'Linked List', 'Trees', 'Graphs', 'DP'],
    interview_prep_progress: 0,
    leetcode_easy_offset: 0,
    leetcode_medium_offset: 0,
    leetcode_hard_offset: 0,
  },
  '22222222-2222-2222-2222-222222222222': {
    user_id: '22222222-2222-2222-2222-222222222222',
    current_topic: 'Arrays & Hashing',
    topics_completed: [],
    upcoming_topics: ['Two Pointers', 'Sliding Window', 'Stack', 'Binary Search', 'Linked List', 'Trees', 'Graphs', 'DP'],
    interview_prep_progress: 0,
    leetcode_easy_offset: 0,
    leetcode_medium_offset: 0,
    leetcode_hard_offset: 0,
  }
};

export const MOCK_DSA_SESSIONS: DSASession[] = [];
export const MOCK_PENALTIES: Penalty[] = [];
export const MOCK_ACTIVITIES: Activity[] = [];
