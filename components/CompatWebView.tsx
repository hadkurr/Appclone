import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView, WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';

export interface CompatWebViewRef {
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
  injectJavaScript: (js: string) => void;
}

interface CompatWebViewProps {
  uri: string;
  userAgent?: string;
  injectedJavaScriptBeforeContentLoaded?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
  onNavigationStateChange?: (navState: WebViewNavigation) => void;
  onMessage?: (event: WebViewMessageEvent) => void;
  style?: object;
}

const CompatWebView = forwardRef<CompatWebViewRef, CompatWebViewProps>((props, ref) => {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useImperativeHandle(ref, () => ({
    reload: () => {
      if (Platform.OS === 'web') {
        if (iframeRef.current) {
          iframeRef.current.src = iframeRef.current.src;
        }
      } else {
        webViewRef.current?.reload();
      }
    },
    goBack: () => {
      if (Platform.OS === 'web') {
        try {
          iframeRef.current?.contentWindow?.history.back();
        } catch {
          // cross-origin
        }
      } else {
        webViewRef.current?.goBack();
      }
    },
    goForward: () => {
      if (Platform.OS === 'web') {
        try {
          iframeRef.current?.contentWindow?.history.forward();
        } catch {
          // cross-origin
        }
      } else {
        webViewRef.current?.goForward();
      }
    },
    injectJavaScript: (js: string) => {
      if (Platform.OS === 'web') {
        try {
          (iframeRef.current?.contentWindow as Window & { eval: (code: string) => unknown })?.eval(js);
        } catch {
          // cross-origin
        }
      } else {
        webViewRef.current?.injectJavaScript(js);
      }
    },
  }));

  const handleLoadStart = useCallback(() => {
    props.onLoadStart?.();
  }, [props.onLoadStart]);

  const handleLoadEnd = useCallback(() => {
    props.onLoadEnd?.();
  }, [props.onLoadEnd]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, props.style]}>
        <iframe
          ref={(el: HTMLIFrameElement | null) => { iframeRef.current = el; }}
          src={props.uri}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          onLoad={() => handleLoadEnd()}
        />
      </View>
    );
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: props.uri }}
      userAgent={props.userAgent}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      domStorageEnabled={true}
      cacheEnabled={true}
      javaScriptEnabled={true}
      injectedJavaScriptBeforeContentLoaded={props.injectedJavaScriptBeforeContentLoaded}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
      onError={(syntheticEvent) => {
        props.onError?.(syntheticEvent.nativeEvent.description || 'Unknown error');
      }}
      onLoadProgress={({ nativeEvent }) => {
        props.onProgress?.(nativeEvent.progress);
      }}
      onNavigationStateChange={props.onNavigationStateChange}
      onMessage={props.onMessage}
      style={[styles.container, props.style]}
      allowsBackForwardNavigationGestures={true}
      allowsInlineMediaPlayback={true}
      mediaPlaybackRequiresUserAction={false}
    />
  );
});

CompatWebView.displayName = 'CompatWebView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CompatWebView;
