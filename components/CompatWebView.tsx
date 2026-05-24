import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { WebView, WebViewMessageEvent, WebViewNavigation } from "react-native-webview";

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

export const CompatWebView = forwardRef<CompatWebViewRef, CompatWebViewProps>(
  (props, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      reload: () => webViewRef.current?.reload(),
      goBack: () => webViewRef.current?.goBack(),
      goForward: () => webViewRef.current?.goForward(),
      injectJavaScript: (js: string) => webViewRef.current?.injectJavaScript(js),
    }));

    if (Platform.OS === "web") {
      return (
        <View style={[styles.container, props.style]}>
          <iframe
            src={props.uri}
            style={{ width: "100%", height: "100%", border: "none" } as React.CSSProperties}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="browser-frame"
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
        onLoadStart={props.onLoadStart}
        onLoadEnd={props.onLoadEnd}
        onError={(e) => props.onError?.(e.nativeEvent.description)}
        onLoadProgress={({ nativeEvent }) => props.onProgress?.(nativeEvent.progress)}
        onNavigationStateChange={props.onNavigationStateChange}
        onMessage={props.onMessage}
        style={[styles.container, props.style]}
        allowsBackForwardNavigationGestures={true}
      />
    );
  }
);

CompatWebView.displayName = "CompatWebView";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
