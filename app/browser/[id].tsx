import { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebViewMessageEvent, WebViewNavigation } from "react-native-webview";
import { CompatWebView, CompatWebViewRef } from "../../components/CompatWebView";
import { useProfiles } from "../../context/ProfileContext";
import { useProfileSession } from "../../hooks/useProfileSession";
import { colors } from "../../hooks/useColors";

function buildFingerprintJS(fp: {
  platform: string;
  language: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  webglVendor: string;
  webglRenderer: string;
  canvasNoise: boolean;
}): string {
  return `
    (function() {
      try {
        Object.defineProperty(navigator, 'platform', { get: function() { return '${fp.platform}'; } });
        Object.defineProperty(navigator, 'language', { get: function() { return '${fp.language}'; } });
        Object.defineProperty(navigator, 'languages', { get: function() { return ['${fp.language}']; } });
        Object.defineProperty(screen, 'width', { get: function() { return ${fp.screenWidth}; } });
        Object.defineProperty(screen, 'height', { get: function() { return ${fp.screenHeight}; } });
        Object.defineProperty(screen, 'colorDepth', { get: function() { return ${fp.colorDepth}; } });

        var getParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
          if (param === 37445) return '${fp.webglVendor}';
          if (param === 37446) return '${fp.webglRenderer}';
          return getParam.call(this, param);
        };

        ${fp.canvasNoise ? `
        var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type) {
          var ctx = this.getContext('2d');
          if (ctx) {
            var imgData = ctx.getImageData(0, 0, Math.min(this.width, 2), Math.min(this.height, 2));
            imgData.data[0] = imgData.data[0] ^ 1;
            ctx.putImageData(imgData, 0, 0);
          }
          return origToDataURL.apply(this, arguments);
        };
        ` : ""}
      } catch(e) {}
    })();
    true;
  `;
}

export default function BrowserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getProfile, setProfileStatus } = useProfiles();
  const router = useRouter();
  const profile = getProfile(id);
  const session = useProfileSession(id);
  const webRef = useRef<CompatWebViewRef>(null);

  const [url, setUrl] = useState(profile?.homepage || "https://www.google.com");
  const [urlInput, setUrlInput] = useState(url);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: colors.error, textAlign: "center", marginTop: 100 }}>
          Profile not found
        </Text>
      </SafeAreaView>
    );
  }

  const injectedJS = session.buildInjectJS() + buildFingerprintJS(profile.fingerprint);

  const handleNavigate = () => {
    let target = urlInput.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    setUrl(target);
    setUrlInput(target);
  };

  const handleNavStateChange = (navState: WebViewNavigation) => {
    setUrlInput(navState.url);
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
  };

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.__bpm) {
        session.applyMessage(data);
      }
    } catch (e) {
      // ignore non-JSON messages
    }
  }, [session]);

  if (!session.ready) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.toolBtn}>
          <Feather name="x" size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => webRef.current?.goBack()}
          style={styles.toolBtn}
          disabled={!canGoBack}
        >
          <Feather name="chevron-left" size={18} color={canGoBack ? colors.text : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => webRef.current?.goForward()}
          style={styles.toolBtn}
          disabled={!canGoForward}
        >
          <Feather name="chevron-right" size={18} color={canGoForward ? colors.text : colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.urlBar}>
          <Feather name="lock" size={12} color={colors.success} />
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleNavigate}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            selectTextOnFocus
          />
        </View>
        <TouchableOpacity
          onPress={() => webRef.current?.reload()}
          style={styles.toolBtn}
        >
          <Feather name={loading ? "x" : "refresh-cw"} size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      )}

      <View style={styles.fingerprintBanner}>
        <Text style={styles.fpText}>
          {profile.name} | {profile.fingerprint.platform} | {profile.fingerprint.language}
        </Text>
      </View>

      <CompatWebView
        ref={webRef}
        uri={url}
        userAgent={profile.fingerprint.userAgent}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onLoadStart={() => { setLoading(true); setProfileStatus(id, "loading"); }}
        onLoadEnd={() => { setLoading(false); setProfileStatus(id, "running"); }}
        onError={() => setProfileStatus(id, "error")}
        onProgress={setProgress}
        onNavigationStateChange={handleNavStateChange}
        onMessage={handleMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 4,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  urlBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 34,
    gap: 6,
  },
  urlInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.text,
  },
  progressBar: {
    height: 2,
    backgroundColor: colors.primary,
  },
  fingerprintBanner: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  fpText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: colors.textMuted,
    textAlign: "center",
  },
});
