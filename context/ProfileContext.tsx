import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { BrowserProfile, Fingerprint, ProfileStatus } from "../types/profile";

const STORAGE_KEY = "__bpm_profiles";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

const PLATFORMS: Fingerprint["platform"][] = ["Win32", "MacIntel", "Linux x86_64"];
const LANGUAGES = ["en-US", "en-GB", "fr-FR", "de-DE", "es-ES", "ja-JP", "zh-CN"];
const WEBGL_VENDORS = ["Google Inc. (NVIDIA)", "Google Inc. (AMD)", "Google Inc. (Intel)", "Apple Inc."];
const WEBGL_RENDERERS = [
  "ANGLE (NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)",
  "ANGLE (AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0)",
  "ANGLE (Intel UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0)",
  "Apple GPU",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateFingerprint(): Fingerprint {
  const platform = randomItem(PLATFORMS);
  const uaIndex = platform === "Win32" ? 0 : platform === "MacIntel" ? 1 : 2;
  return {
    userAgent: USER_AGENTS[uaIndex] || randomItem(USER_AGENTS),
    platform,
    language: randomItem(LANGUAGES),
    screenWidth: randomItem([1920, 2560, 1440, 1366, 1536]),
    screenHeight: randomItem([1080, 1440, 900, 768, 864]),
    colorDepth: randomItem([24, 30, 32]),
    webglVendor: randomItem(WEBGL_VENDORS),
    webglRenderer: randomItem(WEBGL_RENDERERS),
    canvasNoise: Math.random() > 0.3,
  };
}

interface ProfileContextType {
  profiles: BrowserProfile[];
  selectedProfiles: string[];
  loading: boolean;
  addProfile: (name: string, homepage?: string) => Promise<BrowserProfile>;
  updateProfile: (id: string, updates: Partial<BrowserProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setProfileStatus: (id: string, status: ProfileStatus) => void;
  toggleSelectProfile: (id: string) => void;
  selectAllProfiles: () => void;
  clearSelection: () => void;
  getProfile: (id: string) => BrowserProfile | undefined;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<BrowserProfile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setProfiles(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load profiles:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfiles = async (newProfiles: BrowserProfile[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProfiles));
    } catch (e) {
      console.error("Failed to save profiles:", e);
    }
  };

  const addProfile = useCallback(async (name: string, homepage?: string): Promise<BrowserProfile> => {
    const profile: BrowserProfile = {
      id: uuidv4(),
      name,
      fingerprint: generateFingerprint(),
      homepage: homepage || "https://www.google.com",
      notes: "",
      status: "idle",
      lastUsed: Date.now(),
      createdAt: Date.now(),
    };
    const updated = [...profiles, profile];
    setProfiles(updated);
    await saveProfiles(updated);
    return profile;
  }, [profiles]);

  const updateProfile = useCallback(async (id: string, updates: Partial<BrowserProfile>) => {
    const updated = profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProfiles(updated);
    await saveProfiles(updated);
  }, [profiles]);

  const deleteProfile = useCallback(async (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    await saveProfiles(updated);
    await AsyncStorage.removeItem(`__bpm_storage_${id}`);
  }, [profiles]);

  const setProfileStatus = useCallback((id: string, status: ProfileStatus) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const toggleSelectProfile = useCallback((id: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  }, []);

  const selectAllProfiles = useCallback(() => {
    setSelectedProfiles(profiles.map((p) => p.id));
  }, [profiles]);

  const clearSelection = useCallback(() => {
    setSelectedProfiles([]);
  }, []);

  const getProfile = useCallback(
    (id: string) => profiles.find((p) => p.id === id),
    [profiles]
  );

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        selectedProfiles,
        loading,
        addProfile,
        updateProfile,
        deleteProfile,
        setProfileStatus,
        toggleSelectProfile,
        selectAllProfiles,
        clearSelection,
        getProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used within ProfileProvider");
  return ctx;
}
