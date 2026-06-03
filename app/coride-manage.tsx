import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { getRideDetails, getCurrentUserId, completeRide } from '../lib/api';
import { supabase } from '../lib/supabase';
import FullRouteMap from '../components/FullRouteMap';

type RideDetail = Awaited<ReturnType<typeof getRideDetails>>;

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'rgba(0,97,86,0.1)', text: Colors.primary },
  confirmed: { bg: 'rgba(0,97,86,0.1)', text: Colors.primary },
  pending: { bg: 'rgba(251,191,36,0.15)', text: '#b45309' },
  completed: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
};

export default function CorideManageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    rideId: string;
    role: 'host' | 'passenger';
  }>();

  const { rideId, role } = params;
  const [detail, setDetail] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const isHost = role === 'host';

  const loadData = useCallback(async () => {
    if (!rideId) return;
    try {
      const [rideData, uid] = await Promise.all([
        getRideDetails(rideId),
        getCurrentUserId(),
      ]);
      setDetail(rideData);
      setUserId(uid);
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleComplete() {
    if (!rideId) return;
    Alert.alert('Complete Ride', 'Mark this co-ride as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setActionLoading(true);
            await completeRide(rideId);
            await loadData();
          } catch (error) {
            Alert.alert('Error', JSON.stringify(error));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function handleTerminate() {
    if (!rideId) return;
    Alert.alert('Terminate Ride', 'Cancel this co-ride? All occupants will be notified.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Terminate',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            const { error } = await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId);
            if (error) throw error;
            await loadData();
          } catch (error) {
            Alert.alert('Error', JSON.stringify(error));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  function callPhone(phone: string | null) {
    if (phone) Linking.openURL(`tel:${phone}`);
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 60, alignItems: 'center', gap: 16 }]}>
        <Text style={{ fontSize: 16, color: Colors.muted }}>Co-ride not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const rideStatus = statusColors[detail.status] ?? statusColors.active;
  const hasCoords = detail.departureLat != null && detail.departureLng != null && detail.arrivalLat != null && detail.arrivalLng != null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Active Coride</Text>
        <View style={[styles.statusBadge, { backgroundColor: rideStatus.bg }]}>
          <Text style={[styles.statusText, { color: rideStatus.text }]}>
            {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 200 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Map */}
        <View style={styles.mapCard}>
          <FullRouteMap
            depLat={detail.departureLat ?? 0}
            depLng={detail.departureLng ?? 0}
            arrLat={detail.arrivalLat ?? 0}
            arrLng={detail.arrivalLng ?? 0}
            routeCoords={null}
            loading={false}
            hasCoords={hasCoords}
            departure={detail.departure}
            arrival={detail.arrival}
          />
        </View>

        {/* Route Summary */}
        <View style={styles.routeSummary}>
          <View style={styles.routeStop}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeStopInfo}>
              <Text style={styles.routeStopLabel}>From</Text>
              <Text style={styles.routeStopText} numberOfLines={2}>{detail.departure}</Text>
              <Text style={styles.routeStopTime}>{detail.departureTime}</Text>
            </View>
          </View>
          <View style={styles.routeConnector}>
            <View style={styles.routeLine} />
            {detail.distanceKm && (
              <Text style={styles.routeDistance}>{detail.distanceKm.toFixed(1)} km</Text>
            )}
            <View style={styles.routeLine} />
          </View>
          <View style={styles.routeStop}>
            <View style={[styles.routeDot, { backgroundColor: Colors.blueMid }]} />
            <View style={styles.routeStopInfo}>
              <Text style={styles.routeStopLabel}>To</Text>
              <Text style={styles.routeStopText} numberOfLines={2}>{detail.arrival}</Text>
              {detail.arrivalTime && <Text style={styles.routeStopTime}>{detail.arrivalTime}</Text>}
            </View>
          </View>
        </View>

        {/* Ride Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fare</Text>
              <Text style={styles.infoValue}>₹{detail.fare}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Seats</Text>
              <Text style={styles.infoValue}>{detail.seatsTotal - detail.seatsLeft}/{detail.seatsTotal}</Text>
            </View>
            {detail.vehicleName ? (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Vehicle</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{detail.vehicleName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Host Card (shown to passengers) */}
        {!isHost && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HOST</Text>
            <Pressable style={styles.contactRow} onPress={() => callPhone(detail.driverPhone)}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: detail.driverAvatar || undefined }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={150}
                />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{detail.driverName}</Text>
                <Text style={styles.contactPhone}>{detail.driverPhone ?? 'No phone added'}</Text>
              </View>
              {detail.driverPhone && <Text style={styles.callBtn}>Call</Text>}
            </Pressable>
          </View>
        )}

        {/* Occupants */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>OCCUPANTS ({detail.bookings.length})</Text>
          {detail.bookings.length === 0 ? (
            <View style={styles.emptyOccupants}>
              <Text style={styles.emptyText}>No occupants yet.</Text>
              <Text style={styles.emptySubtext}>Bookings will appear here once passengers join.</Text>
            </View>
          ) : (
            detail.bookings.map((booking) => {
              const bStatus = statusColors[booking.status] ?? statusColors.pending;
              return (
                <Pressable
                  key={booking.id}
                  style={styles.occupantRow}
                  onPress={() => callPhone(booking.passengerPhone)}
                >
                  <View style={styles.occupantAvatarWrap}>
                    <Image
                      source={{ uri: booking.passengerAvatar || undefined }}
                      style={styles.occupantAvatar}
                      contentFit="cover"
                      transition={150}
                    />
                  </View>
                  <View style={styles.occupantInfo}>
                    <Text style={styles.occupantName}>{booking.passengerName}</Text>
                    <Text style={styles.occupantMeta}>Seat {booking.seatLabel} · ₹{booking.farePaid}</Text>
                    <Text style={styles.occupantPhone}>{booking.passengerPhone ?? 'No phone added'}</Text>
                  </View>
                  <View style={styles.occupantRight}>
                    <View style={[styles.bookingBadge, { backgroundColor: bStatus.bg }]}>
                      <Text style={[styles.bookingBadgeText, { color: bStatus.text }]}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Text>
                    </View>
                    {booking.passengerPhone && <Text style={styles.callBtn}>Call</Text>}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Action Card - Sliders */}
      {detail.status === 'active' && isHost && (
        <View style={[styles.actionCard, { paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.sliderRow}>
            <Pressable
              style={[styles.sliderBtn, styles.completeSlider, actionLoading && { opacity: 0.65 }]}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <View style={styles.sliderIconWrap}>
                <Text style={styles.sliderIcon}>✓</Text>
              </View>
              <View style={styles.sliderTextWrap}>
                <Text style={styles.sliderTitle}>Complete ride</Text>
                <Text style={styles.sliderDesc}>Mark as successfully completed</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.sliderBtn, styles.terminateSlider, actionLoading && { opacity: 0.65 }]}
              onPress={handleTerminate}
              disabled={actionLoading}
            >
              <View style={[styles.sliderIconWrap, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Text style={[styles.sliderIcon, { color: '#dc2626' }]}>✕</Text>
              </View>
              <View style={styles.sliderTextWrap}>
                <Text style={[styles.sliderTitle, { color: '#dc2626' }]}>Terminate ride</Text>
                <Text style={styles.sliderDesc}>Cancel for all occupants</Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    backgroundColor: 'rgba(246,250,247,0.97)',
    paddingHorizontal: 24,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: Colors.dark,
    fontWeight: '600',
    marginTop: -1,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },

  /* Map */
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    height: 200,
  },

  /* Route Summary */
  routeSummary: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  routeStopInfo: {
    flex: 1,
    gap: 2,
  },
  routeStopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeStopText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    lineHeight: 20,
  },
  routeStopTime: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 4,
    gap: 8,
  },
  routeLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  routeDistance: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
  },

  /* Info Card */
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 24,
  },
  infoItem: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },

  /* Cards */
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 1.5,
  },

  /* Contact */
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  avatar: {
    width: 44,
    height: 44,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  callBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.accentBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },

  /* Occupants */
  occupantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  occupantAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  occupantAvatar: {
    width: 40,
    height: 40,
  },
  occupantInfo: {
    flex: 1,
    gap: 1,
  },
  occupantName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dark,
  },
  occupantMeta: {
    fontSize: 11,
    color: Colors.muted,
  },
  occupantPhone: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  occupantRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bookingBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyOccupants: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.muted,
  },

  /* Action Card */
  actionCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(246,250,247,0.97)',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sliderBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1.5,
  },
  completeSlider: {
    backgroundColor: 'rgba(0,97,86,0.06)',
    borderColor: 'rgba(0,97,86,0.2)',
  },
  terminateSlider: {
    backgroundColor: 'rgba(239,68,68,0.04)',
    borderColor: 'rgba(239,68,68,0.15)',
  },
  sliderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,97,86,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  sliderTextWrap: {
    gap: 1,
  },
  sliderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  sliderDesc: {
    fontSize: 11,
    color: Colors.muted,
  },
});
