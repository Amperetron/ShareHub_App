import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { getRoutePath } from '../lib/api';
import FullRouteMap from '../components/FullRouteMap';

export default function RideRouteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    departure: string;
    arrival: string;
    departureLat: string;
    departureLng: string;
    arrivalLat: string;
    arrivalLng: string;
    distanceKm: string;
    driverName: string;
    driverAvatar: string;
  }>();

  const depLat = parseFloat(params.departureLat);
  const depLng = parseFloat(params.departureLng);
  const arrLat = parseFloat(params.arrivalLat);
  const arrLng = parseFloat(params.arrivalLng);

  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isNaN(depLat) && !isNaN(depLng) && !isNaN(arrLat) && !isNaN(arrLng)) {
      getRoutePath({ lat: depLat, lng: depLng }, { lat: arrLat, lng: arrLng })
        .then(setRouteCoords)
        .catch(() => setRouteCoords(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const hasCoords = !isNaN(depLat) && !isNaN(depLng) && !isNaN(arrLat) && !isNaN(arrLng);

  const midRegion = hasCoords
    ? {
        latitude: (depLat + arrLat) / 2,
        longitude: (depLng + arrLng) / 2,
        latitudeDelta: Math.abs(depLat - arrLat) * 1.8 || 0.05,
        longitudeDelta: Math.abs(depLng - arrLng) * 1.8 || 0.05,
      }
    : {
        latitude: 12.97,
        longitude: 77.59,
        latitudeDelta: 0.15,
        longitudeDelta: 0.12,
      };

  const depLabel = params.departure?.split(',').slice(0, 2).join(',') || 'Departure';
  const arrLabel = params.arrival?.split(',').slice(0, 2).join(',') || 'Arrival';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:351.png' }}
            style={{ width: 9, height: 16 }}
            contentFit="contain"
          />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Route Map</Text>
          {params.distanceKm ? <Text style={styles.headerDist}>{params.distanceKm} km</Text> : null}
        </View>
        <View style={styles.headerRight}>
          {params.driverName ? (
            <View style={styles.driverBadge}>
              <Text style={styles.driverBadgeText}>{params.driverName}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <FullRouteMap
        depLat={depLat}
        depLng={depLng}
        arrLat={arrLat}
        arrLng={arrLng}
        routeCoords={routeCoords}
        loading={loading}
        hasCoords={hasCoords}
        midRegion={midRegion}
      />

      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.bottomRow}>
          <View style={styles.bottomStop}>
            <View style={[styles.stopDot, { backgroundColor: Colors.primary }]} />
            <Text numberOfLines={1} style={styles.stopLabel}>{depLabel}</Text>
          </View>
          <View style={styles.bottomConnector}>
            <View style={styles.connectorLine} />
            <Image
              source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:27.png' }}
              style={{ width: 16, height: 10 }}
              contentFit="contain"
            />
            <View style={styles.connectorLine} />
          </View>
          <View style={styles.bottomStop}>
            <View style={[styles.stopDot, { backgroundColor: Colors.blueMid }]} />
            <Text numberOfLines={1} style={styles.stopLabel}>{arrLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.dark },
  headerDist: { fontSize: 12, fontWeight: '600', color: Colors.muted, marginTop: 2 },
  headerRight: { minWidth: 36, alignItems: 'flex-end' },
  driverBadge: {
    backgroundColor: Colors.accentBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  driverBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomStop: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  stopDot: { width: 10, height: 10, borderRadius: 5 },
  stopLabel: { fontSize: 13, fontWeight: '600', color: Colors.dark, flex: 1 },
  bottomConnector: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  connectorLine: { flex: 1, height: 1, backgroundColor: Colors.border },
});
