import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack initialRouteName="sign-in" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ride-booking" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="tool-share" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="tool-request" options={{ headerShown: false, presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
