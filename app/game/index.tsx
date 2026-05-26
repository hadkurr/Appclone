import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const gameHtml = require('../../assets/game/gta6.html');

export default function GameScreen() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={typeof gameHtml === 'number' ? '' : (gameHtml as { uri: string }).uri}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={gameHtml}
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
});
