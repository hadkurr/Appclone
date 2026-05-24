export interface Fingerprint {
  userAgent: string;
  platform: "Win32" | "MacIntel" | "Linux x86_64";
  language: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  webglVendor: string;
  webglRenderer: string;
  canvasNoise: boolean;
}

export type ProfileStatus = "idle" | "running" | "loading" | "error";

export interface BrowserProfile {
  id: string;
  name: string;
  fingerprint: Fingerprint;
  proxy?: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    type: "http" | "socks5";
  };
  homepage: string;
  notes: string;
  status: ProfileStatus;
  lastUsed: number;
  createdAt: number;
}

export interface SessionEntry {
  id: string;
  profileId: string;
  url: string;
  title: string;
  timestamp: number;
}
