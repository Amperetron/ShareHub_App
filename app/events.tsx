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
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { fetchEvents, joinEvent, leaveEvent, fetchEventAttendees } from '../lib/api';

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_time: string;
  organizer_id: string;
  status: string;
};

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendeeMap, setAttendeeMap] = useState<Record<string, string[]>>({});
  const [joining, setJoining] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const rows = await fetchEvents();
      setEvents(rows);

      const map: Record<string, string[]> = {};
      await Promise.all(
        rows.map(async (event) => {
          try {
            const attendees = await fetchEventAttendees(event.id);
            map[event.id] = attendees.map((a: { user_id: string }) => a.user_id);
          } catch {
            map[event.id] = [];
          }
        })
      );
      setAttendeeMap(map);
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleJoin = async (eventId: string) => {
    setJoining(eventId);
    try {
      await joinEvent(eventId);
      await loadEvents();
    } catch (error) {
      Alert.alert('Error', JSON.stringify(error));
    } finally {
      setJoining(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Community Events</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {events.map((event) => {
          const attendeeIds = attendeeMap[event.id] ?? [];
          return (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <View style={styles.eventIconCircle}>
                  <Text style={styles.eventIcon}>🌱</Text>
                </View>
                <View style={styles.eventHeaderText}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventStatus}>{event.status}</Text>
                </View>
              </View>

              {event.description ? (
                <Text style={styles.eventDesc}>{event.description}</Text>
              ) : null}

              <View style={styles.eventMeta}>
                <Text style={styles.metaLabel}>📍 {event.location ?? 'TBD'}</Text>
                <Text style={styles.metaLabel}>
                  🕐 {event.event_time ? new Date(event.event_time).toLocaleString() : 'TBD'}
                </Text>
              </View>

              <View style={styles.eventFooter}>
                <Text style={styles.attendeeCount}>
                  {attendeeIds.length} attending
                </Text>
                <Pressable
                  style={[styles.joinBtn, joining === event.id && { opacity: 0.6 }]}
                  onPress={() => handleJoin(event.id)}
                  disabled={joining === event.id}
                >
                  <Text style={styles.joinBtnText}>
                    {joining === event.id ? 'Joining...' : 'Join Event'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {!loading && events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyDesc}>Create an event using the + button on the home screen.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(236,253,245,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 24, color: Colors.primary, fontWeight: '700' },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, gap: 20, paddingTop: 24 },
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 40,
      },
      android: { elevation: 6 },
    }),
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  eventIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIcon: { fontSize: 24 },
  eventHeaderText: { flex: 1, gap: 2 },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  eventStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  eventDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 22,
  },
  eventMeta: { gap: 6 },
  metaLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    lineHeight: 20,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attendeeCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
  },
});
