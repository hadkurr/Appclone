import { useEffect, useState, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface StorageData {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

interface StorageMessage {
  __bpm: true;
  type: "storage";
  kind: "localStorage" | "sessionStorage";
  action: "setItem" | "removeItem" | "clear";
  key?: string;
  value?: string;
}

export function useProfileSession(profileId: string) {
  const [ready, setReady] = useState(false);
  const storageRef = useRef<StorageData>({ localStorage: {}, sessionStorage: {} });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `__bpm_storage_${profileId}`;

  useEffect(() => {
    loadStorage();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [profileId]);

  const loadStorage = async () => {
    try {
      const data = await AsyncStorage.getItem(storageKey);
      if (data) {
        storageRef.current = JSON.parse(data);
      } else {
        storageRef.current = { localStorage: {}, sessionStorage: {} };
      }
    } catch (e) {
      storageRef.current = { localStorage: {}, sessionStorage: {} };
    }
    setReady(true);
  };

  const persist = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(storageRef.current));
      } catch (e) {
        console.error("Failed to persist session:", e);
      }
    }, 250);
  }, [storageKey]);

  const applyMessage = useCallback((data: StorageMessage) => {
    if (!data.__bpm || data.type !== "storage") return;
    const store = storageRef.current[data.kind];
    switch (data.action) {
      case "setItem":
        if (data.key != null && data.value != null) {
          store[data.key] = data.value;
        }
        break;
      case "removeItem":
        if (data.key != null) {
          delete store[data.key];
        }
        break;
      case "clear":
        if (data.kind === "localStorage") {
          storageRef.current.localStorage = {};
        } else {
          storageRef.current.sessionStorage = {};
        }
        break;
    }
    persist();
  }, [persist]);

  const buildInjectJS = useCallback((): string => {
    const ls = JSON.stringify(storageRef.current.localStorage);
    const ss = JSON.stringify(storageRef.current.sessionStorage);

    return `
      (function() {
        try {
          // Hydrate localStorage
          var lsData = ${ls};
          for (var k in lsData) {
            try { localStorage.setItem(k, lsData[k]); } catch(e) {}
          }
          // Hydrate sessionStorage
          var ssData = ${ss};
          for (var k in ssData) {
            try { sessionStorage.setItem(k, ssData[k]); } catch(e) {}
          }

          // Hook localStorage
          var origLS = {
            setItem: localStorage.setItem.bind(localStorage),
            removeItem: localStorage.removeItem.bind(localStorage),
            clear: localStorage.clear.bind(localStorage)
          };
          localStorage.setItem = function(key, value) {
            origLS.setItem(key, value);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpm: true, type: 'storage', kind: 'localStorage', action: 'setItem', key: key, value: value
            }));
          };
          localStorage.removeItem = function(key) {
            origLS.removeItem(key);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpm: true, type: 'storage', kind: 'localStorage', action: 'removeItem', key: key
            }));
          };
          localStorage.clear = function() {
            origLS.clear();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpm: true, type: 'storage', kind: 'localStorage', action: 'clear'
            }));
          };

          // Hook sessionStorage
          var origSS = {
            setItem: sessionStorage.setItem.bind(sessionStorage),
            removeItem: sessionStorage.removeItem.bind(sessionStorage),
            clear: sessionStorage.clear.bind(sessionStorage)
          };
          sessionStorage.setItem = function(key, value) {
            origSS.setItem(key, value);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpm: true, type: 'storage', kind: 'sessionStorage', action: 'setItem', key: key, value: value
            }));
          };
          sessionStorage.removeItem = function(key) {
            origSS.removeItem(key);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpm: true, type: 'storage', kind: 'sessionStorage', action: 'removeItem', key: key
            }));
          };
          sessionStorage.clear = function() {
            origSS.clear();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpm: true, type: 'storage', kind: 'sessionStorage', action: 'clear'
            }));
          };
        } catch(e) {}
      })();
      true;
    `;
  }, []);

  return { ready, applyMessage, buildInjectJS };
}
