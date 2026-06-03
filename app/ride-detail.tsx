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
import { getRideDetails, getCurrentUserId, completeRide, withdrawPassenger } from '../lib/api';
import { supabase } from '../lib/supabase';
import FullRouteMap from '../components/FullRouteMap';

type RideDetailData = Awaited<ReturnType<typeof getRideDetails>>;

export default function RideDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    rideId: string;
    bookingId: string;
    role: 'host' | 'passenger';
  }>();

  const { rideId, bookingId, role } = params;
  const [detail, setDetail] = useState<RideDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

  const isHost = role === 'host' || detail?.driverId === userId;
  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'rgba(0,97,86,0.1)', text: Colors.primary },
    completed: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
    cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
  };

  async function handleComplete() {
    if (!rideId) return;
    Alert.alert('Complete Ride', 'Mark this ride as completed?', [
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

  async function handleWithdraw() {
    if (!bookingId) return;
    Alert.alert('Withdraw Booking', 'Cancel your booking for this ride?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await withdrawPassenger(bookingId);
            router.back();
          } catch (error) {
            Alert.alert('Error', JSON.stringify(error));
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function handleCancelRide() {
    if (!rideId) return;
    Alert.alert('Cancel Ride', 'Cancel this ride entirely? All passengers will be notified.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Ride',
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

  function callPhone(phone: string) {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
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
        <Text style={{ fontSize: 16, color: Colors.muted }}>Ride not found.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const rideStatus = statusColors[detail.status] ?? statusColors.active;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={[styles.statusBadge, { backgroundColor: rideStatus.bg }]}>
          <Text style={[styles.statusText, { color: rideStatus.text }]}>
            {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
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
            hasCoords={detail.departureLat != null && detail.departureLng != null && detail.arrivalLat != null && detail.arrivalLng != null}
            departure={detail.departure}
            arrival={detail.arrival}
          />
        </View>

        {/* Route Info */}
        <View style={styles.card}>
          <View style={styles.routeTimeline}>
            <View style={styles.routeDot} />
            <View style={styles.routeLine} />
            <View style={[styles.routeDot, { backgroundColor: Colors.blueMid }]} />
          </View>
          <View style={styles.routeInfo}>
            <View style={styles.routeStop}>
              <Text style={styles.routeLabel}>From</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>{detail.departure}</Text>
              <Text style={styles.routeTime}>{detail.departureTime}</Text>
            </View>
            {detail.distanceKm && (
              <Text style={styles.routeDistance}>{detail.distanceKm.toFixed(1)} km</Text>
            )}
            <View style={styles.routeStop}>
              <Text style={styles.routeLabel}>To</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>{detail.arrival}</Text>
              {detail.arrivalTime ? <Text style={styles.routeTime}>{detail.arrivalTime}</Text> : null}
            </View>
          </View>
        </View>

        {/* Host Contact (for passengers) */}
        {!isHost && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HOST</Text>
            <Pressable style={styles.contactRow} onPress={() => callPhone(detail.driverPhone)}>
              <View style={styles.contactAvatarWrap}>
                <Image
                  source={{ uri: detail.driverAvatar || undefined }}
                  style={styles.contactAvatar}
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

        {/* Passengers (for hosts) */}
        {isHost && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>PASSENGERS ({detail.bookings.length})</Text>
            {detail.bookings.length === 0 ? (
              <Text style={styles.emptyText}>No passengers yet.</Text>
            ) : (
              detail.bookings.map((booking) => {
                const bookingStatus = statusColors[booking.status] ?? statusColors.active;
                return (
                  <Pressable
                    key={booking.id}
                    style={styles.contactRow}
                    onPress={() => callPhone(booking.passengerPhone)}
                  >
                    <View style={styles.contactAvatarWrap}>
                      <Image
                        source={{ uri: booking.passengerAvatar || undefined }}
                        style={styles.contactAvatar}
                        contentFit="cover"
                        transition={150}
                      />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{booking.passengerName}</Text>
                      <Text style={styles.contactMeta}>
                        Seat {booking.seatLabel} · ₹{booking.farePaid}
                      </Text>
                      <Text style={styles.contactPhone}>{booking.passengerPhone ?? 'No phone added'}</Text>
                    </View>
                    <View style={styles.contactRight}>
                      <View style={[styles.bookingStatusBadge, { backgroundColor: bookingStatus.bg }]}>
                        <Text style={[styles.bookingStatusText, { color: bookingStatus.text }]}>
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
        )}

        {/* Ride Details Grid */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DETAILS</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fare</Text>
              <Text style={styles.detailValue}>₹{detail.fare}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Seats</Text>
              <Text style={styles.detailValue}>{detail.seatsTotal - detail.seatsLeft}/{detail.seatsTotal}</Text>
            </View>
            {detail.vehicleName ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{detail.vehicleName}</Text>
              </View>
            ) : null}
            {detail.vehicleNumber ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Number</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{detail.vehicleNumber}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      {detail.status === 'active' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {isHost ? (
            <>
              <Pressable
                style={[styles.cancelBtn, actionLoading && { opacity: 0.65 }]}
                onPress={handleCancelRide}
                disabled={actionLoading}
              >
                <Text style={styles.cancelBtnText}>Cancel Ride</Text>
              </Pressable>
              <Pressable
                style={[styles.completeBtn, actionLoading && { opacity: 0.65 }]}
                onPress={handleComplete}
                disabled={actionLoading}
              >
                <Text style={styles.completeBtnText}>{actionLoading ? 'Saving...' : 'Complete Ride'}</Text>
              </Pressable>
            </>
          ) : bookingId ? (
            <Pressable
              style={[styles.withdrawBtn, actionLoading && { opacity: 0.65 }]}
              onPress={handleWithdraw}
              disabled={actionLoading}
            >
              <Text style={styles.withdrawBtnText}>{actionLoading ? 'Cancelling...' : 'Withdraw Booking'}</Text>
            </Pressable>
          ) : null}
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
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
  routeTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingLeft: 4,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 6,
  },
  routeInfo: {
    gap: 12,
  },
  routeStop: {
    gap: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  routeTime: {
    fontSize: 12,
    color: Colors.muted,
  },
  routeDistance: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  contactAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  contactAvatar: {
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
  contactMeta: {
    fontSize: 12,
    color: Colors.muted,
  },
  contactPhone: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  contactRight: {
    alignItems: 'flex-end',
    gap: 6,
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
  bookingStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    minWidth: '40%',
    gap: 2,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(246,250,247,0.97)',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    gap: 12,
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
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  completeBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  withdrawBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
});
