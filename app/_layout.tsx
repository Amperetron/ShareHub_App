import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }) as any,
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      'Material Icons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf'),
    })
      .then(() => setReady(true))
      .catch(() => setReady(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
      } as any);
    }
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack initialRouteName="sign-in" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ride-route" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="ride-booking" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="tool-share" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="tool-request" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="ride-detail" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="coride-manage" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="nabourly-detail" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="account-settings" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
