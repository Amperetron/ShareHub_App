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
import { getCurrentUserId, cancelToolRequest, completeToolRequest } from '../lib/api';
import { supabase } from '../lib/supabase';

type ToolRequestDetail = {
  id: string;
  toolId: string;
  toolName: string;
  toolCategory: string;
  toolEmoji: string;
  borrowerId: string;
  borrowerName: string;
  borrowerPhone: string | null;
  borrowerAvatar: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string | null;
  ownerAvatar: string;
  pickupDate: string;
  duration: string;
  message: string | null;
  status: string;
};

const statusColors: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(251,191,36,0.15)', text: '#b45309' },
  approved: { bg: 'rgba(0,97,86,0.1)', text: Colors.primary },
  rejected: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
  returned: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
};

export default function NabourlyDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    requestId: string;
  }>();

  const [detail, setDetail] = useState<ToolRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!params.requestId) return;
    try {
      const uid = await getCurrentUserId();
      setUserId(uid);

      const { data: request, error } = await supabase
        .from('tool_requests')
        .select('*')
        .eq('id', params.requestId)
        .single();
      if (error) throw error;

      const { data: tool } = await supabase
        .from('tools')
        .select('id, name, category, emoji')
        .eq('id', request.tool_id)
        .single();

      const { data: borrower } = await supabase
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .eq('id', request.borrower_id)
        .single();

      const { data: owner } = await supabase
        .from('users')
        .select('id, full_name, phone, avatar_url')
        .eq('id', request.owner_id)
        .single();

      setDetail({
        id: request.id,
        toolId: request.tool_id,
        toolName: tool?.name ?? 'Unknown Tool',
        toolCategory: tool?.category ?? 'Tools',
        toolEmoji: tool?.emoji ?? '🔧',
        borrowerId: request.borrower_id,
        borrowerName: borrower?.full_name ?? 'Neighbor',
        borrowerPhone: borrower?.phone ?? null,
        borrowerAvatar: borrower?.avatar_url ?? '',
        ownerId: request.owner_id,
        ownerName: owner?.full_name ?? 'Owner',
        ownerPhone: owner?.phone ?? null,
        ownerAvatar: owner?.avatar_url ?? '',
        pickupDate: request.pickup_date ?? '',
        duration: request.duration ?? '',
        message: request.message ?? null,
        status: request.status,
      });
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  }, [params.requestId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = detail?.ownerId === userId;
  const isBorrower = detail?.borrowerId === userId;

  async function handleApprove() {
    if (!params.requestId) return;
    try {
      setActionLoading(true);
      await supabase.from('tool_requests').update({ status: 'approved' }).eq('id', params.requestId);
      await loadData();
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!params.requestId) return;
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await supabase.from('tool_requests').update({ status: 'rejected' }).eq('id', params.requestId);
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

  async function handleCancel() {
    if (!params.requestId) return;
    Alert.alert('Cancel Request', 'Cancel this Nabourly request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            await cancelToolRequest(params.requestId!);
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

  async function handleComplete() {
    if (!params.requestId) return;
    Alert.alert('Mark as Complete', 'Mark this request as completed/returned?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            setActionLoading(true);
            await completeToolRequest(params.requestId!);
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
        <Text style={{ fontSize: 16, color: Colors.muted }}>Request not found.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, fontWeight: '600' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const st = statusColors[detail.status] ?? statusColors.pending;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Nabourly Request</Text>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusText, { color: st.text }]}>
            {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tool Card */}
        <View style={styles.toolCard}>
          <View style={[styles.toolEmojiWrap, { overflow: 'hidden' }]}>
            {detail.toolEmoji && detail.toolEmoji.startsWith('http') ? (
              <Image source={{ uri: detail.toolEmoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={styles.toolEmoji}>{detail.toolEmoji || '🔧'}</Text>
            )}
          </View>
          <View style={styles.toolInfo}>
            <Text style={styles.toolName}>{detail.toolName}</Text>
            <Text style={styles.toolCategory}>{detail.toolCategory}</Text>
          </View>
        </View>

        {/* Request Details */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>REQUEST DETAILS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Pick-up Date</Text>
            <Text style={styles.detailVal}>{detail.pickupDate || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Duration</Text>
            <Text style={styles.detailVal}>{detail.duration || 'Not specified'}</Text>
          </View>
          {detail.message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Message</Text>
              <Text style={styles.messageText}>{detail.message}</Text>
            </View>
          ) : null}
        </View>

        {/* Borrower Contact */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{isBorrower ? 'YOU (BORROWER)' : 'BORROWER'}</Text>
          <Pressable style={styles.contactRow} onPress={() => callPhone(detail.borrowerPhone)}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: detail.borrowerAvatar || undefined }}
                style={styles.avatar}
                contentFit="cover"
                transition={150}
              />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{detail.borrowerName}</Text>
              <Text style={styles.contactPhone}>{detail.borrowerPhone ?? 'No phone added'}</Text>
            </View>
            {detail.borrowerPhone && <Text style={styles.callBtn}>Call</Text>}
          </Pressable>
        </View>

        {/* Owner Contact */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{isOwner ? 'YOU (OWNER)' : 'OWNER'}</Text>
          <Pressable style={styles.contactRow} onPress={() => callPhone(detail.ownerPhone)}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: detail.ownerAvatar || undefined }}
                style={styles.avatar}
                contentFit="cover"
                transition={150}
              />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{detail.ownerName}</Text>
              <Text style={styles.contactPhone}>{detail.ownerPhone ?? 'No phone added'}</Text>
            </View>
            {detail.ownerPhone && <Text style={styles.callBtn}>Call</Text>}
          </Pressable>
        </View>
      </ScrollView>

      {/* Action Footer */}
      {(detail.status === 'pending' || detail.status === 'approved') && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {isOwner && detail.status === 'pending' ? (
            <>
              <Pressable
                style={[styles.rejectBtn, actionLoading && { opacity: 0.65 }]}
                onPress={handleReject}
                disabled={actionLoading}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.approveBtn, actionLoading && { opacity: 0.65 }]}
                onPress={handleApprove}
                disabled={actionLoading}
              >
                <Text style={styles.approveBtnText}>{actionLoading ? 'Saving...' : 'Approve'}</Text>
              </Pressable>
            </>
          ) : isOwner && detail.status === 'approved' ? (
            <Pressable
              style={[styles.completeBtn, actionLoading && { opacity: 0.65 }]}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <Text style={styles.completeBtnText}>{actionLoading ? 'Saving...' : 'Mark as Returned'}</Text>
            </Pressable>
          ) : isBorrower && detail.status === 'pending' ? (
            <Pressable
              style={[styles.cancelBtn, actionLoading && { opacity: 0.65 }]}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              <Text style={styles.cancelBtnText}>{actionLoading ? 'Cancelling...' : 'Cancel Request'}</Text>
            </Pressable>
          ) : isBorrower && detail.status === 'approved' ? (
            <Pressable
              style={[styles.completeBtn, actionLoading && { opacity: 0.65 }]}
              onPress={handleComplete}
              disabled={actionLoading}
            >
              <Text style={styles.completeBtnText}>{actionLoading ? 'Saving...' : 'Mark as Returned'}</Text>
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
  toolCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toolEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolEmoji: {
    fontSize: 28,
  },
  toolInfo: {
    flex: 1,
    gap: 2,
  },
  toolName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  toolCategory: {
    fontSize: 13,
    color: Colors.muted,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailKey: {
    fontSize: 14,
    color: Colors.muted,
  },
  detailVal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
  },
  messageBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageText: {
    fontSize: 14,
    color: Colors.darkMid,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  avatar: {
    width: 48,
    height: 48,
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
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  callBtn: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.accentBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rejectBtnText: {
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
});
