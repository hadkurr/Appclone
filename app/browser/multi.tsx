import { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { CompatWebView, CompatWebViewRef } from "../../components/CompatWebView";
import { useProfiles } from "../../context/ProfileContext";
import { useProfileSession } from "../../hooks/useProfileSession";
import { colors } from "../../hooks/useColors";
import { BrowserProfile } from "../../types/profile";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function buildFingerprintJS(fp: BrowserProfile["fingerprint"]): string {
  return `
    (function() {
      try {
        Object.defineProperty(navigator, 'platform', { get: function() { return '${fp.platform}'; } });
        Object.defineProperty(navigator, 'language', { get: function() { return '${fp.language}'; } });
        Object.defineProperty(screen, 'width', { get: function() { return ${fp.screenWidth}; } });
        Object.defineProperty(screen, 'height', { get: function() { return ${fp.screenHeight}; } });
        var getParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
          if (param === 37445) return '${fp.webglVendor}';
          if (param === 37446) return '${fp.webglRenderer}';
          return getParam.call(this, param);
        };
      } catch(e) {}
    })();
    true;
  `;
}

const MIRROR_LISTENER_JS = `
(function() {
  function getSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    var parts = [];
    var current = el;
    for (var i = 0; i < 6 && current && current !== document.body; i++) {
      var tag = current.tagName.toLowerCase();
      var sel = tag;
      if (current.id) sel += '#' + current.id;
      var classes = Array.from(current.classList || []).slice(0, 2);
      if (classes.length) sel += '.' + classes.join('.');
      var parent = current.parentElement;
      if (parent) {
        var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName; });
        if (siblings.length > 1) sel += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
      }
      parts.unshift(sel);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  window.addEventListener('scroll', function() {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      __mirror: true, type: 'scroll', x: window.scrollX, y: window.scrollY
    }));
  }, { passive: true });

  document.addEventListener('click', function(e) {
    var sel = getSelector(e.target);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      __mirror: true, type: 'click', selector: sel
    }));
  }, true);

  document.addEventListener('input', function(e) {
    var sel = getSelector(e.target);
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      __mirror: true, type: 'input', selector: sel, value: e.target.value || ''
    }));
  }, true);
})();
true;
`;

function BrowserTile({
  profile, isMaster, mirroring, onMasterMessage, onMasterUrlChange, script,
  tileWidth,
}: {
  profile: BrowserProfile;
  isMaster: boolean;
  mirroring: boolean;
  onMasterMessage?: (data: { type: string; x?: number; y?: number; selector?: string; value?: string }) => void;
  onMasterUrlChange?: (url: string) => void;
  script?: string;
  tileWidth: number;
}) {
  const session = useProfileSession(profile.id);
  const webRef = useRef<CompatWebViewRef>(null);
  const [loading, setLoading] = useState(false);

  const injectedJS = session.buildInjectJS()
    + buildFingerprintJS(profile.fingerprint)
    + (isMaster && mirroring ? MIRROR_LISTENER_JS : "");

  useEffect(() => {
    if (script && webRef.current) {
      webRef.current.injectJavaScript(`
        try {
          var result = eval(${JSON.stringify(script)});
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            __script: true, result: String(result), profileId: '${profile.id}'
          }));
        } catch(e) {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            __script: true, result: 'Error: ' + e.message, profileId: '${profile.id}'
          }));
        }
        true;
      `);
    }
  }, [script]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.__bpm) {
        session.applyMessage(data);
      } else if (data.__mirror && isMaster && mirroring) {
        onMasterMessage?.(data);
      } else if (data.__script) {
        Alert.alert(`${profile.name}`, data.result);
      }
    } catch (e) {
      // ignore
    }
  }, [session, isMaster, mirroring, onMasterMessage, profile.name]);

  const handleNavChange = (navState: WebViewNavigation) => {
    if (isMaster && mirroring && onMasterUrlChange) {
      onMasterUrlChange(navState.url);
    }
  };

  // Expose ref for mirror injection
  (profile as BrowserProfile & { _webRef?: React.RefObject<CompatWebViewRef | null> })._webRef = webRef;

  if (!session.ready) {
    return (
      <View style={[styles.tile, { width: tileWidth }]}>
        <Text style={styles.tileLoading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.tile, { width: tileWidth }, isMaster && styles.tileMaster]}>
      <View style={styles.tileHeader}>
        <View style={[styles.statusDot, {
          backgroundColor: loading ? colors.warning : colors.success
        }]} />
        <Text style={styles.tileName} numberOfLines={1}>
          {isMaster ? "* " : ""}{profile.name}
        </Text>
        <Text style={styles.tilePlatform}>{profile.fingerprint.platform}</Text>
      </View>
      <CompatWebView
        ref={webRef}
        uri={profile.homepage}
        userAgent={profile.fingerprint.userAgent}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavChange}
        onMessage={handleMessage}
        style={styles.tileWebView}
      />
    </View>
  );
}

export default function MultiBrowserScreen() {
  const params = useLocalSearchParams<{
    profileIds?: string;
    mirror?: string;
    masterId?: string;
    script?: string;
  }>();
  const { profiles, selectedProfiles } = useProfiles();
  const router = useRouter();
  const [columns, setColumns] = useState(2);
  const [mirroring, setMirroring] = useState(params.mirror === "true");
  const [masterUrl, setMasterUrl] = useState("");
  const [lastBroadcast, setLastBroadcast] = useState("");

  const profileIds = params.profileIds
    ? params.profileIds.split(",")
    : selectedProfiles;

  const activeProfiles = profiles.filter((p) => profileIds.includes(p.id));
  const masterId = params.masterId || (activeProfiles.length > 0 ? activeProfiles[0].id : null);
  const tileWidth = (SCREEN_WIDTH - 16) / columns - 4;

  const webRefs = useRef<Map<string, CompatWebViewRef>>(new Map());

  const broadcastMirror = useCallback((data: { type: string; x?: number; y?: number; selector?: string; value?: string }) => {
    let js = "";
    switch (data.type) {
      case "scroll":
        js = `window.scrollTo(${data.x || 0}, ${data.y || 0}); true;`;
        setLastBroadcast("scroll");
        break;
      case "click":
        js = `try { document.querySelector('${data.selector}').click(); } catch(e) {} true;`;
        setLastBroadcast("click");
        break;
      case "input":
        js = `try {
          var el = document.querySelector('${data.selector}');
          var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(el, '${(data.value || "").replace(/'/g, "\\'")}');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } catch(e) {} true;`;
        setLastBroadcast("input");
        break;
    }

    if (js) {
      activeProfiles.forEach((p) => {
        if (p.id !== masterId) {
          const ref = (p as BrowserProfile & { _webRef?: { current: CompatWebViewRef | null } })._webRef;
          ref?.current?.injectJavaScript(js);
        }
      });
    }
  }, [activeProfiles, masterId]);

  const handleMasterUrlChange = useCallback((url: string) => {
    setMasterUrl(url);
    activeProfiles.forEach((p) => {
      if (p.id !== masterId) {
        const ref = (p as BrowserProfile & { _webRef?: { current: CompatWebViewRef | null } })._webRef;
        ref?.current?.injectJavaScript(`location.href = '${url}'; true;`);
      }
    });
    setLastBroadcast("navigate");
  }, [activeProfiles, masterId]);

  if (activeProfiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Feather name="grid" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No profiles selected</Text>
          <Text style={styles.emptySubtext}>
            Select profiles from the Profiles tab or Sync tab, then open Multi Browser.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolBtn}>
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Multi Browser ({activeProfiles.length})</Text>
        {mirroring && lastBroadcast ? (
          <Text style={styles.broadcastIndicator}>{lastBroadcast}</Text>
        ) : null}
        <View style={styles.columnPicker}>
          {[1, 2, 3].map((col) => (
            <TouchableOpacity
              key={col}
              style={[styles.colBtn, columns === col && styles.colBtnActive]}
              onPress={() => setColumns(col)}
            >
              <Text style={[styles.colBtnText, columns === col && styles.colBtnTextActive]}>
                {col}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.mirrorToggle, mirroring && styles.mirrorToggleActive]}
          onPress={() => setMirroring(!mirroring)}
        >
          <Feather name="cast" size={14} color={mirroring ? "#fff" : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {mirroring && masterUrl ? (
        <View style={styles.masterUrlBar}>
          <Feather name="link" size={12} color={colors.primary} />
          <Text style={styles.masterUrlText} numberOfLines={1}>{masterUrl}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.grid}>
        {activeProfiles.map((profile) => (
          <BrowserTile
            key={profile.id}
            profile={profile}
            isMaster={profile.id === masterId}
            mirroring={mirroring}
            onMasterMessage={broadcastMirror}
            onMasterUrlChange={handleMasterUrlChange}
            script={params.script}
            tileWidth={tileWidth}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 8,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  topTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  broadcastIndicator: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: colors.warning,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  columnPicker: {
    flexDirection: "row",
    gap: 4,
  },
  colBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.surfaceLight,
  },
  colBtnActive: {
    backgroundColor: colors.primary,
  },
  colBtnText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.textMuted,
  },
  colBtnTextActive: {
    color: "#fff",
  },
  mirrorToggle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  mirrorToggleActive: {
    backgroundColor: colors.primary,
  },
  masterUrlBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.surfaceLight,
    gap: 6,
  },
  masterUrlText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    flex: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 4,
  },
  tile: {
    height: 300,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  tileMaster: {
    borderColor: colors.primary,
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceLight,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tileName: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
  },
  tilePlatform: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
  },
  tileWebView: {
    flex: 1,
  },
  tileLoading: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  backButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
