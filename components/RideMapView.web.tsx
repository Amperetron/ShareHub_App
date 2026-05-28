import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
}

// Web fallback: a clean route timeline strip (no native map required)
export default function RideMapView({ departure, arrival, departureTime, arrivalTime }: Props) {
  return (
    <View style={styles.container}>
      {/* Map not available notice */}
      <View style={styles.noticeRow}>
        <Text style={styles.noticeIcon}>🗺️</Text>
        <Text style={styles.noticeText}>Live map available on the mobile app</Text>
      </View>

      {/* Route timeline */}
      <View style={styles.timeline}>
        {/* Departure */}
        <View style={styles.stopRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={styles.connector} />
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName} numberOfLines={1}>{departure}</Text>
            <View style={[styles.timePill, { backgroundColor: 'rgba(0,97,86,0.1)' }]}>
              <Text style={[styles.timeText, { color: Colors.primary }]}>{departureTime}</Text>
            </View>
          </View>
        </View>
        {/* Arrival */}
        <View style={[styles.stopRow, { marginBottom: 0 }]}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: Colors.blueMid }]} />
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName} numberOfLines={1}>{arrival}</Text>
            <View style={[styles.timePill, { backgroundColor: 'rgba(127,197,253,0.2)' }]}>
              <Text style={[styles.timeText, { color: Colors.blueMid }]}>{arrivalTime}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Distance badge */}
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>Route overview</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,97,86,0.07)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noticeIcon: { fontSize: 14 },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },

  timeline: { gap: 0 },
  stopRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 0,
  },
  dotCol: {
    width: 12,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 4,
    minHeight: 28,
  },
  stopInfo: {
    flex: 1,
    paddingBottom: 20,
    gap: 6,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 22,
  },
  timePill: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  midpointBadge: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  midpointText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.darkMid,
  },

  distanceBadge: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
  },
});
