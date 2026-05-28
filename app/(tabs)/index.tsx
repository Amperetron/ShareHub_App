import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  TextInput,
  FlatList,
  Keyboard,
  Dimensions,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import { fetchActivities, fetchSearchItems, getCurrentImpact, getCurrentProfile, profileDisplayName, type ActivityItem, type Profile, type SearchItem } from '../../lib/api';
import CreateShareModal from '../../components/CreateShareModal';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const INITIAL_RECENT: string[] = [];

const CATEGORY_ICONS: Record<string, string> = {
  Ride: '🚗',
  Tool: '🔧',
  Event: '🌱',
};

// ─── Animated Counter Hook ───────────────────────────────────────────────────
function useCounterAnimation(target: number, delay: number = 0) {
  const sharedValue = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useAnimatedReaction(
    () => Math.round(sharedValue.value),
    (current) => {
      runOnJS(setDisplay)(current);
    }
  );

  const trigger = useCallback(() => {
    sharedValue.value = withDelay(
      delay,
      withTiming(target, {
        duration: 1600,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [sharedValue, target, delay]);

  const reset = useCallback(() => {
    sharedValue.value = 0;
    setDisplay(0);
  }, [sharedValue]);

  return { display, trigger, reset };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(INITIAL_RECENT);
  const [searchData, setSearchData] = useState<SearchItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [impact, setImpact] = useState<any>(null);
  const [createVisible, setCreateVisible] = useState(false);

  const loadHomeData = useCallback(async () => {
    const [items, profileRow, impactRow, activityRows] = await Promise.all([
      fetchSearchItems(),
      getCurrentProfile(),
      getCurrentImpact(),
      fetchActivities(),
    ]);
    setSearchData(items);
    setProfile(profileRow);
    setImpact(impactRow);
    setActivities(activityRows);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadHomeData()
      .then(() => {
        if (!mounted) return;
      })
      .catch((error) => {
        Alert.alert('Could not load home data', error instanceof Error ? error.message : 'Please try again.');
      });

    return () => {
      mounted = false;
    };
  }, [loadHomeData]);

  // ─── Counter animation state ─────────────────────────────────────────────
  const co2Counter = useCounterAnimation(Math.round(Number(impact?.carbon_saved ?? 0)), 0);
  const waterCounter = useCounterAnimation(Math.round(Number(impact?.water_saved ?? 0)), 180);
  const hasAnimatedRef = useRef(false);

  // Track bento section position and scroll offset
  const bentoSectionY = useRef<number>(0);
  const scrollY = useRef<number>(0);

  const checkAndTrigger = useCallback(() => {
    if (hasAnimatedRef.current) return;
    // Trigger when the bento section top is within the bottom 80% of screen
    const visibleThreshold = scrollY.current + SCREEN_HEIGHT * 0.85;
    if (bentoSectionY.current <= visibleThreshold) {
      hasAnimatedRef.current = true;
      co2Counter.trigger();
      waterCounter.trigger();
    }
  }, [co2Counter, waterCounter]);

  const handleBentoLayout = useCallback((event: any) => {
    const { y } = event.nativeEvent.layout;
    // The scroll content starts at paddingTop: 96, so we offset accordingly
    bentoSectionY.current = y + 96;
    checkAndTrigger();
  }, [checkAndTrigger]);

  const handleScroll = useCallback((event: any) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    checkAndTrigger();
  }, [checkAndTrigger]);

  const isOverlayVisible = focused;

  const filteredResults = query.trim().length > 0
    ? searchData.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()) ||
          item.tag.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleSelectResult = useCallback((title: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r !== title);
      return [title, ...filtered].slice(0, 6);
    });
    setQuery(title);
    setFocused(false);
    Keyboard.dismiss();
  }, []);

  const handleSelectRecent = useCallback((term: string) => {
    setQuery(term);
    inputRef.current?.focus();
  }, []);

  const handleRemoveRecent = useCallback((term: string) => {
    setRecentSearches((prev) => prev.filter((r) => r !== term));
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    setQuery('');
    setFocused(false);
    Keyboard.dismiss();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBorder}>
            <Image
              source={{ uri: profile?.avatar_url || 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/b117e6a3283d05781cdb00ec910eb9c43edccf2a.jpg' }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerGreeting}>Namaskara,</Text>
            <Text style={styles.headerName}>{profileDisplayName(profile)}</Text>
          </View>
        </View>
        <Pressable style={styles.notifBtn}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:131.png' }}
            style={{ width: 16, height: 20 }}
            contentFit="contain"
          />
        </Pressable>
      </View>

      {/* Search Overlay */}
      {isOverlayVisible ? (
        <View style={[styles.overlayContainer, { paddingTop: insets.top + 80 }]}>
          <View style={styles.overlaySearchRow}>
            <View style={styles.overlaySearchBar}>
              <View style={styles.searchIcon}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
              </View>
              <TextInput
                ref={inputRef}
                style={styles.overlayInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Find a ride, drill, or help..."
                placeholderTextColor="#9ca3af"
                autoFocus
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (query.trim()) handleSelectResult(query.trim());
                }}
              />
              {query.length > 0 ? (
                <Pressable onPress={handleClearSearch} style={styles.clearBtn} hitSlop={8}>
                  <View style={styles.clearIconWrap}>
                    <Text style={styles.clearIconText}>✕</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          {query.trim().length > 0 ? (
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try searching for rides, tools, or events
                  </Text>
                </View>
              }
              ListHeaderComponent={
                filteredResults.length > 0 ? (
                  <Text style={styles.resultsCount}>
                    {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
                  </Text>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.7 }]}
                  onPress={() => handleSelectResult(item.title)}
                >
                  <View style={styles.resultIconWrap}>
                    <Text style={styles.resultIcon}>{CATEGORY_ICONS[item.category]}</Text>
                  </View>
                  <View style={styles.resultContent}>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={[styles.resultTag, { backgroundColor: item.tagBg }]}>
                    <Text style={[styles.resultTagText, { color: item.tagColor }]}>{item.tag}</Text>
                  </View>
                </Pressable>
              )}
            />
          ) : (
            <ScrollView
              style={styles.resultsList}
              contentContainerStyle={styles.resultsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {recentSearches.length > 0 && (
                <View>
                  <View style={styles.recentHeader}>
                    <Text style={styles.recentTitle}>Recent Searches</Text>
                    <Pressable onPress={() => setRecentSearches([])}>
                      <Text style={styles.clearAllText}>Clear all</Text>
                    </Pressable>
                  </View>
                  {recentSearches.map((term) => (
                    <View key={term} style={styles.recentItem}>
                      <Pressable
                        style={styles.recentLeft}
                        onPress={() => handleSelectRecent(term)}
                      >
                        <Text style={styles.recentClockIcon}>🕐</Text>
                        <Text style={styles.recentTerm}>{term}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemoveRecent(term)}
                        hitSlop={8}
                        style={styles.recentRemove}
                      >
                        <Text style={styles.recentRemoveText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.quickSection}>
                <Text style={styles.recentTitle}>Browse by Category</Text>
                <View style={styles.quickGrid}>
                  {[
                    { label: 'Co-Rides', icon: '🚗', bg: 'rgba(127,197,253,0.2)', color: '#006496' },
                    { label: 'Tool Share', icon: '🔧', bg: 'rgba(73,123,9,0.2)', color: '#366000' },
                    { label: 'Events', icon: '🌱', bg: 'rgba(140,245,228,0.3)', color: '#00201c' },
                    { label: 'Help', icon: '🤝', bg: 'rgba(0,97,86,0.1)', color: Colors.primary },
                  ].map((cat) => (
                    <Pressable
                      key={cat.label}
                      style={[styles.quickCard, { backgroundColor: cat.bg }]}
                      onPress={() => setQuery(cat.label)}
                    >
                      <Text style={styles.quickIcon}>{cat.icon}</Text>
                      <Text style={[styles.quickLabel, { color: cat.color }]}>{cat.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        pointerEvents={isOverlayVisible ? 'none' : 'auto'}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Hero Search Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroText}>
            <Text style={styles.heroRegular}>{'Better things\nhappen\n'}</Text>
            <Text style={styles.heroHighlight}>{'when neighbors\nunite.'}</Text>
          </Text>

          <Pressable
            style={styles.searchBar}
            onPress={() => {
              setFocused(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            accessibilityLabel="Search rides, tools and community activities"
          >
            <View style={styles.searchIcon}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
            </View>
            <Text style={styles.searchPlaceholder}>
              {query.length > 0 ? query : 'Find a ride to Indiranagar, a drill, or help...'}
            </Text>
            {query.length > 0 && (
              <View style={[styles.resultTag, { backgroundColor: '#d1fae5' }]}>
                <Text style={[styles.resultTagText, { color: Colors.primary }]}>Active</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Essentials Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Community Essentials</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllBtn}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsRow}
          >
            {/* Co-Ride Card */}
            <Pressable
              style={[styles.serviceCard, { backgroundColor: '#7fc5fd' }]}
              onPress={() => router.push('/(tabs)/discovery')}
            >
              <View style={styles.cardIconBg}>
                <Image
                  source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:23.png' }}
                  style={{ width: 96, height: 85.3, position: 'absolute', right: -10, bottom: -10 }}
                  contentFit="contain"
                />
              </View>
              <View style={styles.cardBadge}>
                <Text style={[styles.cardBadgeText, { color: '#00517b' }]}>Shared Route</Text>
              </View>
              <Text style={[styles.cardTitle, { color: '#00517b' }]}>Co-Ride</Text>
              <Text style={[styles.cardDesc, { color: '#00517b' }]}>
                {'Beat the Silk Board\ntraffic together.'}
              </Text>
              <View style={[styles.cardBtn, { backgroundColor: '#00517b' }]}>
                <Text style={[styles.cardBtnText, { color: '#ffffff' }]}>Book Now</Text>
              </View>
            </Pressable>

            {/* Tool Share Card */}
            <Pressable style={[styles.serviceCard, { backgroundColor: '#497b09', marginLeft: 16 }]} onPress={() => router.push('/tool-share')}>
              <View style={styles.cardIconBg}>
                <Image
                  source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:35.png' }}
                  style={{ width: 98.8, height: 96, position: 'absolute', right: -10, bottom: -10 }}
                  contentFit="contain"
                />
              </View>
              <View style={[styles.cardBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.cardBadgeText, { color: '#d5ffa7' }]}>Community Hub</Text>
              </View>
              <Text style={[styles.cardTitle, { color: '#d5ffa7' }]}>Tool Share</Text>
              <Text style={[styles.cardDesc, { color: '#d5ffa7' }]}>
                {'Borrow drills or ladders\nfor DIY weekends.'}
              </Text>
              <View style={[styles.cardBtn, { backgroundColor: '#d5ffa7' }]}>
                <Text style={[styles.cardBtnText, { color: '#366000' }]}>Explore</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* Green Footprint Section */}
        <View style={styles.section} onLayout={handleBentoLayout}>
          <Text style={styles.sectionTitle}>Your Green Footprint</Text>

          <View style={styles.bentoGrid}>
            {/* CO2 Saved — animated counter */}
            <View style={[styles.bentoCard, { width: '47%' }]}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:51.png' }}
                style={{ width: '100%', height: 21.3 }}
                contentFit="contain"
              />
              <View style={styles.counterRow}>
                <Text style={[styles.bentoNumber, { color: Colors.primary }]}>
                  {co2Counter.display}
                </Text>
                <Text style={[styles.bentoUnit, { color: Colors.primary }]}>kg</Text>
              </View>
              <Text style={styles.bentoLabel}>CO2 Saved</Text>
            </View>

            {/* Water Saved — animated counter */}
            <View style={[styles.bentoCard, { width: '47%' }]}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:58.png' }}
                style={{ width: '100%', height: 25 }}
                contentFit="contain"
              />
              <View style={styles.counterRow}>
                <Text style={[styles.bentoNumber, { color: Colors.blueMid }]}>
                  {waterCounter.display}
                </Text>
                <Text style={[styles.bentoUnit, { color: Colors.blueMid }]}>L</Text>
              </View>
              <Text style={styles.bentoLabel}>Water Saved</Text>
            </View>

            {/* Community Badge */}
            <View style={[styles.bentoDark, { width: '100%' }]}>
              <View style={styles.bentoDarkContent}>
                <Text style={styles.bentoDarkMilestone}>Verified Milestone</Text>
                <Text style={styles.bentoDarkTitle}>Community Hero Badge</Text>
                <Text style={styles.bentoDarkDesc}>
                  {'Sustainable activity updates from your profile.'}
                </Text>
              </View>
              <View style={styles.bentoDarkBadge}>
                <Image
                  source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:72.png' }}
                  style={{ width: 20, height: 26.2 }}
                  contentFit="contain"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Community Activity Feed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"What's happening nearby?"}</Text>

          <View style={styles.activityList}>
            {activities.map((item) => (
              <View key={item.id} style={styles.activityCard}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.activityAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.activityAvatar, styles.activityAvatarFallback]}>
                    <Text style={styles.activityAvatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    <Text style={{ fontWeight: '700' }}>{item.name}</Text>
                    <Text style={{ fontWeight: '400' }}>{` ${item.action} `}</Text>
                    <Text style={{ fontWeight: '700' }}>{item.target}</Text>
                  </Text>
                  <Text style={styles.activityMeta}>{item.meta}</Text>
                  <View style={[styles.activityBadge, { backgroundColor: item.badgeBg }]}>
                    <Text style={[styles.activityBadgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                  </View>
                </View>
              </View>
            ))}
            {activities.length === 0 ? (
              <View style={styles.activityCard}>
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>No activity yet</Text>
                  <Text style={styles.activityMeta}>Create a ride, item, or event to start the feed.</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      {!isOverlayVisible ? (
        <Pressable style={[styles.fab, { bottom: insets.bottom + 90 }]} onPress={() => setCreateVisible(true)}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:118.png' }}
            style={{ width: 17.5, height: 17.5 }}
            contentFit="contain"
          />
        </Pressable>
      ) : null}

      <CreateShareModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={loadHomeData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
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
    borderColor: Colors.primary,
    backgroundColor: Colors.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerText: {
    flexDirection: 'column',
  },
  headerGreeting: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    opacity: 0.7,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 32,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Search Overlay ───────────────────────────────────────────────────────
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 150,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
  },
  overlaySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  overlaySearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    gap: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  overlayInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: Colors.dark,
    padding: 0,
    includeFontPadding: false,
  },
  clearBtn: {
    padding: 2,
  },
  clearIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIconText: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ─── Results ──────────────────────────────────────────────────────────────
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    paddingTop: 12,
    paddingBottom: 40,
    gap: 0,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  resultIcon: {
    fontSize: 18,
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 22,
  },
  resultSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    lineHeight: 16,
  },
  resultTag: {
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resultTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 28,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },

  // ─── Recent Searches ──────────────────────────────────────────────────────
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.8,
  },
  clearAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 4,
  },
  recentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recentClockIcon: {
    fontSize: 16,
  },
  recentTerm: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark,
    lineHeight: 22,
  },
  recentRemove: {
    padding: 4,
  },
  recentRemoveText: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '600',
  },

  // ─── Quick Categories ─────────────────────────────────────────────────────
  quickSection: {
    marginTop: 24,
    gap: 12,
    paddingHorizontal: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    fontSize: 28,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  // ─── Main Scroll ──────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 96,
    paddingHorizontal: 24,
    gap: 32,
  },
  heroSection: {
    gap: 24,
    paddingTop: 16,
  },
  heroText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 45,
    color: Colors.dark,
  },
  heroRegular: {
    color: Colors.dark,
    fontWeight: '400',
  },
  heroHighlight: {
    color: Colors.primaryLight,
    fontWeight: '800',
  },
  searchBar: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 17,
    gap: 12,
  },
  searchIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    fontSize: 16,
    fontWeight: '400',
    color: '#6b7280',
    flex: 1,
    lineHeight: 21.9,
  },

  // ─── Sections ─────────────────────────────────────────────────────────────
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 28,
  },
  viewAllBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006156',
    lineHeight: 20,
  },
  cardsRow: {
    paddingRight: 24,
  },
  serviceCard: {
    width: 280,
    height: 192,
    borderRadius: 32,
    padding: 24,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 40,
      },
      android: { elevation: 10 },
    }),
  },
  cardIconBg: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 120,
    height: 120,
  },
  cardBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  cardDesc: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardBtn: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  // ─── Bento ────────────────────────────────────────────────────────────────
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  bentoCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 32,
    padding: 24,
    gap: 8,
  },
  // Animated counter row: number + unit side by side, baseline-aligned
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bentoNumber: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  bentoUnit: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    opacity: 0.7,
  },
  bentoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
  },
  bentoDark: {
    backgroundColor: '#064e3b',
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bentoDarkContent: {
    flex: 1,
  },
  bentoDarkMilestone: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    opacity: 0.6,
    letterSpacing: 2,
    marginBottom: 4,
  },
  bentoDarkTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 4,
  },
  bentoDarkDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#a7f3d0',
    lineHeight: 20,
  },
  bentoDarkBadge: {
    width: 54.6,
    height: 64,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Activity Feed ────────────────────────────────────────────────────────
  activityList: {
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
  activityAvatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
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
  activityJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  activityJoinedText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 15,
  },

  // ─── FAB ──────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.5,
        shadowRadius: 50,
      },
      android: { elevation: 16 },
    }),
  },
});

