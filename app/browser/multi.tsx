import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Dimensions, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useProfiles } from '../../context/ProfileContext';
import { useProfileSession } from '../../hooks/useProfileSession';
import { buildFingerprintJS } from '../../hooks/useFingerprint';
import CompatWebView, { CompatWebViewRef } from '../../components/CompatWebView';
import { BrowserProfile } from '../../types/profile';
import colors from '../../hooks/useColors';

const MIRROR_LISTENER_JS = `
(function() {
  if (window.__bpmMirrorListenerInstalled) return;
  window.__bpmMirrorListenerInstalled = true;

  function getSelectorPath(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    var parts = [];
    var current = el;
    for (var i = 0; i < 6 && current && current !== document.body; i++) {
      var tag = current.tagName.toLowerCase();
      var selector = tag;
      if (current.id) { selector += '#' + current.id; }
      else {
        var classes = Array.from(current.classList || []).slice(0, 2);
        if (classes.length) selector += '.' + classes.join('.');
        var parent = current.parentElement;
        if (parent) {
          var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
          if (siblings.length > 1) {
            var idx = siblings.indexOf(current) + 1;
            selector += ':nth-of-type(' + idx + ')';
          }
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  var scrollTimer;
  window.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        __bpmMirror: true, type: 'scroll', x: window.scrollX, y: window.scrollY
      }));
    }, 50);
  }, true);

  document.addEventListener('click', function(e) {
    var sel = getSelectorPath(e.target);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      __bpmMirror: true, type: 'click', selector: sel
    }));
  }, true);

  document.addEventListener('input', function(e) {
    var sel = getSelectorPath(e.target);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      __bpmMirror: true, type: 'input', selector: sel, value: e.target.value || ''
    }));
  }, true);

  window.addEventListener('hashchange', function() {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      __bpmMirror: true, type: 'navigate', url: window.location.href
    }));
  });
})();
`;

function buildMirrorReplayJS(action: MirrorAction): string {
  switch (action.type) {
    case 'scroll':
      return `window.scrollTo(${action.x || 0}, ${action.y || 0}); true;`;
    case 'click':
      return `(function(){ var el = document.querySelector('${(action.selector || '').replace(/'/g, "\\'")}'); if(el) el.click(); })(); true;`;
    case 'input':
      return `(function(){
        var el = document.querySelector('${(action.selector || '').replace(/'/g, "\\'")}');
        if(el) {
          var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
            || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
          if(nativeSetter && nativeSetter.set) nativeSetter.set.call(el, '${(action.value || '').replace(/'/g, "\\'")}');
          else el.value = '${(action.value || '').replace(/'/g, "\\'")}';
          el.dispatchEvent(new Event('input', {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
        }
      })(); true;`;
    case 'navigate':
      return `window.location.href = '${(action.url || '').replace(/'/g, "\\'")}'; true;`;
    default:
      return 'true;';
  }
}

interface MirrorAction {
  type: 'scroll' | 'click' | 'input' | 'navigate';
  x?: number;
  y?: number;
  selector?: string;
  value?: string;
  url?: string;
}

interface TileRef {
  profileId: string;
  webViewRef: React.RefObject<CompatWebViewRef | null>;
}

function BrowserTile({
  profile,
  isMaster,
  mirroring,
  onMasterMessage,
  onMasterUrlChange,
  tileRef,
  scriptToRun,
  onScriptResult,
  compact,
}: {
  profile: BrowserProfile;
  isMaster: boolean;
  mirroring: boolean;
  onMasterMessage: (action: MirrorAction) => void;
  onMasterUrlChange: (url: string) => void;
  tileRef: React.RefObject<CompatWebViewRef | null>;
  scriptToRun: string | null;
  onScriptResult: (profileId: string, result: string) => void;
  compact: boolean;
}) {
  const session = useProfileSession(profile.id);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(profile.homepageUrl);

  useEffect(() => {
    if (scriptToRun && tileRef.current) {
      const wrappedScript = `
        (function() {
          try {
            var result = eval(${JSON.stringify(scriptToRun)});
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpmScript: true, result: String(result)
            }));
          } catch(e) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              __bpmScript: true, result: 'Error: ' + e.message
            }));
          }
        })(); true;
      `;
      tileRef.current.injectJavaScript(wrappedScript);
    }
  }, [scriptToRun]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.__bpm) {
        session.applyMessage(data);
      } else if (data.__bpmMirror && isMaster && mirroring) {
        onMasterMessage(data);
      } else if (data.__bpmScript) {
        onScriptResult(profile.id, data.result);
      }
    } catch {
      // ignore
    }
  }, [session, isMaster, mirroring, onMasterMessage, onScriptResult, profile.id]);

  const handleNavChange = useCallback((navState: { url: string }) => {
    setCurrentUrl(navState.url);
    if (isMaster && mirroring) {
      onMasterUrlChange(navState.url);
    }
  }, [isMaster, mirroring, onMasterUrlChange]);

  if (!session.ready) {
    return (
      <View style={[tileStyles.tile, compact && tileStyles.tileCompact]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const fingerprintJS = buildFingerprintJS(profile.fingerprint);
  const sessionJS = session.buildInjectJS();
  const listenerJS = isMaster && mirroring ? MIRROR_LISTENER_JS : '';
  const injectedJS = sessionJS + fingerprintJS + listenerJS;

  return (
    <View style={[tileStyles.tile, compact && tileStyles.tileCompact, isMaster && mirroring && tileStyles.tileMaster]}>
      <View style={tileStyles.tileHeader}>
        <View style={[tileStyles.colorDot, { backgroundColor: profile.color }]} />
        <Text style={tileStyles.tileName} numberOfLines={1}>{profile.name}</Text>
        {isMaster && mirroring && (
          <View style={tileStyles.masterBadge}>
            <Text style={tileStyles.masterBadgeText}>M</Text>
          </View>
        )}
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        <View style={[tileStyles.statusDot, { backgroundColor: isLoading ? colors.warning : colors.success }]} />
      </View>
      <View style={tileStyles.webviewWrapper}>
        <CompatWebView
          ref={tileRef}
          uri={currentUrl}
          userAgent={profile.fingerprint.userAgent}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={handleNavChange}
          onMessage={handleMessage}
        />
      </View>
    </View>
  );
}

const tileStyles = StyleSheet.create({
  tile: {
    flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface, margin: 3,
  },
  tileCompact: { minHeight: 180 },
  tileMaster: { borderColor: colors.primary, borderWidth: 2 },
  tileHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: colors.surfaceLight, gap: 4,
  },
  colorDot: { width: 6, height: 6, borderRadius: 3 },
  tileName: { flex: 1, fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.text },
  masterBadge: {
    backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1,
  },
  masterBadgeText: { fontSize: 8, fontFamily: 'Inter_700Bold', color: colors.white },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  webviewWrapper: { flex: 1 },
});

export default function MultiBrowserScreen() {
  const router = useRouter();
  const { profiles, selectedProfiles, setSelectedProfiles } = useProfiles();
  const [columns, setColumns] = useState(2);
  const [mirroring, setMirroring] = useState(false);
  const [masterProfileId, setMasterProfileId] = useState<string | null>(null);
  const [lastBroadcast, setLastBroadcast] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [scriptToRun, setScriptToRun] = useState<string | null>(null);
  const [scriptResults, setScriptResults] = useState<Array<{ profileId: string; profileName: string; result: string }>>([]);
  const [showScript, setShowScript] = useState(false);

  const activeProfiles = useMemo(() => {
    if (selectedProfiles.length > 0) {
      return profiles.filter(p => selectedProfiles.includes(p.id));
    }
    return profiles.slice(0, 6);
  }, [profiles, selectedProfiles]);

  const tileRefs = useRef<Map<string, React.RefObject<CompatWebViewRef | null>>>(new Map());

  const getTileRef = useCallback((profileId: string) => {
    if (!tileRefs.current.has(profileId)) {
      tileRefs.current.set(profileId, { current: null });
    }
    return tileRefs.current.get(profileId)!;
  }, []);

  const handleMasterMessage = useCallback((action: MirrorAction) => {
    setLastBroadcast(`${action.type}↗`);
    setTimeout(() => setLastBroadcast(''), 1500);

    const replayJS = buildMirrorReplayJS(action);
    activeProfiles.forEach(p => {
      if (p.id !== masterProfileId) {
        const ref = tileRefs.current.get(p.id);
        if (ref?.current) {
          ref.current.injectJavaScript(replayJS);
        }
      }
    });
  }, [activeProfiles, masterProfileId]);

  const handleMasterUrlChange = useCallback((url: string) => {
    setUrlInput(url);
    activeProfiles.forEach(p => {
      if (p.id !== masterProfileId) {
        const ref = tileRefs.current.get(p.id);
        if (ref?.current) {
          ref.current.injectJavaScript(`window.location.href = '${url.replace(/'/g, "\\'")}'; true;`);
        }
      }
    });
  }, [activeProfiles, masterProfileId]);

  const handleNavigateAll = useCallback(() => {
    if (!urlInput.trim()) return;
    let finalUrl = urlInput.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    activeProfiles.forEach(p => {
      const ref = tileRefs.current.get(p.id);
      if (ref?.current) {
        ref.current.injectJavaScript(`window.location.href = '${finalUrl.replace(/'/g, "\\'")}'; true;`);
      }
    });
  }, [urlInput, activeProfiles]);

  const handleRunScript = useCallback(() => {
    if (!scriptText.trim()) return;
    setScriptResults([]);
    setScriptToRun(scriptText);
    setTimeout(() => setScriptToRun(null), 100);
  }, [scriptText]);

  const handleScriptResult = useCallback((profileId: string, result: string) => {
    const profile = profiles.find(p => p.id === profileId);
    setScriptResults(prev => [...prev, {
      profileId,
      profileName: profile?.name || 'Unknown',
      result,
    }]);
  }, [profiles]);

  const screenWidth = Dimensions.get('window').width;
  const tileWidth = (screenWidth - 16) / columns;

  if (activeProfiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Feather name="grid" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No profiles selected</Text>
          <Text style={styles.emptySubtext}>Select profiles from the Profiles tab first</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/profiles')}>
            <Text style={styles.emptyButtonText}>Go to Profiles</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.urlBar}>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleNavigateAll}
            placeholder="Navigate all..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            returnKeyType="go"
          />
          <TouchableOpacity onPress={handleNavigateAll}>
            <Feather name="arrow-right-circle" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {lastBroadcast ? (
          <View style={styles.broadcastBadge}>
            <Text style={styles.broadcastText}>{lastBroadcast}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.controlBar}>
        <View style={styles.columnSelector}>
          {[1, 2, 3].map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colButton, columns === c && styles.colButtonActive]}
              onPress={() => setColumns(c)}
            >
              <Text style={[styles.colButtonText, columns === c && styles.colButtonTextActive]}>{c}x</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.mirrorToggle, mirroring && styles.mirrorToggleActive]}
          onPress={() => {
            if (!mirroring && !masterProfileId && activeProfiles.length > 0) {
              setMasterProfileId(activeProfiles[0].id);
            }
            setMirroring(!mirroring);
          }}
        >
          <Feather name="copy" size={14} color={mirroring ? colors.success : colors.textMuted} />
          <Text style={[styles.mirrorText, mirroring && styles.mirrorTextActive]}>Mirror</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scriptToggle}
          onPress={() => setShowScript(!showScript)}
        >
          <Feather name="code" size={14} color={showScript ? colors.warning : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {mirroring && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.masterSelector}>
          {activeProfiles.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.masterChip, masterProfileId === p.id && styles.masterChipActive]}
              onPress={() => setMasterProfileId(p.id)}
            >
              <View style={[styles.chipDot, { backgroundColor: p.color }]} />
              <Text style={[styles.masterChipText, masterProfileId === p.id && styles.masterChipTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {showScript && (
        <View style={styles.scriptPanel}>
          <TextInput
            style={styles.scriptInput}
            value={scriptText}
            onChangeText={setScriptText}
            placeholder="document.title"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            multiline
          />
          <TouchableOpacity style={styles.runScriptButton} onPress={handleRunScript}>
            <Feather name="play" size={14} color={colors.white} />
            <Text style={styles.runScriptText}>Run</Text>
          </TouchableOpacity>
          {scriptResults.length > 0 && (
            <ScrollView style={styles.resultsScroll} nestedScrollEnabled>
              {scriptResults.map((r, i) => (
                <View key={i} style={styles.resultItem}>
                  <Text style={styles.resultName}>{r.profileName}:</Text>
                  <Text style={styles.resultValue} numberOfLines={2}>{r.result}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView style={styles.gridContainer} contentContainerStyle={styles.gridContent}>
        <View style={styles.grid}>
          {activeProfiles.map(profile => (
            <View key={profile.id} style={{ width: columns === 1 ? '100%' : `${100 / columns}%`, height: columns === 1 ? 400 : columns === 2 ? 300 : 220 }}>
              <BrowserTile
                profile={profile}
                isMaster={masterProfileId === profile.id}
                mirroring={mirroring}
                onMasterMessage={handleMasterMessage}
                onMasterUrlChange={handleMasterUrlChange}
                tileRef={getTileRef(profile.id)}
                scriptToRun={scriptToRun}
                onScriptResult={handleScriptResult}
                compact={columns >= 2}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, marginTop: 16 },
  emptySubtext: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textMuted, marginTop: 4 },
  emptyButton: {
    backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20,
  },
  emptyButtonText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, gap: 6,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  backButton: {
    width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  urlBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, height: 34,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  urlInput: { flex: 1, color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 12, paddingVertical: 0 },
  broadcastBadge: {
    backgroundColor: colors.success + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  broadcastText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.success },
  controlBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  columnSelector: { flexDirection: 'row', gap: 4 },
  colButton: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  colButtonActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  colButtonText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.textMuted },
  colButtonTextActive: { color: colors.primary },
  mirrorToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  mirrorToggleActive: { borderColor: colors.success, backgroundColor: colors.success + '15' },
  mirrorText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: colors.textMuted },
  mirrorTextActive: { color: colors.success },
  scriptToggle: {
    width: 34, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  masterSelector: {
    backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, maxHeight: 40,
  },
  masterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  masterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  masterChipText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.textMuted },
  masterChipTextActive: { color: colors.primary },
  scriptPanel: {
    backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  scriptInput: {
    backgroundColor: colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 12, maxHeight: 60,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  runScriptButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: colors.success, borderRadius: 6, paddingVertical: 6, marginTop: 4,
  },
  runScriptText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.white },
  resultsScroll: { maxHeight: 80, marginTop: 4 },
  resultItem: { flexDirection: 'row', paddingVertical: 2, gap: 6 },
  resultName: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.primary },
  resultValue: { fontSize: 10, fontFamily: 'Inter_400Regular', color: colors.text, flex: 1 },
  gridContainer: { flex: 1 },
  gridContent: { padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
