import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ProfileProvider } from '../context/ProfileContext';
import ErrorBoundary from '../components/ErrorBoundary';
import colors from '../hooks/useColors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    MaterialIcons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
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
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="profile/[id]"
            options={{
              title: 'Edit Profile',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="browser/[id]"
            options={{
              title: 'Browser',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="browser/multi"
            options={{
              title: 'Multi Browser',
              headerShown: false,
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="session/[id]"
            options={{
              title: 'Session History',
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="game/index"
            options={{
              title: 'GTA Vice City',
              headerShown: false,
              presentation: 'card',
            }}
          />
        </Stack>
      </ProfileProvider>
    </ErrorBoundary>
  );
}
