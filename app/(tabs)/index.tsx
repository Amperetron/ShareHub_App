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
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { fetchActivities, fetchRides, fetchSearchItems, getCurrentImpact, getCurrentProfile, profileDisplayName, type ActivityItem, type Profile, type RideItem, type SearchItem } from '../../lib/api';
import { updateStreak } from '../../lib/streak';
import { getSessionCount, incrementSessionCount } from '../../lib/session';
import CreateShareModal from '../../components/CreateShareModal';
import RideDetailModal from '../../components/RideDetailModal';
import HeaderMenu from '../../components/HeaderMenu';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const INITIAL_RECENT: string[] = [];

const CATEGORY_ICONS: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  Ride: 'directions-car',
  Tool: 'build',
  Event: 'event',
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

  useEffect(() => {
    if (target > 0) {
      sharedValue.value = withTiming(target, {
        duration: 1600,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      sharedValue.value = 0;
      setDisplay(0);
    }
  }, [target, sharedValue]);

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
  const [streakCount, setStreakCount] = useState(0);
  const [createVisible, setCreateVisible] = useState(false);
  const [nearbyPools, setNearbyPools] = useState<RideItem[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideItem | null>(null);
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);

  const loadHomeData = useCallback(async () => {
    const [items, profileRow, impactRow, activityRows, rides] = await Promise.all([
      fetchSearchItems(),
      getCurrentProfile(),
      getCurrentImpact(),
      fetchActivities(),
      fetchRides(),
    ]);
    setSearchData(items);
    setProfile(profileRow);
    setImpact(impactRow);
    setActivities(activityRows);
    setNearbyPools(rides.slice(0, 3));

    const streak = await updateStreak();
    if (streak !== null) setStreakCount(streak);

    const sessionCount = await incrementSessionCount();
    if (sessionCount % 4 === 0 && !profileRow?.avatar_url) {
      setShowAvatarPrompt(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      loadHomeData()
        .then(() => {
          if (!mounted) return;
        })
        .catch((error) => {
          Alert.alert('Could not load home data', JSON.stringify(error));
        });

      return () => {
        mounted = false;
      };
    }, [loadHomeData])
  );

  // ─── Counter animation state ─────────────────────────────────────────────
  const co2Counter = useCounterAnimation(Math.round(Number(impact?.carbon_saved ?? profile?.carbon_saved ?? 0)), 0);
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
    }
  }, [co2Counter]);

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
          <HeaderMenu avatarUrl={profile?.avatar_url} />
          <View style={styles.headerText}>
            <Text style={styles.headerGreeting}>Namaskara,</Text>
            <Text style={styles.headerName}>{profileDisplayName(profile)}</Text>
          </View>
        </View>
        <Pressable style={styles.notifBtn} onPress={() => router.push('/notifications')}>
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
                <MaterialIcons name="search" size={16} color={Colors.dark} />
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
                    <MaterialIcons name="close" size={10} color={Colors.muted} />
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
                  <MaterialIcons name="search" size={40} color={Colors.muted} />
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try searching for rides or tools
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
                    <MaterialIcons name={CATEGORY_ICONS[item.category] || 'search'} size={18} color={Colors.dark} />
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
                        <MaterialIcons name="history" size={16} color={Colors.muted} />
                        <Text style={styles.recentTerm}>{term}</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemoveRecent(term)}
                        hitSlop={8}
                        style={styles.recentRemove}
                      >
                        <MaterialIcons name="close" size={12} color={Colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.quickSection}>
                <Text style={styles.recentTitle}>Browse by Category</Text>
                <View style={styles.quickGrid}>
                  {([
                    { label: 'Co-Rides', icon: 'directions-car' as const, bg: 'rgba(127,197,253,0.2)', color: '#006496' },
                    { label: 'Nabourly', icon: 'build' as const, bg: 'rgba(73,123,9,0.2)', color: '#366000' },

                    { label: 'Help', icon: 'volunteer-activism' as const, bg: 'rgba(0,97,86,0.1)', color: Colors.primary },
                  ] as const).map((cat) => (
                    <Pressable
                      key={cat.label}
                      style={[styles.quickCard, { backgroundColor: cat.bg }]}
                      onPress={() => setQuery(cat.label)}
                    >
                      <MaterialIcons name={cat.icon} size={28} color={cat.color} />
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
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroText}>
            <Text style={styles.heroRegular}>{'Better things happen\n'}</Text>
            <Text style={styles.heroHighlight}>{'when neighbors\nunite.'}</Text>
          </Text>
        </View>

        {/* Essentials Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Get Started</Text>
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
              <Text style={[styles.cardTitle, { color: '#d5ffa7' }]}>Nabourly</Text>
              <Text style={[styles.cardDesc, { color: '#d5ffa7' }]}>
                {'Request drills or ladders\nfor DIY weekends.'}
              </Text>
              <View style={[styles.cardBtn, { backgroundColor: '#d5ffa7' }]}>
                <Text style={[styles.cardBtnText, { color: '#366000' }]}>Explore</Text>
              </View>
            </Pressable>


          </ScrollView>
        </View>

        {/* Nearby Pools Section */}
        {nearbyPools.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Pools</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discovery')}>
                <Text style={styles.viewAllBtn}>View All</Text>
              </TouchableOpacity>
            </View>
            {nearbyPools.map((ride) => (
              <Pressable
                key={ride.id}
                style={styles.poolCard}
                onPress={() => setSelectedRide(ride)}
              >
                <View style={styles.poolCardTop}>
                  <View style={styles.poolRouteCol}>
                    <Text style={styles.poolRouteLabel}>Departure</Text>
                    <Text style={styles.poolRoute} numberOfLines={2}>{ride.departure}</Text>
                    <Text style={styles.poolTime}>{ride.departureTime}</Text>
                  </View>
                  <View style={styles.poolRouteDivider} />
                  <View style={styles.poolRouteCol}>
                    <Text style={styles.poolRouteLabel}>Arrival</Text>
                    <Text style={styles.poolRoute} numberOfLines={2}>{ride.arrival}</Text>
                    <Text style={styles.poolTime}>{ride.arrivalTime}</Text>
                  </View>
                  <Text style={styles.poolCo2}>-{ride.co2Saving}kg CO₂</Text>
                </View>
                <View style={styles.poolCardBottom}>
                  <Text style={styles.poolDriver}>{ride.driverName}</Text>
                  <Text style={styles.poolSeats}>{ride.seatsLeft} seats · ₹{ride.fare}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Green Footprint Section */}
        <View style={styles.section} onLayout={handleBentoLayout}>
          <Text style={styles.sectionTitle}>Your Green Footprint</Text>

          <View style={styles.bentoGrid}>
            {/* Carbon Saved — animated counter */}
            <View style={[styles.bentoCard, { width: '47%' }]}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:51.png' }}
                style={{ width: 31.5, height: 30 }}
                contentFit="contain"
              />
              <View style={styles.counterRow}>
                <Text style={[styles.bentoNumber, { color: Colors.primary }]}>
                  {co2Counter.display}
                </Text>
                <Text style={[styles.bentoUnit, { color: Colors.primary }]}>kg</Text>
              </View>
              <Text style={styles.bentoLabel}>Carbon Saved</Text>
            </View>

            {/* Day Streak card */}
            <View style={[styles.bentoCard, { width: '47%' }]}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:336.png' }}
                style={{ width: 31.5, height: 30 }}
                contentFit="contain"
              />
              <View style={styles.counterRow}>
                <Text style={[styles.bentoNumber, { color: '#d97706' }]}>
                  {streakCount}
                </Text>
              </View>
              <Text style={styles.bentoLabel}>Day Streak</Text>
            </View>

            {/* Community Badge */}
            <Pressable style={[styles.bentoDark, { width: '100%' }]} onPress={() => router.push('/(tabs)/profile')}>
              <View style={styles.bentoDarkContent}>
                <Text style={styles.bentoDarkTitle}>View your contribution to the society</Text>
                <Text style={styles.bentoDarkDesc}>
                  {'Track your impact on the community.'}
                </Text>
              </View>
              <View style={styles.bentoDarkBadge}>
                <MaterialIcons name="eco" size={24} color="#a7f3d0" />
              </View>
            </Pressable>
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

      <RideDetailModal
        visible={selectedRide !== null}
        onClose={() => setSelectedRide(null)}
        onJoin={() => {
          if (!selectedRide) return;
          setSelectedRide(null);
          router.push({
            pathname: '/ride-booking',
            params: {
              rideId: selectedRide.id,
              driverName: selectedRide.driverName,
              driverAvatar: selectedRide.driverAvatar,
              driverRating: selectedRide.driverRating,
              driverRides: selectedRide.driverRides,
              departure: selectedRide.departure,
              arrival: selectedRide.arrival,
              departureLat: selectedRide.departureLat ?? '',
              departureLng: selectedRide.departureLng ?? '',
              arrivalLat: selectedRide.arrivalLat ?? '',
              arrivalLng: selectedRide.arrivalLng ?? '',
              distanceKm: selectedRide.distanceKm ?? '',
              departureTime: selectedRide.departureTime,
              arrivalTime: selectedRide.arrivalTime,
              co2Saving: selectedRide.co2Saving,
              fare: selectedRide.fare,
              seatsLeft: selectedRide.seatsLeft,
              vehicleName: selectedRide.vehicleName,
              vehicleNumber: selectedRide.vehicleNumber,
            },
          });
        }}
        ride={selectedRide ? {
          id: selectedRide.id,
          driverName: selectedRide.driverName,
          driverAvatar: selectedRide.driverAvatar,
          driverRating: selectedRide.driverRating,
          driverRides: selectedRide.driverRides,
          departure: selectedRide.departure,
          arrival: selectedRide.arrival,
          departureLat: selectedRide.departureLat,
          departureLng: selectedRide.departureLng,
          arrivalLat: selectedRide.arrivalLat,
          arrivalLng: selectedRide.arrivalLng,
          distanceKm: selectedRide.distanceKm,
          departureTime: selectedRide.departureTime,
          arrivalTime: selectedRide.arrivalTime,
          co2Saving: selectedRide.co2Saving,
          fare: selectedRide.fare,
          seatsLeft: selectedRide.seatsLeft,
          vehicleName: selectedRide.vehicleName,
          vehicleNumber: selectedRide.vehicleNumber,
        } : {
          id: '', driverName: '', driverAvatar: '', driverRating: '', driverRides: '',
          departure: '', arrival: '', departureLat: null, departureLng: null,
          arrivalLat: null, arrivalLng: null, distanceKm: null, departureTime: '',
          arrivalTime: '', co2Saving: '', fare: '', seatsLeft: '', vehicleName: '', vehicleNumber: '',
        }}
      />

      <Modal visible={showAvatarPrompt} transparent animationType="fade">
        <View style={styles.avatarPromptOverlay}>
          <View style={styles.avatarPromptCard}>
            <Text style={styles.avatarPromptTitle}>Set Your Profile Picture</Text>
            <Text style={styles.avatarPromptDesc}>
              A profile picture helps your neighbors recognize you in the community. Would you like to add one?
            </Text>
            <View style={styles.avatarPromptActions}>
              <Pressable
                style={styles.avatarPromptBtn}
                onPress={() => { setShowAvatarPrompt(false); router.push('/account-settings'); }}
              >
                <Text style={styles.avatarPromptBtnText}>Set Picture</Text>
              </Pressable>
              <Pressable
                style={styles.avatarPromptSkip}
                onPress={() => setShowAvatarPrompt(false)}
              >
                <Text style={styles.avatarPromptSkipText}>Not Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  recentTerm: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.dark,
    lineHeight: 22,
  },
  recentRemove: {
    padding: 4,
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
  poolCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  poolCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  poolRouteCol: {
    flex: 1,
    gap: 2,
  },
  poolRouteLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  poolRoute: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  poolTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  poolRouteDivider: {
    width: 1,
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
    marginTop: 2,
  },
  poolCo2: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenDeep,
    backgroundColor: 'rgba(0,97,86,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  poolCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolDriver: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkMid,
  },
  poolSeats: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
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

  // ─── Avatar Prompt Modal ──────────────────────────────────────────────────
  avatarPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  avatarPromptCard: {
    backgroundColor: Colors.white,
    borderRadius: 32,
    padding: 32,
    gap: 16,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  avatarPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
  },
  avatarPromptDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  avatarPromptActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  avatarPromptBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  avatarPromptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  avatarPromptSkip: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarPromptSkipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
  },
});

