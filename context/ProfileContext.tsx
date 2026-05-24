import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrowserProfile, ProfileStatus, SessionEntry } from '../types/profile';
import { generateFingerprint, generateProfileColor } from '../hooks/useFingerprint';

const PROFILES_KEY = '__bpm_profiles';
const SESSIONS_KEY = '__bpm_sessions';

interface ProfileContextType {
  profiles: BrowserProfile[];
  selectedProfiles: string[];
  sessions: SessionEntry[];
  loading: boolean;
  addProfile: (name: string, homepageUrl?: string, notes?: string, proxy?: string) => Promise<BrowserProfile>;
  updateProfile: (id: string, updates: Partial<BrowserProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  duplicateProfile: (id: string) => Promise<BrowserProfile | null>;
  setProfileStatus: (id: string, status: ProfileStatus) => void;
  toggleSelectProfile: (id: string) => void;
  selectAllProfiles: () => void;
  deselectAllProfiles: () => void;
  setSelectedProfiles: (ids: string[]) => void;
  addSession: (profileId: string, url: string, title: string) => Promise<void>;
  getProfileSessions: (profileId: string) => SessionEntry[];
  clearProfileSessions: (profileId: string) => Promise<void>;
  getRunningCount: () => number;
  getSuccessRate: () => number;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profilesRaw, sessionsRaw] = await Promise.all([
        AsyncStorage.getItem(PROFILES_KEY),
        AsyncStorage.getItem(SESSIONS_KEY),
      ]);
      if (profilesRaw) setProfiles(JSON.parse(profilesRaw));
      if (sessionsRaw) setSessions(JSON.parse(sessionsRaw));
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const saveProfiles = useCallback(async (updated: BrowserProfile[]) => {
    setProfiles(updated);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(updated));
  }, []);

  const saveSessions = useCallback(async (updated: SessionEntry[]) => {
    setSessions(updated);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  }, []);

  const addProfile = useCallback(async (
    name: string,
    homepageUrl = 'https://www.google.com',
    notes = '',
    proxy = ''
  ): Promise<BrowserProfile> => {
    const now = Date.now();
    const profile: BrowserProfile = {
      id: `profile_${now}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      fingerprint: generateFingerprint(),
      proxy,
      homepageUrl,
      notes,
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      sessionCount: 0,
      color: generateProfileColor(),
    };
    const updated = [...profiles, profile];
    await saveProfiles(updated);
    return profile;
  }, [profiles, saveProfiles]);

  const updateProfile = useCallback(async (id: string, updates: Partial<BrowserProfile>) => {
    const updated = profiles.map(p =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
    );
    await saveProfiles(updated);
  }, [profiles, saveProfiles]);

  const deleteProfile = useCallback(async (id: string) => {
    const updated = profiles.filter(p => p.id !== id);
    await saveProfiles(updated);
    setSelectedProfiles(prev => prev.filter(sid => sid !== id));
    // Also clean up storage
    await AsyncStorage.removeItem(`__bpm_storage_${id}`);
  }, [profiles, saveProfiles]);

  const duplicateProfile = useCallback(async (id: string): Promise<BrowserProfile | null> => {
    const original = profiles.find(p => p.id === id);
    if (!original) return null;
    const now = Date.now();
    const dup: BrowserProfile = {
      ...original,
      id: `profile_${now}_${Math.random().toString(36).substring(2, 8)}`,
      name: `${original.name} (Copy)`,
      fingerprint: generateFingerprint(),
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      lastUsedAt: null,
      sessionCount: 0,
    };
    const updated = [...profiles, dup];
    await saveProfiles(updated);
    return dup;
  }, [profiles, saveProfiles]);

  const setProfileStatus = useCallback((id: string, status: ProfileStatus) => {
    setProfiles(prev => prev.map(p =>
      p.id === id ? { ...p, status } : p
    ));
  }, []);

  const toggleSelectProfile = useCallback((id: string) => {
    setSelectedProfiles(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const selectAllProfiles = useCallback(() => {
    setSelectedProfiles(profiles.map(p => p.id));
  }, [profiles]);

  const deselectAllProfiles = useCallback(() => {
    setSelectedProfiles([]);
  }, []);

  const addSession = useCallback(async (profileId: string, url: string, title: string) => {
    const entry: SessionEntry = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      profileId,
      url,
      title,
      timestamp: Date.now(),
    };
    const updated = [entry, ...sessions].slice(0, 500);
    await saveSessions(updated);
    // Update session count
    setProfiles(prev => prev.map(p =>
      p.id === profileId ? { ...p, sessionCount: p.sessionCount + 1, lastUsedAt: Date.now() } : p
    ));
  }, [sessions, saveSessions]);

  const getProfileSessions = useCallback((profileId: string) => {
    return sessions.filter(s => s.profileId === profileId);
  }, [sessions]);

  const clearProfileSessions = useCallback(async (profileId: string) => {
    const updated = sessions.filter(s => s.profileId !== profileId);
    await saveSessions(updated);
  }, [sessions, saveSessions]);

  const getRunningCount = useCallback(() => {
    return profiles.filter(p => p.status === 'running').length;
  }, [profiles]);

  const getSuccessRate = useCallback(() => {
    if (profiles.length === 0) return 0;
    const active = profiles.filter(p => p.status === 'running' || p.status === 'idle');
    return Math.round((active.length / profiles.length) * 100);
  }, [profiles]);

  return (
    <ProfileContext.Provider value={{
      profiles,
      selectedProfiles,
      sessions,
      loading,
      addProfile,
      updateProfile,
      deleteProfile,
      duplicateProfile,
      setProfileStatus,
      toggleSelectProfile,
      selectAllProfiles,
      deselectAllProfiles,
      setSelectedProfiles,
      addSession,
      getProfileSessions,
      clearProfileSessions,
      getRunningCount,
      getSuccessRate,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfiles must be used within ProfileProvider');
  return context;
}
