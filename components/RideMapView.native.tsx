import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Colors } from '../constants/theme';

// Fallback route coordinates for native map rendering.
const STOPS = [
  { latitude: 12.97, longitude: 77.59 },
  { latitude: 12.94, longitude: 77.61 },
  { latitude: 12.91, longitude: 77.64 },
];

const MID_REGION = {
  latitude: (STOPS[0].latitude + STOPS[2].latitude) / 2,
  longitude: (STOPS[0].longitude + STOPS[2].longitude) / 2,
  latitudeDelta: 0.13,
  longitudeDelta: 0.1,
};

interface Props {
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
}

export default function RideMapView({ departure, arrival, departureTime, arrivalTime }: Props) {
  const depLabel = departure.split(' ').slice(0, 2).join(' ');
  const arrLabel = arrival.split(' ').slice(0, 2).join(' ');

  return (
    <View style={styles.wrapper}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={MID_REGION}
        showsUserLocation={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Route polyline */}
        <Polyline
          coordinates={STOPS}
          strokeColor={Colors.primary}
          strokeWidth={3.5}
          lineDashPattern={[0]}
        />

        {/* Departure — green pin */}
        <Marker coordinate={STOPS[0]} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.pinWrap}>
            <View style={[styles.pinBody, { backgroundColor: Colors.primary }]}>
              <Text style={styles.pinLetter}>A</Text>
            </View>
            <View style={[styles.pinTip, { borderTopColor: Colors.primary }]} />
          </View>
        </Marker>

        {/* Midpoint */}
        <Marker coordinate={STOPS[1]} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.midDotWrap}>
            <View style={styles.midDot} />
          </View>
        </Marker>

        {/* Arrival — blue pin */}
        <Marker coordinate={STOPS[2]} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.pinWrap}>
            <View style={[styles.pinBody, { backgroundColor: Colors.blueMid }]}>
              <Text style={styles.pinLetter}>B</Text>
            </View>
            <View style={[styles.pinTip, { borderTopColor: Colors.blueMid }]} />
          </View>
        </Marker>
      </MapView>

      {/* Bottom label strip */}
      <View style={styles.labelStrip}>
        <View style={[styles.labelPill, { backgroundColor: Colors.primary }]}>
          <Text style={styles.labelStop} numberOfLines={1}>{depLabel}</Text>
          <Text style={styles.labelTime}>{departureTime}</Text>
        </View>

        <View style={styles.labelConnector}>
          <View style={styles.connectorLine} />
          <View style={[styles.connectorDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.connectorLabel}>Pickup</Text>
          <View style={styles.connectorLine} />
        </View>

        <View style={[styles.labelPill, { backgroundColor: Colors.blueMid }]}>
          <Text style={styles.labelStop} numberOfLines={1}>{arrLabel}</Text>
          <Text style={styles.labelTime}>{arrivalTime}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e8f4f0',
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 18,
      },
      android: { elevation: 5 },
    }),
  },

  // ─── Pins ─────────────────────────────────────────────────────────────────
  pinWrap: { alignItems: 'center' },
  pinBody: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
      android: { elevation: 5 },
    }),
  },
  pinLetter: { fontSize: 13, fontWeight: '800', color: '#fff' },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // ─── Midpoint dot ─────────────────────────────────────────────────────────
  midDotWrap: { alignItems: 'center', justifyContent: 'center' },
  midDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f59e0b',
    borderWidth: 2.5,
    borderColor: '#fff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  // ─── Label strip ─────────────────────────────────────────────────────────
  labelStrip: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  labelPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    minWidth: 80,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  labelStop: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  labelTime: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
  },

  labelConnector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  connectorLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  connectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  connectorLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 10,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
