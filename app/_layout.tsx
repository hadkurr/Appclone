import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { ProfileProvider } from "../context/ProfileContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { colors } from "../hooks/useColors";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Feather: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <ProfileProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="browser/[id]" options={{ presentation: "card" }} />
          <Stack.Screen name="browser/multi" options={{ presentation: "card" }} />
          <Stack.Screen name="session/[id]" options={{ presentation: "card" }} />
        </Stack>
      </ProfileProvider>
    </ErrorBoundary>
  );
}
