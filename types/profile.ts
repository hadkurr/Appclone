export interface Fingerprint {
  userAgent: string;
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  webglVendor: string;
  webglRenderer: string;
  canvasNoise: boolean;
}

export type ProfileStatus = 'idle' | 'running' | 'loading' | 'error';

export interface BrowserProfile {
  id: string;
  name: string;
  fingerprint: Fingerprint;
  proxy: string;
  homepageUrl: string;
  notes: string;
  status: ProfileStatus;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number | null;
  sessionCount: number;
  color: string;
}

export interface SessionEntry {
  id: string;
  profileId: string;
  url: string;
  title: string;
  timestamp: number;
}
