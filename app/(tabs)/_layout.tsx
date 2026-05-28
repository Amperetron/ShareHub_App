import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const HomeIcon = ({ color }: { color: string }) => (
  <Image
    source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:135.png' }}
    style={{ width: 16, height: 18, tintColor: color }}
    contentFit="contain"
  />
);

const RideIcon = ({ color }: { color: string }) => (
  <Image
    source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:140.png' }}
    style={{ width: 18, height: 16, tintColor: color }}
    contentFit="contain"
  />
);

const ActivityIcon = ({ color }: { color: string }) => (
  <Image
    source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:145.png' }}
    style={{ width: 22, height: 16, tintColor: color }}
    contentFit="contain"
  />
);

const ProfileIcon = ({ color }: { color: string }) => (
  <Image
    source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:150.png' }}
    style={{ width: 16, height: 16, tintColor: color }}
    contentFit="contain"
  />
);

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const tabBarStyle = {
    height: Platform.select({
      ios: insets.bottom + 75,
      android: insets.bottom + 75,
      default: 85,
    }),
    paddingTop: 16,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      android: insets.bottom + 8,
      default: 32,
    }),
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 0,
    shadowColor: '#181d1b',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 20,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#064e3b',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.1,
          marginTop: 4,
        },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarItemStyle: {
          paddingVertical: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
          tabBarActiveTintColor: '#064e3b',
          tabBarActiveBackgroundColor: '#d1fae5',
          tabBarItemStyle: {
            borderRadius: 24,
            marginHorizontal: 2,
          },
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: 'Co-Ride',
          tabBarIcon: ({ color }) => <RideIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <ActivityIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
