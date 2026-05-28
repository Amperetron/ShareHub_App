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
import { getCurrentImpact, getCurrentProfile, profileDisplayName, type Profile } from '../../lib/api';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [impact, setImpact] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([getCurrentProfile(), getCurrentImpact()])
      .then(([profileRow, impactRow]) => {
        if (!mounted) return;
        setProfile(profileRow);
        setImpact(impactRow);
      })
      .catch((error) => {
        Alert.alert('Could not load profile', error instanceof Error ? error.message : 'Please try again.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarBorder}>
            <Image
              source={{ uri: profile?.avatar_url || 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/ed08e0b3e6e6d486cb6f96c1b19a83922e1a83e0.jpg' }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          </View>
          <Text style={styles.headerBrand}>Neighborly</Text>
        </View>
        <Pressable style={styles.notifBtn}>
          <Image
            source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:441.png' }}
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
        {/* Profile Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.memberBadge]}>
            <Text style={styles.memberBadgeText}>Community Member</Text>
          </View>
          <Text style={styles.profileName}>{profileDisplayName(profile)}</Text>
          <Text style={styles.profileBio}>
            {profile?.bio ?? profile?.location ?? 'Building a greener, more connected neighborhood.'}
          </Text>
        </View>

        {/* Impact Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Carbon Saved - tall card */}
          <View style={[styles.carbonCard]}>
            <View style={styles.carbonDecor} />
            <View style={styles.carbonContent}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:354.png' }}
                style={{ width: 25.6, height: 25.5 }}
                contentFit="contain"
              />
              <Text style={styles.carbonLabel}>Carbon Saved</Text>
            </View>
            <View style={styles.carbonNumber}>
              <Text style={styles.carbonValue}>{Math.round(Number(impact?.carbon_saved ?? profile?.carbon_saved ?? 0))}</Text>
              <Text style={styles.carbonUnit}>kg</Text>
            </View>
          </View>

          {/* Shares Card */}
          <View style={[styles.sharesCard]}>
            <Image
              source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:336.png' }}
              style={{ width: 31.5, height: 30 }}
              contentFit="contain"
            />
            <Text style={styles.sharesLabel}>Shares</Text>
            <Text style={styles.sharesValue}>{Number(impact?.tools_shared ?? profile?.shares_count ?? 0)}</Text>
            <Text style={styles.sharesSubLabel}>Total contributions</Text>
          </View>

          {/* Trusted Neighbor Badge */}
          <View style={styles.trustBadge}>
            <View style={styles.trustIcon}>
              <Image
                source={{ uri: 'https://cdn-ai.onspace.ai/onspace/figma/cxM1apJc3lTLRH6lpdyuWA/1:345.png' }}
                style={{ width: 20, height: 25 }}
                contentFit="contain"
              />
            </View>
            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>Trusted Neighbor</Text>
              <Text style={styles.trustDesc}>
                {`${profile?.rating ?? 0} rating from local households.`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.activeCard}>
            <Text style={styles.activeTitle}>No local records to show here yet</Text>
            <Text style={styles.activeSubtitle}>Created rides, shared items, event activity, and bookings are stored in Supabase and appear across the app.</Text>
          </View>
        </View>
      </ScrollView>
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
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: 96,
    paddingHorizontal: 24,
    gap: 40,
  },
  heroSection: {
    gap: 8,
    paddingTop: 16,
  },
  memberBadge: {
    backgroundColor: 'rgba(127,197,253,0.3)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006496',
    letterSpacing: 1.2,
    lineHeight: 16,
  },
  profileName: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.dark,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  profileBio: {
    fontSize: 18,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 29.2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  carbonCard: {
    width: '47%',
    height: 192,
    backgroundColor: Colors.primary,
    borderRadius: 32,
    padding: 24,
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 40,
      },
      android: { elevation: 6 },
    }),
  },
  carbonDecor: {
    position: 'absolute',
    right: -32,
    bottom: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.primaryLight,
    opacity: 0.3,
  },
  carbonContent: {
    gap: 8,
  },
  carbonLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    opacity: 0.8,
    lineHeight: 28,
  },
  carbonNumber: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  carbonValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 48,
    letterSpacing: -2.4,
  },
  carbonUnit: {
    fontSize: 20,
    fontWeight: '500',
    color: Colors.white,
    opacity: 0.7,
    lineHeight: 28,
    letterSpacing: -2.4,
    marginBottom: 4,
  },
  sharesCard: {
    width: '47%',
    height: 192,
    backgroundColor: Colors.white,
    borderRadius: 32,
    padding: 24,
    gap: 8,
    justifyContent: 'flex-end',
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 40,
      },
      android: { elevation: 4 },
    }),
  },
  sharesLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkMid,
    lineHeight: 28,
  },
  sharesValue: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 48,
    letterSpacing: -2.4,
  },
  sharesSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    lineHeight: 16,
  },
  trustBadge: {
    width: '100%',
    backgroundColor: 'rgba(127,197,253,0.2)',
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trustIcon: {
    width: 52,
    height: 57,
    borderRadius: 16,
    backgroundColor: Colors.blueMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustContent: {
    flex: 1,
  },
  trustTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00517b',
    lineHeight: 28,
  },
  trustDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: '#00517b',
    lineHeight: 20,
  },
  section: {
    gap: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 32,
  },
  inProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1.2,
    lineHeight: 16,
  },
  activeCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activeLeft: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  rideIconWrap: {
    width: 38.7,
    height: 48,
    backgroundColor: Colors.white,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  activeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 20,
  },
  confirmedBadge: {
    backgroundColor: '#8cf5e4',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  confirmedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00201c',
    letterSpacing: -0.5,
    lineHeight: 15,
  },
  activeBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickupText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkMid,
    lineHeight: 16,
  },
  historyList: {
    gap: 0,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 20,
    paddingBottom: 24,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 24,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    lineHeight: 16,
  },
  historyDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.darkMid,
    lineHeight: 20,
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.avatarBg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingTop: 3,
    paddingBottom: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16.5,
    letterSpacing: -0.6,
  },
  archiveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  archiveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    lineHeight: 24,
  },
});
