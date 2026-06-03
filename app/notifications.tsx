import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import {
  fetchMyHostedRides,
  fetchMyPassengerRides,
  fetchIncomingToolRequests,
  approveRidePassenger,
  denyRidePassenger,
  withdrawPassenger,
  approveToolRequest,
  rejectToolRequest,
  type HostedRide,
  type PassengerRide,
} from '../lib/api';

type ToolRequestItem = {
  id: string;
  toolId: string;
  toolName: string;
  borrowerId: string;
  borrowerName: string;
  borrowerAvatar: string;
  pickupDate: string;
  duration: string;
  message: string;
  status: string;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hostedRides, setHostedRides] = useState<HostedRide[]>([]);
  const [passengerRides, setPassengerRides] = useState<PassengerRide[]>([]);
  const [toolRequests, setToolRequests] = useState<ToolRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [hosted, passenger, tools] = await Promise.all([
        fetchMyHostedRides(),
        fetchMyPassengerRides(),
        fetchIncomingToolRequests(),
      ]);
      setHostedRides(hosted);
      setPassengerRides(passenger);
      setToolRequests(tools);
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (bookingId: string) => {
    try { await approveRidePassenger(bookingId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDeny = async (bookingId: string) => {
    try { await denyRidePassenger(bookingId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleWithdraw = async (bookingId: string) => {
    Alert.alert('Withdraw', 'Leave this ride pool?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: async () => {
        try { await withdrawPassenger(bookingId); load(); }
        catch (e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handleApproveTool = async (requestId: string) => {
    try { await approveToolRequest(requestId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRejectTool = async (requestId: string) => {
    try { await rejectToolRequest(requestId); load(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Hosted Rides */}
            {hostedRides.map((ride) => (
              <View key={ride.id} style={styles.card}>
                <Text style={styles.cardTitle}>Your Ride Pool</Text>
                <Text style={styles.cardSubtitle}>{ride.departure} → {ride.arrival} · {ride.departureTime}</Text>
                {ride.bookings.length === 0 ? (
                  <Text style={styles.emptyText}>No requests yet</Text>
                ) : ride.bookings.map((b) => (
                  <View key={b.id} style={styles.requestRow}>
                    <Image source={{ uri: b.passengerAvatar }} style={styles.avatar} contentFit="cover" />
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{b.passengerName}</Text>
                      <Text style={styles.requestMeta}>Seat {b.seatLabel}</Text>
                    </View>
                    {b.status === 'pending' ? (
                      <View style={styles.actionRow}>
                        <Pressable style={styles.approveBtn} onPress={() => handleApprove(b.id)}>
                          <Text style={styles.approveText}>Approve</Text>
                        </Pressable>
                        <Pressable style={styles.denyBtn} onPress={() => handleDeny(b.id)}>
                          <Text style={styles.denyText}>Deny</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.confirmedBadge}>Confirmed</Text>
                    )}
                  </View>
                ))}
              </View>
            ))}

            {/* Passenger Rides */}
            {passengerRides.map((ride) => (
              <View key={ride.bookingId} style={styles.card}>
                <Text style={styles.cardTitle}>Your Ride</Text>
                <Text style={styles.cardSubtitle}>{ride.departure} → {ride.arrival} · {ride.departureTime}</Text>
                <View style={styles.requestRow}>
                  <Image source={{ uri: ride.hostAvatar }} style={styles.avatar} contentFit="cover" />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{ride.hostName}</Text>
                    <Text style={styles.requestMeta}>Seat {ride.seatLabel}</Text>
                  </View>
                  {ride.status === 'pending' ? (
                    <Text style={styles.pendingBadge}>Awaiting host approval</Text>
                  ) : (
                    <Pressable style={styles.withdrawBtn} onPress={() => handleWithdraw(ride.bookingId)}>
                      <Text style={styles.withdrawText}>Withdraw</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}

            {/* Tool Requests (incoming) */}
            {toolRequests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.requestRow}>
                  <Image source={{ uri: req.borrowerAvatar }} style={styles.avatar} contentFit="cover" />
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.borrowerName}</Text>
                    <Text style={styles.requestMeta}>wants to request {req.toolName} · {req.pickupDate}</Text>
                    {req.message ? <Text style={styles.requestMsg}>"{req.message}"</Text> : null}
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.approveBtn} onPress={() => handleApproveTool(req.id)}>
                    <Text style={styles.approveText}>Approve</Text>
                  </Pressable>
                  <Pressable style={styles.denyBtn} onPress={() => handleRejectTool(req.id)}>
                    <Text style={styles.denyText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {hostedRides.length === 0 && passengerRides.length === 0 && toolRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptySub}>When you host a ride or get tool requests, they will appear here.</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white,
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: FontSize.body, fontWeight: '600', color: Colors.primary },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xxl, padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: { fontSize: FontSize.body, fontWeight: '700', color: Colors.dark },
  cardSubtitle: { fontSize: FontSize.base, color: Colors.muted, marginTop: -8 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.avatarBg },
  requestInfo: { flex: 1 },
  requestName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.dark },
  requestMeta: { fontSize: FontSize.md, color: Colors.muted, marginTop: 2 },
  requestMsg: { fontSize: FontSize.md, color: Colors.darkMid, fontStyle: 'italic', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  approveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 8,
  },
  approveText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '600' },
  denyBtn: {
    borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  denyText: { color: Colors.muted, fontSize: FontSize.base, fontWeight: '600' },
  confirmedBadge: { color: Colors.primary, fontWeight: '600', fontSize: FontSize.base },
  pendingBadge: { color: '#d97706', fontWeight: '600', fontSize: FontSize.base },
  withdrawBtn: {
    borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#dc2626',
  },
  withdrawText: { color: '#dc2626', fontSize: FontSize.base, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.dark },
  emptyText: { fontSize: FontSize.base, color: Colors.muted },
  emptySub: { fontSize: FontSize.base, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
});
