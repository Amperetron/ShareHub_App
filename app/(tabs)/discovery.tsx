import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchRides, getCurrentProfile, type Profile, type RideItem } from '../../lib/api';
import CreateShareModal from '../../components/CreateShareModal';
import RideDetailModal from '../../components/RideDetailModal';
import HeaderMenu from '../../components/HeaderMenu';

export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rides, setRides] = useState<RideItem[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [selectedRide, setSelectedRide] = useState<RideItem | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const mountedRef = useRef(true);

  const loadRides = useCallback(async (silent = false) => {
    if (!silent) setLoadingRides(true);
    try {
      const [rows, profileRow] = await Promise.all([fetchRides(), getCurrentProfile()]);
      if (mountedRef.current) {
        setRides(rows);
        setProfile(profileRow);
      }
    } catch (error) {
      if (mountedRef.current) {
        Alert.alert('Could not load rides', JSON.stringify(error));
      }
    } finally {
      if (mountedRef.current) {
        setLoadingRides(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      loadRides();
      return () => {
        mountedRef.current = false;
      };
    }, [loadRides])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRides(true);
  }, [loadRides]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <HeaderMenu avatarUrl={profile?.avatar_url} />
          <Text style={styles.headerBrand}>ShareHub</Text>
        </View>
        <Pressable style={styles.notifBtn} onPress={() => router.push('/notifications')}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:302.png' }}
            style={{ width: 16, height: 20 }}
            contentFit="contain"
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        {/* Hero Brand Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <Text style={styles.heroTitle}>Co-Ride</Text>
          </View>
        </View>

        {/* Nearby Pools Section */}
        <View style={styles.poolSection}>
          <View style={styles.poolHeader}>
            <Text style={styles.poolTitle}>Nearby Pools</Text>
            <Text style={styles.poolCount}>{loadingRides ? 'Loading' : `${rides.length} Available`}</Text>
          </View>
          {rides.map((ride) => (
            <Pressable
              key={ride.id}
              style={[styles.rideCard, { backgroundColor: Colors.white }]}
              onPress={() => setSelectedRide(ride)}
            >
              <View style={styles.rideTop}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatarWrap}>
                    <Image
                      source={{ uri: ride.driverAvatar }}
                      style={styles.driverAvatar}
                      contentFit="cover"
                    />
                  </View>
                  <View>
                    <Text style={styles.driverName}>{ride.driverName}</Text>
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingText}>? {ride.driverRating} · {ride.driverRides} rides</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.co2Badge}>
                  <Text style={styles.co2Text}>-{ride.co2Saving}kg CO2</Text>
                </View>
              </View>

              <View style={styles.routeDetail}>
                <View style={styles.routeVertical}>
                  <LinearGradient
                    colors={['#006156', '#006496']}
                    style={styles.verticalGradLine}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </View>
                <View style={styles.routeStops}>
                  <View style={styles.stopRow}>
                    <View style={styles.stopTextCol}>
                      <Text style={styles.stopLabel}>Departure</Text>
                      <Text style={styles.stopValue} numberOfLines={2}>{ride.departure}</Text>
                    </View>
                    <Text style={styles.stopTime}>{ride.departureTime}</Text>
                  </View>
                  <View style={styles.stopDivider} />
                  <View style={styles.stopRow}>
                    <View style={styles.stopTextCol}>
                      <Text style={styles.stopLabel}>Arrival</Text>
                      <Text style={styles.stopValue} numberOfLines={2}>{ride.arrival}</Text>
                    </View>
                    <Text style={styles.stopTime}>{ride.arrivalTime}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rideBottom}>
                <View style={styles.seatsRow}>
                  <Text style={styles.seatsText}>{ride.seatsLeft} seats left</Text>
                </View>
                <View
                  style={[styles.joinBtn, { backgroundColor: Colors.primary }]}
                >
                  <Text style={[styles.joinBtnText, { color: Colors.white }]}>View Details</Text>
                </View>
              </View>
            </Pressable>
          ))}

          {!loadingRides && rides.length === 0 ? (
            <View style={[styles.rideCard, { backgroundColor: Colors.white }]}> 
              <Text style={styles.driverName}>No rides available</Text>
              <Text style={styles.heroDesc}>Add rows to the rides table and they will appear here.</Text>
            </View>
          ) : null}
          {/* Eco Impact Card */}
          <LinearGradient
            colors={['#366000', '#497b09']}
            style={styles.ecoCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ecoLeafBg}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:279.png' }}
                style={{ width: 135, height: 150, opacity: 0.1 }}
                contentFit="contain"
              />
            </View>
            <Text style={styles.ecoTitle}>
              {'Share a ride,\nreduce costs,\nand cut emissions.'}
            </Text>
            <Text style={styles.ecoDesc}>
              {'Savings update from\nlive community rides.'}
            </Text>
            <Pressable style={styles.ecoBtn} onPress={() => router.push('/(tabs)/profile')}>
              <Text style={styles.ecoBtnText}>View My Impact</Text>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:289.png' }}
                style={{ width: 16, height: 16 }}
                contentFit="contain"
              />
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + 90 }]} onPress={() => setCreateVisible(true)}>
        <Image
          source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:293.png' }}
          style={{ width: 17.5, height: 17.5 }}
          contentFit="contain"
        />
      </Pressable>

      <CreateShareModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={loadRides}
      />

      <RideDetailModal
        visible={selectedRide !== null}
        onClose={() => setSelectedRide(null)}
        onJoin={() => {
          if (!selectedRide) return;
          setSelectedRide(null);
          router.push({
            pathname: '/ride-booking',
            params: {
              rideId: selectedRide.id,
              driverName: selectedRide.driverName,
              driverAvatar: selectedRide.driverAvatar,
              driverRating: selectedRide.driverRating,
              driverRides: selectedRide.driverRides,
              departure: selectedRide.departure,
              arrival: selectedRide.arrival,
              departureLat: selectedRide.departureLat ?? '',
              departureLng: selectedRide.departureLng ?? '',
              arrivalLat: selectedRide.arrivalLat ?? '',
              arrivalLng: selectedRide.arrivalLng ?? '',
              distanceKm: selectedRide.distanceKm ?? '',
              departureTime: selectedRide.departureTime,
              arrivalTime: selectedRide.arrivalTime,
              co2Saving: selectedRide.co2Saving,
              fare: selectedRide.fare,
              seatsLeft: selectedRide.seatsLeft,
              vehicleName: selectedRide.vehicleName,
              vehicleNumber: selectedRide.vehicleNumber,
            },
          });
        }}
        ride={selectedRide ? {
          id: selectedRide.id,
          driverName: selectedRide.driverName,
          driverAvatar: selectedRide.driverAvatar,
          driverRating: selectedRide.driverRating,
          driverRides: selectedRide.driverRides,
          departure: selectedRide.departure,
          arrival: selectedRide.arrival,
          departureLat: selectedRide.departureLat,
          departureLng: selectedRide.departureLng,
          arrivalLat: selectedRide.arrivalLat,
          arrivalLng: selectedRide.arrivalLng,
          distanceKm: selectedRide.distanceKm,
          departureTime: selectedRide.departureTime,
          arrivalTime: selectedRide.arrivalTime,
          co2Saving: selectedRide.co2Saving,
          fare: selectedRide.fare,
          seatsLeft: selectedRide.seatsLeft,
          vehicleName: selectedRide.vehicleName,
          vehicleNumber: selectedRide.vehicleNumber,
        } : {
          id: '', driverName: '', driverAvatar: '', driverRating: '', driverRides: '',
          departure: '', arrival: '', departureLat: null, departureLng: null,
          arrivalLat: null, arrivalLng: null, distanceKm: null, departureTime: '',
          arrivalTime: '', co2Saving: '', fare: '', seatsLeft: '', vehicleName: '', vehicleNumber: '',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(236,253,245,0.95)',
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#8cf5e4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primaryDark,
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 96,
    paddingHorizontal: 24,
    gap: 24,
  },
  heroSection: {
    gap: 8,
    paddingTop: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  heroDesc: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 26,
  },
  poolSection: {
    gap: 24,
  },
  poolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  poolTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 32,
  },
  poolCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.7,
  },
  rideCard: {
    borderRadius: 24,
    padding: 24,
    gap: 23,
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
  rideTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.avatarBg,
    overflow: 'hidden',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    lineHeight: 16,
  },
  co2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.greenBright,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  co2Text: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0e2000',
    letterSpacing: 1,
  },
  routeDetail: {
    flexDirection: 'row',
    gap: 24,
  },
  routeVertical: {
    width: 1.5,
    alignItems: 'center',
    marginLeft: 8,
  },
  verticalGradLine: {
    width: 1.5,
    height: 80,
    opacity: 0.3,
  },
  routeStops: {
    flex: 1,
    gap: 15,
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  stopTextCol: {
    flex: 1,
    gap: 2,
  },
  stopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  stopValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 21,
  },
  stopTime: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginTop: 2,
  },
  stopDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  rideBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: '#dfe3e1',
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  joinBtn: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seatsText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkMid,
    lineHeight: 20,
  },
  ecoCard: {
    borderRadius: 40,
    padding: 32,
    overflow: 'hidden',
    gap: 8,
  },
  ecoLeafBg: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  ecoTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.greenLight,
    lineHeight: 37.5,
  },
  ecoDesc: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.greenLight,
    lineHeight: 24,
    paddingBottom: 8,
  },
  ecoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(213,255,167,0.1)',
    borderWidth: 1,
    borderColor: Colors.greenLight,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  ecoBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.5,
        shadowRadius: 50,
      },
      android: { elevation: 16 },
    }),
  },
});

