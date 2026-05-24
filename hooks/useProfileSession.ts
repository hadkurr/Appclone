import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '__bpm_storage_';
const COOKIE_KEY_PREFIX = '__bpm_cookies_';
const DEBOUNCE_MS = 250;

interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: Record<string, string>;
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
    cookies: {},
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cookieDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageRef = useRef<StorageData>(storageData);

  const storageKey = `${STORAGE_KEY_PREFIX}${profileId}`;
  const cookieKey = `${COOKIE_KEY_PREFIX}${profileId}`;

  useEffect(() => {
    storageRef.current = storageData;
  }, [storageData]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      AsyncStorage.getItem(storageKey),
      AsyncStorage.getItem(cookieKey),
    ]).then(([raw, rawCookies]) => {
      if (!mounted) return;
      const data: StorageData = {
        localStorage: {},
        sessionStorage: {},
        cookies: {},
      };
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          data.localStorage = parsed.localStorage || {};
          data.sessionStorage = parsed.sessionStorage || {};
          data.cookies = parsed.cookies || {};
        } catch {
          // ignore parse errors
        }
      }
      if (rawCookies) {
        try {
          data.cookies = JSON.parse(rawCookies);
        } catch {
          // ignore
        }
      }
      setStorageData(data);
      storageRef.current = data;
      setReady(true);
    });
    return () => { mounted = false; };
  }, [storageKey, cookieKey]);

  const persist = useCallback((data: StorageData) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
    }, DEBOUNCE_MS);
  }, [storageKey]);

  const persistCookies = useCallback((cookies: Record<string, string>) => {
    if (cookieDebounceTimer.current) clearTimeout(cookieDebounceTimer.current);
    cookieDebounceTimer.current = setTimeout(() => {
      AsyncStorage.setItem(cookieKey, JSON.stringify(cookies)).catch(() => {});
    }, DEBOUNCE_MS);
  }, [cookieKey]);

  const applyMessage = useCallback((msg: StorageMessage) => {
    if (!msg.__bpm) return;

    if (msg.type === 'cookie' && msg.cookies) {
      const current = { ...storageRef.current };
      current.cookies = { ...current.cookies, ...msg.cookies };
      setStorageData(current);
      storageRef.current = current;
      persistCookies(current.cookies);
      return;
    }

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
  }, [persist, persistCookies]);

  const buildInjectJS = useCallback((): string => {
    const data = storageRef.current;
    const lsEntries = JSON.stringify(data.localStorage);
    const ssEntries = JSON.stringify(data.sessionStorage);
    const cookieEntries = JSON.stringify(data.cookies || {});

    return `
(function() {
  try {
    // --- Clear existing cookies from other profiles ---
    var existingCookies = document.cookie.split(';');
    for (var i = 0; i < existingCookies.length; i++) {
      var cookie = existingCookies[i].trim();
      if (!cookie) continue;
      var eqPos = cookie.indexOf('=');
      var name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      if (name) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + window.location.hostname;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.' + window.location.hostname;
      }
    }

    // --- Restore this profile's cookies ---
    var profileCookies = ${cookieEntries};
    Object.keys(profileCookies).forEach(function(name) {
      try {
        document.cookie = name + '=' + profileCookies[name] + ';path=/;max-age=31536000';
      } catch(e) {}
    });

    // --- Hook document.cookie to capture changes ---
    if (!window.__bpmCookieHooked) {
      window.__bpmCookieHooked = true;
      var cookieDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
        || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
      if (cookieDesc && cookieDesc.set) {
        var origSet = cookieDesc.set;
        var origGet = cookieDesc.get;
        var debounceTimer;
        Object.defineProperty(document, 'cookie', {
          get: function() { return origGet.call(this); },
          set: function(val) {
            origSet.call(this, val);
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function() {
              try {
                var all = origGet.call(document).split(';');
                var cookieMap = {};
                for (var j = 0; j < all.length; j++) {
                  var c = all[j].trim();
                  if (!c) continue;
                  var eq = c.indexOf('=');
                  if (eq > -1) {
                    cookieMap[c.substring(0, eq).trim()] = c.substring(eq + 1).trim();
                  }
                }
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                  __bpm: true, type: 'cookie', cookies: cookieMap
                }));
              } catch(e) {}
            }, 300);
          },
          configurable: true
        });
      }
    }

    // --- Snapshot cookies after page loads to capture server-set cookies ---
    setTimeout(function() {
      try {
        var cookieDesc2 = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
          || Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
        var getter = cookieDesc2 && cookieDesc2.get ? cookieDesc2.get : null;
        var raw = getter ? getter.call(document) : document.cookie;
        var all = raw.split(';');
        var cookieMap = {};
        for (var j = 0; j < all.length; j++) {
          var c = all[j].trim();
          if (!c) continue;
          var eq = c.indexOf('=');
          if (eq > -1) {
            cookieMap[c.substring(0, eq).trim()] = c.substring(eq + 1).trim();
          }
        }
        if (Object.keys(cookieMap).length > 0) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            __bpm: true, type: 'cookie', cookies: cookieMap
          }));
        }
      } catch(e) {}
    }, 2000);

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

  return { ready, storageData, applyMessage, buildInjectJS };
}
