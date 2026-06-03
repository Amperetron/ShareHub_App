import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchActivities, getCurrentProfile, type ActivityItem, type Profile } from '../../lib/api';
import HeaderMenu from '../../components/HeaderMenu';


export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetchActivities(),
      getCurrentProfile(),
    ])
      .then(([rows, profileRow]) => {
        if (mounted) {
          setActivities(rows);
          setProfile(profileRow);
        }
      })
      .catch((error) => {
        Alert.alert('Could not load activity', JSON.stringify(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredActivities = activities.filter((item) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Co-Ride') return item.type === 'ride';
    if (activeFilter === 'Nabourly') return item.type === 'tool';

    return true;
  });

  const FILTERS = ['All', 'Co-Ride', 'Nabourly'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <HeaderMenu avatarUrl={profile?.avatar_url} />
          <Text style={styles.headerBrand}>ShareHub</Text>
        </View>
        <Pressable style={styles.notifBtn} onPress={() => router.push('/notifications')}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:131.png' }}
            style={{ width: 16, height: 20 }}
            contentFit="contain"
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{"What's happening\nnearby?"}</Text>
          <Text style={styles.pageSubtitle}>Community activity in your area</Text>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((chip) => (
            <Pressable
              key={chip}
              style={[styles.chip, activeFilter === chip && styles.chipActive]}
              onPress={() => setActiveFilter(chip)}
            >
              <Text style={[styles.chipText, activeFilter === chip && styles.chipTextActive]}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsRow}
          >
            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/discovery')}
            >
              <LinearGradient
                colors={['#064e3b', '#006156']}
                style={styles.quickActionGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.quickActionEmojiWrap}>
                  <MaterialIcons name="directions-car" size={20} color={Colors.white} />
                </View>
                <Text style={styles.quickActionLabel}>Join a Co-Ride</Text>
                <Text style={styles.quickActionDesc}>Pool & save on your commute</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/tool-share')}
            >
              <LinearGradient
                colors={['#366000', '#497b09']}
                style={styles.quickActionGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.quickActionEmojiWrap}>
                  <MaterialIcons name="build" size={20} color={Colors.white} />
                </View>
                <Text style={styles.quickActionLabel}>Request Nabourly</Text>
                <Text style={styles.quickActionDesc}>Drills, ladders & more nearby</Text>
              </LinearGradient>
            </Pressable>


          </ScrollView>
        </View>

        {/* Activity Feed */}
        <View style={styles.feed}>
          {filteredActivities.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              <Image
                source={{ uri: item.avatar }}
                style={styles.activityAvatar}
                contentFit="cover"
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={{ fontWeight: '700' }}>{item.name}</Text>
                  <Text style={{ fontWeight: '400' }}>{` ${item.action} `}</Text>
                  <Text style={{ fontWeight: '700' }}>{item.target}</Text>
                </Text>
                <Text style={styles.activityMeta}>{item.meta}</Text>
                <View style={[styles.activityBadge, { backgroundColor: item.badgeBg }]}>
                  <Text style={[styles.activityBadgeText, { color: item.badgeColor }]}>
                    {item.badge}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {!loading && filteredActivities.length === 0 ? (
            <View style={styles.activityCard}>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>No activity yet</Text>
                <Text style={styles.activityMeta}>Rows from activity_feed will appear here.</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Load more */}
        <Pressable style={styles.loadMore}>
          <Text style={styles.loadMoreText}>Load more activity</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  quickActions: {
    gap: 12,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  quickActionsRow: {
    gap: 12,
    paddingRight: 24,
  },
  quickActionCard: {
    width: 180,
    height: 160,
    borderRadius: 24,
    overflow: 'hidden',
  },
  quickActionGrad: {
    flex: 1,
    padding: 18,
    justifyContent: 'space-between',
  },
  quickActionEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionEmoji: {
    fontSize: 18,
  },
  quickActionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  quickActionDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 15,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(236,253,245,0.95)',
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8cf5e4',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 96,
    paddingHorizontal: 24,
    gap: 24,
  },
  titleSection: {
    gap: 4,
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 37.5,
    letterSpacing: -0.9,
  },
  pageSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.muted,
    lineHeight: 24,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 24,
  },
  chip: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.inputBg,
  },
  chipActive: {
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
  },
  chipTextActive: {
    color: Colors.white,
  },
  feed: {
    gap: 16,
  },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark,
  },
  activityMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    lineHeight: 16,
  },
  activityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 15,
  },
  loadMore: {
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});
