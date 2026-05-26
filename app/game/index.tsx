import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';

const gameModule = require('../../assets/game/gta6.html');

export default function GameScreen() {
  const [gameUri, setGameUri] = useState<string | null>(null);

  useEffect(() => {
    async function loadAsset() {
      const asset = Asset.fromModule(gameModule);
      await asset.downloadAsync();
      if (asset.localUri) {
        setGameUri(asset.localUri);
      }
    }
    loadAsset();
  }, []);

  if (Platform.OS === 'web') {
    const asset = Asset.fromModule(gameModule);
    return (
      <View style={styles.container}>
        <iframe
          src={asset.uri}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay"
        />
      </View>
    );
  }

  if (!gameUri) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading Vice City...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: gameUri }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        scalesPageToFit={false}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a14',
  },
  loading: {
    flex: 1,
    backgroundColor: '#0a0a14',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#e2e8f0',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
});
