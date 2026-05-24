import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfiles } from '../../context/ProfileContext';
import { useProfileSession } from '../../hooks/useProfileSession';
import { buildFingerprintJS } from '../../hooks/useFingerprint';
import CompatWebView, { CompatWebViewRef } from '../../components/CompatWebView';
import colors from '../../hooks/useColors';

export default function BrowserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profiles, setProfileStatus, addSession } = useProfiles();

  const profile = profiles.find(p => p.id === id);
  const session = useProfileSession(id || '');
  const webViewRef = useRef<CompatWebViewRef>(null);

  const [urlInput, setUrlInput] = useState(profile?.homepageUrl || 'https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState(profile?.homepageUrl || 'https://www.google.com');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [isSecure, setIsSecure] = useState(false);

  useEffect(() => {
    if (profile && id) {
      setProfileStatus(id, 'running');
      return () => {
        setProfileStatus(id, 'idle');
      };
    }
  }, [id, profile]);

  const navigateToUrl = useCallback((url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl) return;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      }
    }
    setCurrentUrl(finalUrl);
    setUrlInput(finalUrl);
  }, []);

  const handleSubmitUrl = useCallback(() => {
    navigateToUrl(urlInput);
  }, [urlInput, navigateToUrl]);

  const handleNavigationStateChange = useCallback((navState: { url: string; title?: string; canGoBack?: boolean; canGoForward?: boolean }) => {
    setUrlInput(navState.url);
    setCanGoBack(navState.canGoBack || false);
    setCanGoForward(navState.canGoForward || false);
    setIsSecure(navState.url.startsWith('https://'));
    if (navState.title) {
      setPageTitle(navState.title);
    }
    if (id && navState.title && navState.url !== currentUrl) {
      addSession(id, navState.url, navState.title || navState.url);
    }
  }, [id, currentUrl, addSession]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.__bpm) {
        session.applyMessage(data);
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [session]);

  if (!profile) {
    return (
      <SafeAreaView style={styles.notFound}>
        <Feather name="alert-circle" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!session.ready) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading session...</Text>
      </SafeAreaView>
    );
  }

  const fingerprintJS = buildFingerprintJS(profile.fingerprint);
  const sessionJS = session.buildInjectJS();
  const injectedJS = sessionJS + fingerprintJS;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.urlBarContainer}>
          {isSecure && (
            <Feather name="lock" size={12} color={colors.success} style={styles.lockIcon} />
          )}
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={handleSubmitUrl}
            placeholder="Enter URL or search..."
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            selectTextOnFocus
          />
          {isLoading && (
            <ActivityIndicator size="small" color={colors.primary} style={styles.urlSpinner} />
          )}
        </View>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={() => webViewRef.current?.reload()}
        >
          <Feather name="refresh-cw" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      <View style={styles.profileBar}>
        <View style={[styles.profileDot, { backgroundColor: profile.color }]} />
        <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
        <Text style={styles.profilePlatform}>{profile.fingerprint.platform}</Text>
        <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
      </View>

      <View style={styles.webviewContainer}>
        <CompatWebView
          ref={webViewRef}
          uri={currentUrl}
          userAgent={profile.fingerprint.userAgent}
          injectedJavaScriptBeforeContentLoaded={injectedJS}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(err) => {
            setIsLoading(false);
            if (id) setProfileStatus(id, 'error');
          }}
          onProgress={setProgress}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
        />
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
        >
          <Feather name="chevron-left" size={20} color={canGoBack ? colors.text : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
        >
          <Feather name="chevron-right" size={20} color={canGoForward ? colors.text : colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateToUrl(profile.homepageUrl)}
        >
          <Feather name="home" size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push(`/profile/${id}`)}
        >
          <Feather name="sliders" size={18} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push(`/session/${id}`)}
        >
          <Feather name="clock" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  notFoundText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: colors.textSecondary, marginTop: 12 },
  goBackText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.primary, marginTop: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textSecondary, marginTop: 12 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, gap: 6,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  toolbarButton: {
    width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  urlBarContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderRadius: 8, paddingHorizontal: 10, height: 36,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  lockIcon: { marginRight: 6 },
  urlInput: {
    flex: 1, color: colors.text, fontFamily: 'Inter_400Regular', fontSize: 13, paddingVertical: 0,
  },
  urlSpinner: { marginLeft: 6 },
  progressBar: {
    height: 2, backgroundColor: colors.surfaceBorder,
  },
  progressFill: {
    height: 2, backgroundColor: colors.primary,
  },
  profileBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, gap: 8,
  },
  profileDot: { width: 8, height: 8, borderRadius: 4 },
  profileName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text, flex: 1 },
  profilePlatform: { fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.textMuted },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  webviewContainer: { flex: 1 },
  bottomBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.surfaceBorder,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  navButton: {
    width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  navButtonDisabled: { opacity: 0.4 },
});
