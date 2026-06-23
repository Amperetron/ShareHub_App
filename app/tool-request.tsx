import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/theme';
import { createToolRequest } from '../lib/api';

// ─── Date helpers ─────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getNextDays(count: number) {
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      key: String(i),
      dayName: DAYS[d.getDay()],
      dayNum: d.getDate(),
      month: MONTHS[d.getMonth()],
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : null,
    });
  }
  return days;
}

const DATES = getNextDays(7);

const DURATIONS = [
  { id: 'd1', label: '1 day', desc: 'Return same night' },
  { id: 'd2', label: '2–3 days', desc: 'Weekend project' },
  { id: 'd3', label: '1 week', desc: 'Extended use' },
];

export default function ToolRequestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams<{
    toolId: string;
    ownerId: string;
    toolName: string;
    toolBrand: string;
    toolEmoji: string;
    toolColor: string;
    toolAccentColor: string;
    toolCondition: string;
    toolDescription: string;
    ownerName: string;
    ownerAvatar: string;
    ownerRating: string;
    ownerLends: string;
    distance: string;
  }>();

  const {
    toolId,
    ownerId,
    toolName = 'Power Drill',
    toolBrand = 'Bosch GSB 500',
    toolEmoji = '🔧',
    toolColor = '#e8f4ff',
    toolAccentColor = '#006496',
    toolCondition = 'Excellent',
    toolDescription = 'High-torque drill with 25 accessories.',
    ownerName = 'Owner',
    ownerAvatar = '',
    ownerRating = '4.8',
    ownerLends = '12',
    distance = '0.8 km',
  } = params;

  const [selectedDate, setSelectedDate] = useState<string>('0');
  const [selectedDuration, setSelectedDuration] = useState<string>('d1');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const selectedDateObj = DATES.find((d) => d.key === selectedDate);
  const selectedDurationObj = DURATIONS.find((d) => d.id === selectedDuration);

  async function handleRequest() {
    if (!message.trim()) {
      Alert.alert('Add a message', 'Please introduce yourself and explain how you plan to use the item.');
      return;
    }

    if (!toolId || !ownerId) {
      Alert.alert('Missing details', 'Please go back and select the item again.');
      return;
    }

    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + Number(selectedDate));

    try {
      await createToolRequest({
        toolId,
        ownerId,
        pickupDate: pickupDate.toISOString().slice(0, 10),
        duration: selectedDurationObj?.label ?? selectedDuration,
        message: message.trim(),
      });
      setConfirmed(true);
      setTimeout(() => {
        router.back();
      }, 2200);
    } catch (error) {
      Alert.alert('Request failed', JSON.stringify(error));
    }
  }

  if (confirmed) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#366000', '#497b09']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.successContent}>
          <View style={[styles.successIcon, { overflow: 'hidden' }]}>
            {toolEmoji && toolEmoji.startsWith('http') ? (
              <Image source={{ uri: toolEmoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={{ fontSize: 52 }}>{toolEmoji}</Text>
            )}
          </View>
          <Text style={styles.successTitle}>Request Sent!</Text>
          <Text style={styles.successDesc}>
            {`Your request for\n`}
            <Text style={{ fontWeight: '700' }}>{toolName}</Text>
            {` has been sent to ${ownerName}.\nThey typically respond within 2 hours.`}
          </Text>
          <View style={styles.successEcoPill}>
            <Text style={styles.successEcoText}>🌿  You chose sharing over buying</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Request Nabourly</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tool Hero Card */}
        <View style={[styles.toolHeroCard, { borderColor: toolColor }]}>
          <View style={[styles.toolEmojiWrap, { backgroundColor: toolColor, overflow: 'hidden' }]}>
            {toolEmoji && toolEmoji.startsWith('http') ? (
              <Image source={{ uri: toolEmoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={styles.toolEmoji}>{toolEmoji}</Text>
            )}
          </View>
          <View style={styles.toolHeroInfo}>
            <View style={[styles.conditionPill, { backgroundColor: toolColor }]}>
              <Text style={[styles.conditionText, { color: toolAccentColor }]}>{toolCondition}</Text>
            </View>
            <Text style={styles.toolHeroName}>{toolName}</Text>
            <Text style={styles.toolHeroBrand}>{toolBrand}</Text>
            <Text style={styles.toolHeroDesc}>{toolDescription}</Text>
          </View>
        </View>

        {/* Owner Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TOOL OWNER</Text>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatarWrap}>
              <Image
                source={{ uri: ownerAvatar }}
                style={styles.ownerAvatar}
                contentFit="cover"
                transition={150}
              />
              <View style={[styles.verifiedDot, { backgroundColor: toolAccentColor }]}>
                <Text style={styles.verifiedCheck}>✓</Text>
              </View>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{ownerName}</Text>
              <View style={styles.ownerMeta}>
                <Text style={styles.ownerMetaItem}>★ {ownerRating}</Text>
                <Text style={styles.ownerMetaDot}>·</Text>
                <Text style={styles.ownerMetaItem}>{ownerLends} items lent</Text>
                <Text style={styles.ownerMetaDot}>·</Text>
                <Text style={styles.ownerMetaItem}>📍 {distance}</Text>
              </View>
              <Text style={styles.ownerResponseTime}>Typically responds in 2 hrs</Text>
            </View>
          </View>
        </View>

        {/* Date Picker */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PICK UP DATE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.datesRow}
          >
            {DATES.map((d) => (
              <Pressable
                key={d.key}
                style={[
                  styles.dateChip,
                  selectedDate === d.key && { backgroundColor: toolAccentColor, borderColor: toolAccentColor },
                ]}
                onPress={() => setSelectedDate(d.key)}
              >
                {d.label ? (
                  <Text style={[
                    styles.dateTodayLabel,
                    selectedDate === d.key && { color: 'rgba(255,255,255,0.7)' },
                  ]}>
                    {d.label}
                  </Text>
                ) : (
                  <Text style={[
                    styles.dateDayName,
                    selectedDate === d.key && { color: 'rgba(255,255,255,0.7)' },
                  ]}>
                    {d.dayName}
                  </Text>
                )}
                <Text style={[
                  styles.dateDayNum,
                  selectedDate === d.key && { color: Colors.white },
                ]}>
                  {d.dayNum}
                </Text>
                <Text style={[
                  styles.dateMonth,
                  selectedDate === d.key && { color: 'rgba(255,255,255,0.7)' },
                ]}>
                  {d.month}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Duration Picker */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>BORROW DURATION</Text>
          <View style={styles.durationsCol}>
            {DURATIONS.map((dur) => {
              const isSelected = selectedDuration === dur.id;
              return (
                <Pressable
                  key={dur.id}
                  style={[
                    styles.durationOption,
                    isSelected && { borderColor: toolAccentColor, backgroundColor: toolColor },
                  ]}
                  onPress={() => setSelectedDuration(dur.id)}
                >
                  <View style={styles.durationLeft}>
                    <View style={[
                      styles.durationRadio,
                      isSelected && { borderColor: toolAccentColor },
                    ]}>
                      {isSelected ? (
                        <View style={[styles.durationRadioFill, { backgroundColor: toolAccentColor }]} />
                      ) : null}
                    </View>
                    <View style={styles.durationText}>
                      <Text style={[styles.durationLabel, isSelected && { color: toolAccentColor }]}>
                        {dur.label}
                      </Text>
                      <Text style={styles.durationDesc}>{dur.desc}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Message Box */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MESSAGE TO OWNER</Text>
          <Text style={styles.messageHint}>
            Introduce yourself and explain how you plan to use this tool.
          </Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder={`Hi ${ownerName.split(' ')[0]}, I need the ${toolName} to...`}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={300}
          />
          <Text style={styles.charCount}>{message.length}/300</Text>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: toolColor, borderColor: toolColor }]}>
          <Text style={[styles.summaryTitle, { color: toolAccentColor }]}>Request Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Tool</Text>
            <Text style={[styles.summaryVal, { color: toolAccentColor }]}>{toolName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Pick up</Text>
            <Text style={[styles.summaryVal, { color: toolAccentColor }]}>
              {selectedDateObj ? `${selectedDateObj.dayName}, ${selectedDateObj.dayNum} ${selectedDateObj.month}` : '—'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Duration</Text>
            <Text style={[styles.summaryVal, { color: toolAccentColor }]}>{selectedDurationObj?.label ?? '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Owner</Text>
            <Text style={[styles.summaryVal, { color: toolAccentColor }]}>{ownerName}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: `${toolAccentColor}22` }]} />
          <Text style={[styles.summaryNote, { color: toolAccentColor }]}>
            {'🤝  This is a free community request. No fees — just neighborly trust.'}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.requestBtn,
            { backgroundColor: toolAccentColor },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handleRequest}
        >
          <Text style={styles.requestBtnText}>Send Request</Text>
        </Pressable>
        <Text style={styles.footerNote}>
          Free to request · No deposit required
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Success ──────────────────────────────────────────────────────────────
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
  successTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.9,
  },
  successDesc: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 26,
    textAlign: 'center',
  },
  successEcoPill: {
    backgroundColor: 'rgba(213,255,167,0.2)',
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.greenLight,
    marginTop: 8,
  },
  successEcoText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
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
    paddingTop: 20,
    gap: 16,
  },

  // ─── Tool Hero ────────────────────────────────────────────────────────────
  toolHeroCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 5 },
    }),
  },
  toolEmojiWrap: {
    width: 88,
    height: 88,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toolEmoji: {
    fontSize: 40,
  },
  toolHeroInfo: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  conditionPill: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toolHeroName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  toolHeroBrand: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    lineHeight: 18,
  },
  toolHeroDesc: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 19,
    marginTop: 4,
  },

  // ─── Cards ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: { elevation: 3 },
    }),
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 1.5,
  },

  // ─── Owner ────────────────────────────────────────────────────────────────
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ownerAvatarWrap: {
    position: 'relative',
  },
  ownerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.avatarBg,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  verifiedCheck: {
    fontSize: 9,
    color: Colors.white,
    fontWeight: '800',
  },
  ownerInfo: {
    flex: 1,
    gap: 3,
  },
  ownerName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.4,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  ownerMetaItem: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.darkMid,
  },
  ownerMetaDot: {
    fontSize: 12,
    color: Colors.muted,
  },
  ownerResponseTime: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    marginTop: 2,
  },

  // ─── Dates ────────────────────────────────────────────────────────────────
  datesRow: {
    gap: 8,
    flexDirection: 'row',
  },
  dateChip: {
    width: 62,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  dateTodayLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  dateDayName: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  dateDayNum: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 26,
    letterSpacing: -0.5,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.muted,
  },

  // ─── Durations ────────────────────────────────────────────────────────────
  durationsCol: {
    gap: 10,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  durationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationRadioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  durationText: {
    gap: 1,
  },
  durationLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
  },
  durationDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
  },

  // ─── Message ──────────────────────────────────────────────────────────────
  messageHint: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.muted,
    lineHeight: 18,
    marginTop: -6,
  },
  messageInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontWeight: '400',
    color: Colors.dark,
    lineHeight: 22,
    minHeight: 110,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    textAlign: 'right',
    marginTop: -6,
  },

  // ─── Summary ──────────────────────────────────────────────────────────────
  summaryCard: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    borderWidth: 2,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryKey: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  summaryNote: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },

  // ─── Sticky Footer ────────────────────────────────────────────────────────
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
    gap: 8,
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
  requestBtn: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },
  requestBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  footerNote: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    textAlign: 'center',
    paddingBottom: 2,
  },
});
