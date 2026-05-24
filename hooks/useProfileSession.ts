import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '__bpm_storage_';
const DEBOUNCE_MS = 250;

interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

interface StorageMessage {
  __bpm: true;
  type: 'storage';
  kind: 'localStorage' | 'sessionStorage';
  action: 'setItem' | 'removeItem' | 'clear';
  key?: string;
  value?: string;
}

export function useProfileSession(profileId: string) {
  const [ready, setReady] = useState(false);
  const [storageData, setStorageData] = useState<StorageData>({
    localStorage: {},
    sessionStorage: {},
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageRef = useRef<StorageData>(storageData);

  const storageKey = `${STORAGE_KEY_PREFIX}${profileId}`;

  useEffect(() => {
    storageRef.current = storageData;
  }, [storageData]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (!mounted) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StorageData;
          setStorageData(parsed);
          storageRef.current = parsed;
        } catch {
          // ignore parse errors
        }
      }
      setReady(true);
    });
    return () => { mounted = false; };
  }, [storageKey]);

  const persist = useCallback((data: StorageData) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      AsyncStorage.setItem(storageKey, JSON.stringify(data)).catch(() => {});
    }, DEBOUNCE_MS);
  }, [storageKey]);

  const applyMessage = useCallback((msg: StorageMessage) => {
    if (!msg.__bpm || msg.type !== 'storage') return;
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
    var lsData = ${lsEntries};
    var ssData = ${ssEntries};
    Object.keys(lsData).forEach(function(k) {
      try { localStorage.setItem(k, lsData[k]); } catch(e) {}
    });
    Object.keys(ssData).forEach(function(k) {
      try { sessionStorage.setItem(k, ssData[k]); } catch(e) {}
    });

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
