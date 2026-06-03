import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Colors } from '../constants/theme';
import { getRouteDistance, getRoutePath } from '../lib/api';
import FullRouteMap from './FullRouteMap';

interface Props {
  visible: boolean;
  onClose: () => void;
  onJoin: () => void;
  ride: {
    id: string;
    driverName: string;
    driverAvatar: string;
    driverRating: string;
    driverRides: string;
    departure: string;
    arrival: string;
    departureLat: number | null;
    departureLng: number | null;
    arrivalLat: number | null;
    arrivalLng: number | null;
    distanceKm: number | null;
    departureTime: string;
    arrivalTime: string;
    co2Saving: string;
    fare: string;
    seatsLeft: string;
    vehicleName: string;
    vehicleNumber: string;
  };
}

export default function RideDetailModal({ visible, onClose, onJoin, ride }: Props) {
  const [distance, setDistance] = useState<number | null>(ride.distanceKm);
  const [loading, setLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      overlayAnim.setValue(0);
    }
  }, [visible, overlayAnim]);

  const depLat = ride.departureLat ?? 0;
  const depLng = ride.departureLng ?? 0;
  const arrLat = ride.arrivalLat ?? 0;
  const arrLng = ride.arrivalLng ?? 0;
  const hasCoords = depLat !== 0 && depLng !== 0 && arrLat !== 0 && arrLng !== 0;

  useEffect(() => {
    if (visible && hasCoords) {
      setLoading(true);
      getRoutePath(
        { lat: depLat, lng: depLng },
        { lat: arrLat, lng: arrLng }
      )
        .then(setRouteCoords)
        .catch(() => setRouteCoords(null))
        .finally(() => setLoading(false));
      if (!distance) {
        getRouteDistance(
          { lat: depLat, lng: depLng },
          { lat: arrLat, lng: arrLng }
        )
          .then(setDistance)
          .catch(() => {});
      }
    }
  }, [visible, hasCoords, depLat, depLng, arrLat, arrLng]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: overlayAnim }]}>
        <Pressable style={styles.backdropPress} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarLetter}>{ride.driverName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.driverName}>{ride.driverName}</Text>
                <Text style={styles.rating}>⭐ {ride.driverRating} · {ride.driverRides} rides</Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {/* Map */}
          <View style={styles.mapContainer}>
            <FullRouteMap
              depLat={depLat}
              depLng={depLng}
              arrLat={arrLat}
              arrLng={arrLng}
              routeCoords={routeCoords}
              loading={loading}
              hasCoords={hasCoords}
              departure={ride.departure}
              arrival={ride.arrival}
            />
            {distance && (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
              </View>
            )}
          </View>

          {/* Route info */}
          <View style={styles.routeInfo}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.routeValue} numberOfLines={1}>{ride.departure}</Text>
                <Text style={styles.routeTime}>{ride.departureTime}</Text>
              </View>
            </View>
            <View style={styles.routeConnector} />
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: Colors.blueMid }]} />
              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>To</Text>
                <Text style={styles.routeValue} numberOfLines={1}>{ride.arrival}</Text>
                {ride.arrivalTime ? <Text style={styles.routeTime}>{ride.arrivalTime}</Text> : null}
              </View>
            </View>
          </View>

          {/* Distance */}
          {!hasCoords && distance && (
            <View style={styles.distanceRow}>
              <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
              {loading && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>
          )}

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Fare</Text>
              <Text style={styles.detailValue}>₹{ride.fare}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Seats</Text>
              <Text style={styles.detailValue}>{ride.seatsLeft}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>CO₂ saved</Text>
              <Text style={styles.detailValue}>{ride.co2Saving} kg</Text>
            </View>
            {ride.vehicleName ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{ride.vehicleName}</Text>
              </View>
            ) : null}
          </View>

          {/* Join button */}
          <Pressable style={styles.joinBtn} onPress={onJoin}>
            <Text style={styles.joinText}>Join Pool</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark,
  },
  rating: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    color: Colors.dark,
    fontWeight: '300',
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt,
    position: 'relative',
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.dark,
  },
  routeInfo: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  routeText: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark,
    marginTop: 2,
  },
  routeTime: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  routeConnector: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 4,
    marginVertical: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 16,
  },
  detailItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    marginTop: 2,
  },
  joinBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});
