import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager, { Cookie, Cookies } from '@react-native-cookies/cookies';

const STORAGE_KEY_PREFIX = '__bpm_storage_';
const COOKIE_KEY_PREFIX = '__bpm_cookies_';
const DEBOUNCE_MS = 250;

interface NativeCookieEntry {
  url: string;
  cookies: Cookies;
}

interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

interface StorageMessage {
  __bpm: true;
  type: 'storage' | 'cookie';
  kind?: 'localStorage' | 'sessionStorage';
  action?: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  value?: string;
  cookies?: Record<string, string>;
}

export function useProfileSession(profileId: string) {
  const [ready, setReady] = useState(false);
  const [storageData, setStorageData] = useState<StorageData>({
    localStorage: {},
    sessionStorage: {},
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageRef = useRef<StorageData>(storageData);
  const visitedUrlsRef = useRef<Set<string>>(new Set());
  const nativeCookiesRef = useRef<NativeCookieEntry[]>([]);

  const storageKey = `${STORAGE_KEY_PREFIX}${profileId}`;
  const cookieKey = `${COOKIE_KEY_PREFIX}${profileId}`;

  useEffect(() => {
    storageRef.current = storageData;
  }, [storageData]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [raw, rawCookies] = await Promise.all([
        AsyncStorage.getItem(storageKey),
        AsyncStorage.getItem(cookieKey),
      ]);
      if (!mounted) return;

      const data: StorageData = { localStorage: {}, sessionStorage: {} };
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          data.localStorage = parsed.localStorage || {};
          data.sessionStorage = parsed.sessionStorage || {};
        } catch {
          // ignore
        }
      }

      let savedCookies: NativeCookieEntry[] = [];
      if (rawCookies) {
        try {
          savedCookies = JSON.parse(rawCookies);
        } catch {
          // ignore
        }
      }
      nativeCookiesRef.current = savedCookies;

      if (Platform.OS !== 'web') {
        try {
          await CookieManager.clearAll();
          for (const entry of savedCookies) {
            for (const name of Object.keys(entry.cookies)) {
              const cookie = entry.cookies[name];
              await CookieManager.set(entry.url, {
                name: cookie.name || name,
                value: cookie.value,
                path: cookie.path,
                domain: cookie.domain,
                version: cookie.version,
                expires: cookie.expires,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
              });
            }
          }
        } catch {
          // native cookie manager not available
        }
      }

      setStorageData(data);
      storageRef.current = data;
      setReady(true);
    })();
    return () => { mounted = false; };
  }, [storageKey, cookieKey]);

  const persist = useCallback((data: StorageData) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
    }, DEBOUNCE_MS);
  }, [storageKey]);

  const saveNativeCookiesForUrl = useCallback(async (url: string) => {
    if (Platform.OS === 'web') return;
    try {
      const cookies = await CookieManager.get(url);
      if (Object.keys(cookies).length === 0) return;

      const entries = nativeCookiesRef.current.filter(e => e.url !== url);
      entries.push({ url, cookies });
      nativeCookiesRef.current = entries;

      await AsyncStorage.setItem(cookieKey, JSON.stringify(entries));
    } catch {
      // ignore
    }
  }, [cookieKey]);

  const saveAllNativeCookies = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const urls = Array.from(visitedUrlsRef.current);
    for (const url of urls) {
      await saveNativeCookiesForUrl(url);
    }
  }, [saveNativeCookiesForUrl]);

  const trackUrl = useCallback((url: string) => {
    try {
      const origin = new URL(url).origin;
      visitedUrlsRef.current.add(origin);
    } catch {
      // invalid URL
    }
  }, []);

  const applyMessage = useCallback((msg: StorageMessage) => {
    if (!msg.__bpm) return;

    if (msg.type === 'cookie') return;

    if (msg.type !== 'storage' || !msg.kind || !msg.action) return;
    const current = { ...storageRef.current };
    const store = { ...current[msg.kind] };

    switch (msg.action) {
      case 'setItem':
        if (msg.key !== undefined && msg.value !== undefined) {
          store[msg.key] = msg.value;
        }
        break;
      case 'removeItem':
        if (msg.key !== undefined) {
          delete store[msg.key];
        }
        break;
      case 'clear':
        Object.keys(store).forEach(k => delete store[k]);
        break;
    }

    current[msg.kind] = store;
    setStorageData(current);
    storageRef.current = current;
    persist(current);
  }, [persist]);

  const buildInjectJS = useCallback((): string => {
    const data = storageRef.current;
    const lsEntries = JSON.stringify(data.localStorage);
    const ssEntries = JSON.stringify(data.sessionStorage);

    return `
(function() {
  try {
    // --- Clear and hydrate localStorage ---
    var lsData = ${lsEntries};
    try { localStorage.clear(); } catch(e) {}
    Object.keys(lsData).forEach(function(k) {
      try { localStorage.setItem(k, lsData[k]); } catch(e) {}
    });

    // --- Clear and hydrate sessionStorage ---
    var ssData = ${ssEntries};
    try { sessionStorage.clear(); } catch(e) {}
    Object.keys(ssData).forEach(function(k) {
      try { sessionStorage.setItem(k, ssData[k]); } catch(e) {}
    });

    // --- Hook storage APIs ---
    function hookStorage(storageObj, kind) {
      var origSetItem = storageObj.setItem.bind(storageObj);
      var origRemoveItem = storageObj.removeItem.bind(storageObj);
      var origClear = storageObj.clear.bind(storageObj);

      storageObj.setItem = function(key, value) {
        origSetItem(key, value);
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          __bpm: true, type: 'storage', kind: kind, action: 'setItem', key: key, value: value
        }));
      };
      storageObj.removeItem = function(key) {
        origRemoveItem(key);
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          __bpm: true, type: 'storage', kind: kind, action: 'removeItem', key: key
        }));
      };
      storageObj.clear = function() {
        origClear();
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          __bpm: true, type: 'storage', kind: kind, action: 'clear'
        }));
      };
    }
    hookStorage(localStorage, 'localStorage');
    hookStorage(sessionStorage, 'sessionStorage');
  } catch(e) {}
})();
`;
  }, []);

  return {
    ready,
    storageData,
    applyMessage,
    buildInjectJS,
    trackUrl,
    saveNativeCookiesForUrl,
    saveAllNativeCookies,
  };
}
