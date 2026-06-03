import React, { useEffect, useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import RideMapView from '../components/RideMapView';
import { createRideBooking, fetchBookedRideSeats, cancelRideBooking, completeRide, getCurrentUserId } from '../lib/api';
import { supabase } from '../lib/supabase';

const SEAT_LAYOUT = [
  { id: 's1', label: 'Front', position: 'front' },
  { id: 's2', label: 'Rear Left', position: 'rear-left' },
  { id: 's3', label: 'Rear Mid', position: 'rear-mid' },
  { id: 's4', label: 'Rear Right', position: 'rear-right' },
];

export default function RideBookingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    rideId: string;
    driverName: string;
    driverAvatar: string;
    driverRating: string;
    driverRides: string;
    departure: string;
    arrival: string;
    departureLat?: string;
    departureLng?: string;
    arrivalLat?: string;
    arrivalLng?: string;
    distanceKm?: string;
    departureTime: string;
    arrivalTime: string;
    co2Saving: string;
    fare: string;
    seatsLeft: string;
    vehicleName: string;
    vehicleNumber: string;
  }>();

  const {
    rideId,
    driverName = 'Driver',
    driverAvatar = '',
    driverRating = '0.0',
    driverRides = '0',
    departure = '',
    arrival = '',
    departureLat,
    departureLng,
    arrivalLat,
    arrivalLng,
    distanceKm,
    departureTime = '',
    arrivalTime = '',
    co2Saving = '0',
    fare = '0',
    vehicleName = '',
    vehicleNumber = '',
  } = params;

  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [bookedSeats, setBookedSeats] = useState<Set<string>>(new Set());
  const [invoice, setInvoice] = useState<{ id: string; createdAt: string; seatLabel: string } | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [myBookingId, setMyBookingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [completing, setCompleting] = useState(false);

  const baseFare = parseInt(fare, 10);
  const ecoOffset = Math.round(baseFare * 0.05);
  const totalFare = baseFare - ecoOffset;
  const availableSeats = useMemo(
    () => Math.max(0, SEAT_LAYOUT.length - bookedSeats.size),
    [bookedSeats]
  );

  useEffect(() => {
    if (!rideId) return;

    fetchBookedRideSeats(rideId)
      .then(setBookedSeats)
      .catch((error) => {
        Alert.alert('Could not load seats', JSON.stringify(error));
      });

    getCurrentUserId().then((userId) => {
      if (!userId) return;
      if (params.driverName && userId) {
        supabase.from('rides').select('driver_id').eq('id', rideId).single().then(({ data }) => {
          if (data?.driver_id === userId) setIsHost(true);
        });
      }
      supabase.from('ride_bookings').select('id').eq('ride_id', rideId).eq('passenger_id', userId).neq('status', 'cancelled').single().then(({ data }) => {
        if (data?.id) setMyBookingId(data.id);
      });
    });
  }, [rideId]);

  async function handleConfirm() {
    if (!selectedSeat) {
      Alert.alert('Select a Seat', 'Please choose your preferred seat before confirming.');
      return;
    }

    if (!rideId) {
      Alert.alert('Missing ride details', 'Please go back and select the ride again.');
      return;
    }

    try {
      const seatLabel = SEAT_LAYOUT.find((seat) => seat.id === selectedSeat)?.label ?? selectedSeat;
      const booking = await createRideBooking({ rideId, seatLabel, farePaid: totalFare });
      setInvoice({
        id: booking.id,
        createdAt: booking.created_at,
        seatLabel,
      });
      setConfirmed(true);
    } catch (error) {
      Alert.alert('Booking failed', JSON.stringify(error));
    }
  }

  async function handleCancelBooking() {
    if (!myBookingId) return;
    Alert.alert('Withdraw from Ride', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Withdraw',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await cancelRideBooking(myBookingId);
            setMyBookingId(null);
            Alert.alert('Cancelled', 'Your booking has been withdrawn.');
            if (rideId) {
              const seats = await fetchBookedRideSeats(rideId);
              setBookedSeats(seats);
            }
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not cancel booking.');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  async function handleCompleteRide() {
    if (!rideId) return;
    Alert.alert('Complete Ride', 'Mark this ride as completed?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Complete',
        onPress: async () => {
          setCompleting(true);
          try {
            await completeRide(rideId);
            Alert.alert('Done', 'Ride marked as completed.');
            router.back();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Could not complete ride.');
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  }

  if (confirmed) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#064e3b', '#006156']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Invoice</Text>
          <Text style={styles.successDesc}>
            {`Seat confirmed with ${driverName}.`}
          </Text>
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceKey}>Invoice ID</Text>
              <Text style={styles.invoiceValue}>{invoice?.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceKey}>Route</Text>
              <Text style={styles.invoiceValue}>{departure} to {arrival}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceKey}>Seat</Text>
              <Text style={styles.invoiceValue}>{invoice?.seatLabel}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceKey}>Base fare</Text>
              <Text style={styles.invoiceValue}>₹{baseFare}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceKey}>Eco offset</Text>
              <Text style={styles.invoiceValue}>-₹{ecoOffset}</Text>
            </View>
            <View style={styles.invoiceDivider} />
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceTotalKey}>Total</Text>
              <Text style={styles.invoiceTotalValue}>₹{totalFare}</Text>
            </View>
            <Text style={styles.invoiceDate}>
              {invoice?.createdAt ? new Date(invoice.createdAt).toLocaleString() : ''}
            </Text>
          </View>
          <View style={styles.successBadge}>
            <Text style={styles.successBadgeText}>CO2 saved: {co2Saving} kg</Text>
          </View>
          <Pressable style={styles.invoiceDoneBtn} onPress={() => router.back()}>
            <Text style={styles.invoiceDoneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver Profile Card */}
        <View style={styles.driverCard}>
          <View style={styles.driverCardTop}>
            <View style={styles.driverAvatarWrap}>
              {driverAvatar ? (
                <Image
                  source={{ uri: driverAvatar }}
                  style={styles.driverAvatarLg}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.driverAvatarLg, styles.driverAvatarFallback]}>
                  <Text style={styles.driverAvatarInitial}>{driverName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            </View>

            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driverName}</Text>
              <View style={styles.driverMeta}>
                <Text style={styles.verifiedText}>Verified Neighbor</Text>
              </View>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text key={s} style={[styles.star, { opacity: s <= Math.round(parseFloat(driverRating)) ? 1 : 0.25 }]}>★</Text>
                ))}
                <Text style={styles.ratingValue}>{driverRating}</Text>
                <Text style={styles.ratingCount}>({driverRides} rides)</Text>
              </View>
            </View>

            <View style={styles.co2Pill}>
              <Text style={styles.co2PillEmoji}>🌿</Text>
              <Text style={styles.co2PillText}>{`-${co2Saving}kg CO₂`}</Text>
            </View>
          </View>

          <View style={styles.vehicleRow}>
            <View style={styles.vehicleChip}>
              <Text style={styles.vehicleIcon}>🚗</Text>
              <Text style={styles.vehicleText}>{vehicleName || 'Vehicle details pending'}</Text>
            </View>
            <View style={styles.vehicleChip}>
              <Text style={styles.vehicleIcon}>🪪</Text>
              <Text style={styles.vehicleText}>{vehicleNumber || 'Number pending'}</Text>
            </View>
          </View>
        </View>

        {/* Route Map */}
        <View style={styles.mapCard}>
          <Text style={styles.cardLabel}>ROUTE MAP</Text>
          <RideMapView
            departure={departure}
            arrival={arrival}
            departureTime={departureTime}
            arrivalTime={arrivalTime}
          />
          {departureLat && departureLng && arrivalLat && arrivalLng ? (
            <Pressable
              style={styles.routeBtn}
              onPress={() => router.push({
                pathname: '/ride-route',
                params: {
                  departure,
                  arrival,
                  departureLat: departureLat ?? '',
                  departureLng: departureLng ?? '',
                  arrivalLat: arrivalLat ?? '',
                  arrivalLng: arrivalLng ?? '',
                  distanceKm: distanceKm ?? '',
                  driverName,
                  driverAvatar,
                },
              })}
            >
              <Text style={styles.routeBtnText}>View Full Route</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Route Timeline */}
        <View style={styles.routeCard}>
          <Text style={styles.cardLabel}>ROUTE</Text>

          <View style={styles.routeTimeline}>
            {/* Departure */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: Colors.primary }]} />
                <View style={styles.timelineConnector} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStop}>{departure}</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeChip}>{departureTime}</Text>
                  <Text style={styles.timeLabel}>Departure</Text>
                </View>
              </View>
            </View>

            {/* Midpoint info */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: Colors.border, width: 6, height: 6, marginLeft: 1 }]} />
                <View style={styles.timelineConnector} />
              </View>
              <View style={[styles.timelineContent, { paddingTop: 0 }]}>
                <View style={styles.midpointBadge}>
                  <Text style={styles.midpointText}>Pickup stop</Text>
                </View>
              </View>
            </View>

            {/* Arrival */}
            <View style={[styles.timelineItem, { marginBottom: 0 }]}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: Colors.blueMid }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStop}>{arrival}</Text>
                <View style={styles.timeRow}>
                  <Text style={[styles.timeChip, { backgroundColor: 'rgba(127,197,253,0.2)', color: Colors.blueMid }]}>{arrivalTime}</Text>
                  <Text style={styles.timeLabel}>Arrival  ·  ~60 min</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Seat Picker */}
        <View style={styles.seatCard}>
          <Text style={styles.cardLabel}>CHOOSE YOUR SEAT</Text>
          <Text style={styles.seatSubLabel}>{availableSeats} seats available</Text>

          {/* Car illustration layout */}
          <View style={styles.carLayout}>
            {/* Steering */}
            <View style={styles.steeringRow}>
              <View style={styles.steeringWrap}>
                <Text style={styles.steeringIcon}>🚙</Text>
                <Text style={styles.steeringLabel}>Driver</Text>
              </View>
              {/* Front passenger seat */}
              {SEAT_LAYOUT.filter((s) => s.position === 'front').map((seat) => {
                const isTaken = bookedSeats.has(seat.label);
                return (
                <Pressable
                  key={seat.id}
                  style={[
                    styles.seat,
                    selectedSeat === seat.id && styles.seatSelected,
                    isTaken && styles.seatTaken,
                  ]}
                  onPress={() => !isTaken && setSelectedSeat(seat.id)}
                  disabled={isTaken}
                >
                  <Text style={styles.seatEmoji}>{isTaken ? 'Taken' : 'Seat'}</Text>
                  <Text style={[
                    styles.seatLabel,
                    selectedSeat === seat.id && { color: Colors.white },
                    isTaken && { color: Colors.muted },
                  ]}>{isTaken ? 'Taken' : seat.label}</Text>
                </Pressable>
              )})}
            </View>

            <View style={styles.seatDivider} />

            {/* Rear row */}
            <View style={styles.rearRow}>
              {SEAT_LAYOUT.filter((s) => s.position !== 'front').map((seat) => {
                const isTaken = bookedSeats.has(seat.label);
                return (
                <Pressable
                  key={seat.id}
                  style={[
                    styles.seat,
                    selectedSeat === seat.id && styles.seatSelected,
                    isTaken && styles.seatTaken,
                  ]}
                  onPress={() => !isTaken && setSelectedSeat(seat.id)}
                  disabled={isTaken}
                >
                  <Text style={styles.seatEmoji}>{isTaken ? 'Taken' : 'Seat'}</Text>
                  <Text style={[
                    styles.seatLabel,
                    selectedSeat === seat.id && { color: Colors.white },
                    isTaken && { color: Colors.muted },
                  ]}>{isTaken ? 'Taken' : seat.label}</Text>
                </Pressable>
              )})}
            </View>
          </View>
        </View>

        {/* Fare Breakdown */}
        <View style={styles.fareCard}>
          <Text style={styles.cardLabel}>FARE BREAKDOWN</Text>

          <View style={styles.fareRow}>
            <Text style={styles.fareItem}>Base fare</Text>
            <Text style={styles.fareValue}>₹{baseFare}</Text>
          </View>
          <View style={[styles.fareRow, { marginTop: 4 }]}>
            <View style={styles.fareItemRow}>
              <Text style={styles.fareItem}>Eco offset</Text>
              <View style={styles.ecoPill}>
                <Text style={styles.ecoPillText}>Green discount</Text>
              </View>
            </View>
            <Text style={[styles.fareValue, { color: Colors.greenAccent }]}>-₹{ecoOffset}</Text>
          </View>

          <View style={styles.fareDivider} />

          <View style={styles.fareRow}>
            <Text style={styles.fareTotalLabel}>You pay</Text>
            <Text style={styles.fareTotalValue}>₹{totalFare}</Text>
          </View>

          <View style={styles.fareNote}>
            <Text style={styles.fareNoteText}>
              {'💸  Pay directly to driver · Cash or UPI accepted'}
            </Text>
          </View>
        </View>

        {/* CO2 Impact */}
        <LinearGradient
          colors={['#064e3b', '#006156']}
          style={styles.impactCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.impactLeft}>
            <Text style={styles.impactLabel}>YOUR IMPACT TODAY</Text>
            <Text style={styles.impactValue}>{co2Saving} kg</Text>
            <Text style={styles.impactDesc}>CO₂ saved by joining this pool</Text>
          </View>
          <View style={styles.impactLeaf}>
            <Text style={{ fontSize: 52 }}>🌿</Text>
          </View>
        </LinearGradient>

      </ScrollView>

      {/* Sticky Confirm Button */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
        {isHost ? (
          <View style={{ flex: 1 }}>
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.85 },
                completing && { opacity: 0.6 },
              ]}
              onPress={handleCompleteRide}
              disabled={completing}
            >
              <Text style={styles.confirmBtnText}>
                {completing ? 'Completing...' : 'Complete Ride'}
              </Text>
            </Pressable>
          </View>
        ) : myBookingId ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && { opacity: 0.85 },
                cancelling && { opacity: 0.6 },
              ]}
              onPress={handleCancelBooking}
              disabled={cancelling}
            >
              <Text style={styles.cancelBtnText}>
                {cancelling ? 'Withdrawing...' : 'Withdraw'}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.footerInfo}>
              <Text style={styles.footerFare}>₹{totalFare}</Text>
              <Text style={styles.footerFareLabel}>Total fare</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                !selectedSeat && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmBtnText}>
                {selectedSeat ? 'Confirm Seat & Join' : 'Select a Seat First'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Success Screen ───────────────────────────────────────────────────────
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successEmoji: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.9,
  },
  successDesc: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 26,
    textAlign: 'center',
  },
  successBadge: {
    backgroundColor: 'rgba(213,255,167,0.2)',
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    marginTop: 8,
  },
  successBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
  },
  invoiceCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  invoiceKey: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
  },
  invoiceValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.dark,
    textAlign: 'right',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  invoiceTotalKey: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.dark,
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  invoiceDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    textAlign: 'right',
  },
  invoiceDoneBtn: {
    width: '100%',
    backgroundColor: Colors.greenLight,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  invoiceDoneText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primaryDark,
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: 'rgba(246,250,247,0.97)',
    paddingHorizontal: 24,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 100,
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.4,
  },
  headerRight: {
    width: 40,
  },

  // ─── Scroll ───────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },

  // ─── Driver Card ──────────────────────────────────────────────────────────
  driverCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 24,
      },
      android: { elevation: 6 },
    }),
  },
  driverCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  driverAvatarWrap: {
    position: 'relative',
  },
  driverAvatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  driverAvatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  verifiedIcon: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: '800',
  },
  driverInfo: {
    flex: 1,
    gap: 4,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  driverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    fontSize: 14,
    color: '#f59e0b',
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark,
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },
  co2Pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(73,123,9,0.12)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  co2PillEmoji: {
    fontSize: 12,
  },
  co2PillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.greenDeep,
    letterSpacing: 0.4,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  vehicleIcon: {
    fontSize: 13,
  },
  vehicleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.darkMid,
  },

  // ─── Map Card ────────────────────────────────────────────────────────────
  mapCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },

  // ─── Route Card ───────────────────────────────────────────────────────────
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 1.5,
    lineHeight: 14,
  },
  routeTimeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 0,
  },
  timelineLeft: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineConnector: {
    flex: 1,
    width: 1.5,
    backgroundColor: Colors.border,
    marginVertical: 4,
    minHeight: 24,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
    gap: 6,
  },
  timelineStop: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeChip: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: 'rgba(0,97,86,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
  },
  midpointBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  midpointText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.darkMid,
  },

  // ─── Seat Card ────────────────────────────────────────────────────────────
  seatCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  seatSubLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: -4,
  },
  carLayout: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  steeringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  steeringWrap: {
    alignItems: 'center',
    gap: 4,
  },
  steeringIcon: {
    fontSize: 28,
  },
  steeringLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  seatDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  rearRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  seat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
    maxWidth: 90,
  },
  seatSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  seatTaken: {
    backgroundColor: Colors.inputBg,
    borderColor: Colors.border,
    opacity: 0.5,
  },
  seatEmoji: {
    fontSize: 20,
  },
  seatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark,
    textAlign: 'center',
    lineHeight: 14,
  },

  // ─── Fare Card ────────────────────────────────────────────────────────────
  fareCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fareItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fareItem: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.darkMid,
  },
  fareValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  ecoPill: {
    backgroundColor: 'rgba(73,123,9,0.12)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ecoPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.greenDeep,
  },
  fareDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  fareTotalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  fareTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.6,
  },
  fareNote: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fareNoteText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkMid,
    lineHeight: 18,
  },

  // ─── Impact Card ──────────────────────────────────────────────────────────
  impactCard: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  impactLeft: {
    gap: 4,
  },
  impactLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1.5,
  },
  impactValue: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  impactDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  impactLeaf: {
    opacity: 0.8,
  },
  // Sticky Footer ────────────────────────────────────────────────────────
  stickyFooter: {
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
    alignItems: 'center',
    gap: 16,
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
  footerInfo: {
    gap: 0,
  },
  footerFare: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  footerFareLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.inputBg,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: -0.3,
  },
  routeBtn: {
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  routeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
