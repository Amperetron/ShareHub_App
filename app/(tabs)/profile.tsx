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
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { getCurrentImpact, getCurrentProfile, fetchUserBookings, fetchUserRides, fetchUserToolRequests, fetchUserTools, profileDisplayName, type Profile } from '../../lib/api';
import { updateStreak } from '../../lib/streak';
import HeaderMenu from '../../components/HeaderMenu';

type Tab = 'Active' | 'Completed' | 'Cancelled';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [impact, setImpact] = useState<any>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('Active');
  const [bookings, setBookings] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [toolRequests, setToolRequests] = useState<any[]>([]);
  const [userTools, setUserTools] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const [profileRow, impactRow, streak] = await Promise.all([
        getCurrentProfile(),
        getCurrentImpact(),
        updateStreak(),
      ]);
      setProfile(profileRow);
      setImpact(impactRow);
      if (streak !== null) setStreakCount(streak);
    } catch (error) {
      Alert.alert('Could not load profile', JSON.stringify(error));
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoadingActivity(true);
      loadProfile();
      Promise.all([
        fetchUserBookings().catch(() => []),
        fetchUserRides().catch(() => []),
        fetchUserToolRequests().catch(() => []),
        fetchUserTools().catch(() => []),
      ]).then(([bookingRows, rideRows, requestRows, toolRows]) => {
        if (!mounted) return;
        setBookings(bookingRows);
        setRides(rideRows);
        setToolRequests(requestRows);
        setUserTools(toolRows);
      }).finally(() => { if (mounted) setLoadingActivity(false); });
      return () => { mounted = false; };
    }, [])
  );

  const filteredBookings = bookings.filter((b: any) => {
    if (activeTab === 'Active') return b.status === 'pending' || b.status === 'confirmed';
    if (activeTab === 'Completed') return b.status === 'completed';
    if (activeTab === 'Cancelled') return b.status === 'cancelled';
    return true;
  });

  const filteredRides = rides.filter((r: any) => {
    if (activeTab === 'Active') return r.status === 'active';
    if (activeTab === 'Completed') return r.status === 'completed';
    if (activeTab === 'Cancelled') return r.status === 'cancelled';
    return true;
  });

  const filteredToolRequests = toolRequests.filter((t: any) => {
    if (activeTab === 'Active') return t.status === 'pending' || t.status === 'approved';
    if (activeTab === 'Completed') return t.status === 'returned';
    if (activeTab === 'Cancelled') return t.status === 'rejected';
    return true;
  });

  const activeUserTools = activeTab === 'Active' ? userTools.filter((t: any) => t.available) : [];

  const TABS: Tab[] = ['Active', 'Completed', 'Cancelled'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'rgba(251,191,36,0.15)', text: '#b45309' };
      case 'confirmed': return { bg: 'rgba(0,97,86,0.1)', text: Colors.primary };
      case 'active': return { bg: 'rgba(0,97,86,0.1)', text: Colors.primary };
      case 'completed': return { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' };
      case 'cancelled': return { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' };
      default: return { bg: Colors.surface, text: Colors.muted };
    }
  };

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
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:441.png' }}
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
        {/* Profile Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.memberBadge]}>
            <Text style={styles.memberBadgeText}>Community Member</Text>
          </View>
          <Text style={styles.profileName}>{profileDisplayName(profile)}</Text>
          <Text style={styles.profileBio}>
            {profile?.bio ?? profile?.location ?? 'Building a greener, more connected neighborhood.'}
          </Text>
        </View>

        {/* Impact Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Carbon Saved - tall card */}
          <View style={[styles.carbonCard]}>
            <View style={styles.carbonDecor} />
            <View style={styles.carbonContent}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:354.png' }}
                style={{ width: 25.6, height: 25.5 }}
                contentFit="contain"
              />
              <Text style={styles.carbonLabel}>Carbon Saved</Text>
            </View>
            <View style={styles.carbonNumber}>
              <Text style={styles.carbonValue}>{Math.round(Number(impact?.carbon_saved ?? profile?.carbon_saved ?? 0))}</Text>
              <Text style={styles.carbonUnit}>kg</Text>
            </View>
          </View>

          {/* Streak Card */}
          <View style={[styles.sharesCard]}>
            <View style={styles.sharesContent}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:336.png' }}
                style={{ width: 25.6, height: 25.5 }}
                contentFit="contain"
              />
              <Text style={styles.sharesLabel}>Day Streak</Text>
            </View>
            <View>
              <Text style={styles.sharesValue}>{streakCount}</Text>
              <Text style={styles.sharesSubLabel}>Consecutive days active</Text>
            </View>
          </View>

          {/* Account Settings Link */}
          <Pressable style={styles.trustBadge} onPress={() => router.push('/account-settings')}>
            <View style={styles.trustIcon}>
              <MaterialIcons name="settings" size={24} color={Colors.white} />
            </View>
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>Account Settings</Text>
              <Text style={styles.trustDesc}>Update profile, password, or picture</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={Colors.muted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>

          {/* Tab Bar */}
          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                  {tab === 'Active' && (
                  <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                      {bookings.filter((b: any) => b.status === 'pending' || b.status === 'confirmed').length +
                       rides.filter((r: any) => r.status === 'active').length +
                       toolRequests.filter((t: any) => t.status === 'pending' || t.status === 'approved').length +
                       userTools.filter((t: any) => t.available).length}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Bookings */}
          {filteredBookings.map((booking: any) => {
            const statusStyle = getStatusColor(booking.status);
            return (
              <Pressable
                key={booking.id}
                style={styles.activityCard}
                onPress={() => router.push({
                  pathname: '/ride-detail',
                  params: { rideId: booking.ride_id, bookingId: booking.id, role: 'passenger' },
                })}
              >
                <View style={styles.activityCardRow}>
                  <View style={styles.activityCardIcon}>
                    <MaterialIcons name="directions-car" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityCardTitle} numberOfLines={1}>
                      Ride Booking
                    </Text>
                    <Text style={styles.activityCardMeta}>Seat: {booking.seat_label} · ₹{booking.fare_paid}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* Rides */}
          {filteredRides.map((ride: any) => {
            const statusStyle = getStatusColor(ride.status);
            return (
              <Pressable
                key={ride.id}
                style={styles.activityCard}
                onPress={() => router.push({
                  pathname: '/coride-manage',
                  params: { rideId: ride.id, role: 'host' },
                })}
              >
                <View style={styles.activityCardRow}>
                  <View style={styles.activityCardIcon}>
                    <Text style={{ fontSize: 16 }}>🚙</Text>
                  </View>
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityCardTitle} numberOfLines={1}>
                      {ride.departure} → {ride.arrival}
                    </Text>
                    <Text style={styles.activityCardMeta}>
                      {ride.seats_total - ride.seats_left}/{ride.seats_total} seats · ₹{ride.fare}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* Tool Requests */}
          {filteredToolRequests.map((request: any) => {
            const statusStyle = getStatusColor(request.status);
            const isBorrower = request.borrowerId === profile?.id;
            return (
              <Pressable
                key={request.id}
                style={styles.activityCard}
                onPress={() => router.push({
                  pathname: '/nabourly-detail',
                  params: { requestId: request.id },
                })}
              >
                <View style={styles.activityCardRow}>
                  <View style={styles.activityCardIcon}>
                    <MaterialIcons name={isBorrower ? 'inbox' : 'card-giftcard'} size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityCardTitle} numberOfLines={1}>
                      {isBorrower ? 'Requested: ' : 'Lending: '}{request.toolName}
                    </Text>
                    <Text style={styles.activityCardMeta}>
                      {request.toolCategory} · {isBorrower ? 'Requested by you' : `Lending to ${request.borrowerName}`}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* Active Listings (Lend Offers and Request Posts) */}
          {activeUserTools.map((tool: any) => {
            const isRequest = tool.type === 'request' || tool.emoji === '📩';
            return (
              <Pressable
                key={`listing-${tool.id}`}
                style={styles.activityCard}
                onPress={() => router.push('/tool-share')}
              >
                <View style={styles.activityCardRow}>
                  <View style={styles.activityCardIcon}>
                    {tool.emoji && tool.emoji.startsWith('http') ? (
                      <Image source={{ uri: tool.emoji }} style={{ width: '100%', height: '100%', borderRadius: 10 }} contentFit="cover" />
                    ) : (
                      <Text style={{ fontSize: 16 }}>{tool.emoji || '🔧'}</Text>
                    )}
                  </View>
                  <View style={styles.activityCardContent}>
                    <Text style={styles.activityCardTitle} numberOfLines={1}>
                      {isRequest ? 'Requesting: ' : 'Offering: '}{tool.name}
                    </Text>
                    <Text style={styles.activityCardMeta}>
                      {tool.category} · Listed on board
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: 'rgba(0,97,86,0.1)' }]}>
                    <Text style={[styles.statusText, { color: Colors.primary }]}>
                      Active
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {/* Empty State */}
          {!loadingActivity && filteredBookings.length === 0 && filteredRides.length === 0 && filteredToolRequests.length === 0 && activeUserTools.length === 0 && (
            <View style={styles.activeCard}>
              <Text style={styles.activeTitle}>No {activeTab.toLowerCase()} activity</Text>
              <Text style={styles.activeSubtitle}>
                {activeTab === 'Active'
                  ? 'Your upcoming rides and requests will appear here.'
                  : activeTab === 'Completed'
                  ? 'Completed rides and requests will show up here.'
                  : 'Cancelled rides and requests will be listed here.'}
              </Text>
            </View>
          )}
        </View>
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
    gap: 40,
  },
  heroSection: {
    gap: 8,
    paddingTop: 16,
  },
  memberBadge: {
    backgroundColor: 'rgba(127,197,253,0.3)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006496',
    letterSpacing: 1.2,
    lineHeight: 16,
  },
  profileName: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  profileBio: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 29.2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  carbonCard: {
    width: '47%',
    height: 192,
    backgroundColor: Colors.primary,
    borderRadius: 32,
    padding: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
      },
      android: { elevation: 6 },
    }),
  },
  carbonDecor: {
    position: 'absolute',
    right: -32,
    bottom: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.primaryLight,
    opacity: 0.3,
  },
  carbonContent: {
    gap: 8,
  },
  carbonLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    opacity: 0.8,
    lineHeight: 28,
  },
  carbonNumber: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  carbonValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 48,
    letterSpacing: -2.4,
  },
  carbonUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.white,
    opacity: 0.7,
    lineHeight: 28,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sharesCard: {
    width: '47%',
    height: 192,
    backgroundColor: Colors.white,
    borderRadius: 32,
    padding: 24,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 40,
      },
      android: { elevation: 4 },
    }),
  },
  sharesContent: {
    gap: 8,
  },
  sharesLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkMid,
    lineHeight: 28,
  },
  sharesValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 48,
    letterSpacing: -2.4,
  },
  sharesSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  trustBadge: {
    width: '100%',
    backgroundColor: 'rgba(127,197,253,0.2)',
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trustIcon: {
    width: 52,
    height: 57,
    borderRadius: 16,
    backgroundColor: Colors.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00517b',
    lineHeight: 28,
  },
  trustDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#00517b',
    lineHeight: 20,
  },
  section: {
    gap: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 32,
  },
  inProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    lineHeight: 16,
  },
  activeCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activeLeft: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  rideIconWrap: {
    width: 38.7,
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  activeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 20,
  },
  confirmedBadge: {
    backgroundColor: '#8cf5e4',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confirmedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00201c',
    letterSpacing: -0.5,
    lineHeight: 15,
  },
  activeBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickupText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkMid,
    lineHeight: 16,
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 24,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    lineHeight: 16,
  },
  historyDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 20,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.avatarBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 3,
    paddingBottom: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16.5,
    letterSpacing: -0.6,
  },
  archiveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  archiveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 24,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: Colors.white },
  tabBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.muted },
  tabBadgeTextActive: { color: Colors.white },
  activityCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCardContent: { flex: 1, gap: 2 },
  activityCardTitle: { fontSize: 14, fontWeight: '700', color: Colors.dark },
  activityCardMeta: { fontSize: 12, color: Colors.muted },
  statusPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
