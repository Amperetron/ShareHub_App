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
import { Colors } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { fetchRides, type RideItem } from '../../lib/api';
import CreateShareModal from '../../components/CreateShareModal';

export default function DiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rides, setRides] = useState<RideItem[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);

  const loadRides = React.useCallback(async () => {
    setLoadingRides(true);
    const rows = await fetchRides();
    setRides(rows);
    setLoadingRides(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadRides()
      .then(() => {
        if (!mounted) return;
      })
      .catch((error) => {
        Alert.alert('Could not load rides', error instanceof Error ? error.message : 'Please try again.');
      });

    return () => {
      mounted = false;
    };
  }, [loadRides]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBorder}>
            <Image
              source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/80f1e3ed864f2f0aac80e203af6c6946c77d335b.jpg' }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          </View>
          <Text style={styles.headerBrand}>Neighborly</Text>
        </View>
        <Pressable style={styles.notifBtn}>
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
      >
        {/* Hero Brand Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <Image
              source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/0be76e07c3b7417178d2d312ceb20a9210fb2dc1.jpg' }}
              style={styles.heroLogo}
              contentFit="cover"
            />
            <Text style={styles.heroTitle}>Co-Ride</Text>
          </View>
          <Text style={styles.heroDesc}>
            {'Find neighbors headed your way. Beat the Silk Board traffic together, save costs, and reduce carbon.'}
          </Text>
        </View>

        {/* Route Search Card */}
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Image
              source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:167.png' }}
              style={{ width: 18, height: 18 }}
              contentFit="contain"
            />
            <Text style={styles.routeLabel}>Current Route</Text>
          </View>

          <View style={styles.routeDivider} />

          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.routeStop}>{rides[0]?.departure ?? 'No departure selected'}</Text>
          </View>

          <View style={styles.verticalLine} />

          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.blueMid }]} />
            <Text style={styles.routeStop}>{rides[0]?.arrival ?? 'No arrival selected'}</Text>
          </View>
        </View>

        {/* Date Card */}
        <View style={[styles.dateCard]}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:183.png' }}
            style={{ width: 27, height: 30, alignSelf: 'center' }}
            contentFit="contain"
          />
          <Text style={styles.dateText}>{rides[0] ? 'Next ride' : 'No rides yet'}</Text>
          <Text style={styles.dateSubText}>{rides[0]?.departureTime ?? 'Create a Co-Ride to show it here'}</Text>
        </View>

        {/* Nearby Pools Section */}
        <View style={styles.poolSection}>
          <View style={styles.poolHeader}>
            <Text style={styles.poolTitle}>Nearby Pools</Text>
            <Text style={styles.poolCount}>{loadingRides ? 'Loading' : `${rides.length} Available`}</Text>
          </View>
          {rides.map((ride) => (
            <View key={ride.id} style={[styles.rideCard, { backgroundColor: Colors.white }]}>
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
                      <Text style={styles.ratingText}>? {ride.driverRating} � {ride.driverRides} rides</Text>
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
                    <Text style={styles.stopLabel}>Departure</Text>
                    <Text style={styles.stopValue}>{ride.departureTime} � {ride.departure}</Text>
                  </View>
                  <View style={styles.stopDivider} />
                  <View style={styles.stopRow}>
                    <Text style={styles.stopLabel}>Arrival</Text>
                    <Text style={styles.stopValue}>{ride.arrivalTime} � {ride.arrival}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.rideBottom}>
                <View style={styles.seatsRow}>
                  <Text style={styles.seatsText}>{ride.seatsLeft} seats left</Text>
                </View>
                <Pressable
                  style={[styles.joinBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => router.push({
                    pathname: '/ride-booking',
                    params: {
                      rideId: ride.id,
                      driverName: ride.driverName,
                      driverAvatar: ride.driverAvatar,
                      driverRating: ride.driverRating,
                      driverRides: ride.driverRides,
                      departure: ride.departure,
                      arrival: ride.arrival,
                      departureTime: ride.departureTime,
                      arrivalTime: ride.arrivalTime,
                      co2Saving: ride.co2Saving,
                      fare: ride.fare,
                      seatsLeft: ride.seatsLeft,
                      vehicleName: ride.vehicleName,
                      vehicleNumber: ride.vehicleNumber,
                    },
                  })}
                >
                  <Text style={[styles.joinBtnText, { color: Colors.white }]}>Join Pool</Text>
                </Pressable>
              </View>
            </View>
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
            <View style={styles.ecoBtn}>
              <Text style={styles.ecoBtnText}>View My Impact</Text>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:289.png' }}
                style={{ width: 16, height: 16 }}
                contentFit="contain"
              />
            </View>
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
    gap: 16,
  },
  heroLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
  routeCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
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
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  routeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.4,
  },
  routeDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeStop: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 28,
  },
  verticalLine: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 3.5,
    marginVertical: 4,
  },
  dateCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.tealBg,
    lineHeight: 28,
  },
  dateSubText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.tealBg,
    opacity: 0.9,
    lineHeight: 20,
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
    gap: 0,
  },
  stopLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 0.6,
    lineHeight: 16.5,
  },
  stopValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
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

