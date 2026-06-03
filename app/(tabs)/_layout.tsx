import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof MaterialIcons>['name']; focused: boolean }) {
  return (
    <View style={{ position: 'relative', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
      {focused && (
        <View
          style={{
            position: 'absolute',
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#006156',
            opacity: 0.12,
          }}
        />
      )}
      <MaterialIcons
        name={name}
        size={22}
        color={focused ? '#064e3b' : '#64748b'}
      />
    </View>
  );
}

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
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: 'Co-Ride',
          tabBarIcon: ({ focused }) => <TabIcon name="directions-car" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused }) => <TabIcon name="public" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
