import React, { useEffect, useState } from 'react';
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
import { Colors } from '../../constants/theme';
import { fetchActivities, type ActivityItem } from '../../lib/api';


export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchActivities()
      .then((rows) => {
        if (mounted) setActivities(rows);
      })
      .catch((error) => {
        Alert.alert('Could not load activity', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBorder}>
            <Image
              source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/b117e6a3283d05781cdb00ec910eb9c43edccf2a.jpg' }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          </View>
          <Text style={styles.headerBrand}>Neighborly</Text>
        </View>
        <Pressable style={styles.notifBtn}>
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
          {['All', 'Rides', 'Tools', 'Events', 'Help'].map((chip, i) => (
            <Pressable
              key={chip}
              style={[styles.chip, i === 0 && styles.chipActive]}
            >
              <Text style={[styles.chipText, i === 0 && styles.chipTextActive]}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Activity Feed */}
        <View style={styles.feed}>
          {activities.map((item) => (
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
          {!loading && activities.length === 0 ? (
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

