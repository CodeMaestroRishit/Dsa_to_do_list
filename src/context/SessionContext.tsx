'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '@/lib/types';
import { dbService } from '@/lib/db';
import { MOCK_PROFILES } from '@/lib/mockData';

interface SessionContextType {
  activeUser: Profile | null;
  setActiveUserById: (id: string) => void;
  profiles: Profile[];
  refreshKey: number;
  triggerRefresh: () => void;
  dbMode: 'supabase' | 'local';
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeUser, setActiveUser] = useState<Profile | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('local');

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const isSb = dbService.isSupabase();
        setDbMode(isSb ? 'supabase' : 'local');
        
        const fetchedProfiles = await dbService.getProfiles();
        setProfiles(fetchedProfiles);
        
        // Load active user from localStorage or default to Rohit
        const storedActiveId = localStorage.getItem('pd_active_user_id');
        const defaultUser = fetchedProfiles.find(p => p.username === 'rohit') || fetchedProfiles[0] || MOCK_PROFILES[0];
        
        if (storedActiveId) {
          const matched = fetchedProfiles.find(p => p.id === storedActiveId);
          setActiveUser(matched || defaultUser);
        } else {
          setActiveUser(defaultUser);
          localStorage.setItem('pd_active_user_id', defaultUser.id);
        }
      } catch (err) {
        console.error('Failed to load profiles:', err);
        setProfiles(MOCK_PROFILES);
        setActiveUser(MOCK_PROFILES[0]);
      }
    };

    init();
  }, [refreshKey]);

  useEffect(() => {
    // Listen to custom db-update events (realtime cross-tab sync)
    const handleDbUpdate = () => {
      triggerRefresh();
    };

    window.addEventListener('db-update', handleDbUpdate);
    return () => {
      window.removeEventListener('db-update', handleDbUpdate);
    };
  }, []);

  const setActiveUserById = (id: string) => {
    const matched = profiles.find(p => p.id === id);
    if (matched) {
      setActiveUser(matched);
      localStorage.setItem('pd_active_user_id', id);
      triggerRefresh();
    }
  };

  return (
    <SessionContext.Provider value={{
      activeUser,
      setActiveUserById,
      profiles,
      refreshKey,
      triggerRefresh,
      dbMode
    }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
