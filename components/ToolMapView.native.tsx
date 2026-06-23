import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const USER_LOCATION = { latitude: 12.9116, longitude: 77.6389 };

const CATEGORY_COLORS: Record<string, string> = {
  'Power Tools': '#006496',
  'Garden': '#366000',
  'Kitchen': '#c2410c',
  'Cleaning': '#006156',
  'Ladders': '#92400e',
  'Sport': '#0369a1',
  'All': '#006156',
};

export interface ToolItem {
  id: string;
  ownerId: string;
  name: string;
  brand: string;
  category: string;
  ownerName: string;
  ownerAvatar: string;
  distance: string;
  distanceNum: number;
  available: boolean;
  rating: number;
  lends: number;
  emoji: string;
  color: string;
  accentColor: string;
  condition: string;
  description: string;
  coordinates: { latitude: number; longitude: number };
}

interface Props {
  filteredTools: ToolItem[];
  selectedMapTool: string | null;
  setSelectedMapTool: (id: string | null) => void;
  onRequestBorrow: (tool: ToolItem) => void;
}

export default function ToolMapView({ filteredTools, selectedMapTool, setSelectedMapTool, onRequestBorrow }: Props) {
  const selectedObj = selectedMapTool ? filteredTools.find((t) => t.id === selectedMapTool) ?? null : null;

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: USER_LOCATION.latitude,
          longitude: USER_LOCATION.longitude,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        showsUserLocation={false}
        showsCompass={false}
        showsPointsOfInterest={false}
      >
        {/* User location ring */}
        <Circle
          center={USER_LOCATION}
          radius={80}
          fillColor="rgba(0,97,86,0.15)"
          strokeColor="rgba(0,97,86,0.5)"
          strokeWidth={2}
        />
        {/* User dot */}
        <Marker coordinate={USER_LOCATION} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.userMarker}>
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>

        {/* Tool pins */}
        {filteredTools.map((tool) => {
          const catColor = CATEGORY_COLORS[tool.category] ?? Colors.primary;
          const isSelected = selectedMapTool === tool.id;
          return (
            <Marker
              key={tool.id}
              coordinate={tool.coordinates}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => setSelectedMapTool(isSelected ? null : tool.id)}
            >
              <View style={styles.pinWrap}>
                {/* Distance label */}
                <View style={[styles.distanceLabel, { backgroundColor: catColor }]}>
                  <Text style={styles.distanceLabelText}>{tool.distance}</Text>
                </View>
                {/* Pin circle */}
                <View style={[
                  styles.pinBody,
                  { backgroundColor: catColor, overflow: 'hidden' },
                  isSelected && styles.pinBodySelected,
                  !tool.available && { opacity: 0.55 },
                ]}>
                  {tool.emoji && tool.emoji.startsWith('http') ? (
                    <Image source={{ uri: tool.emoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  ) : (
                    <Text style={styles.pinEmoji}>{tool.emoji}</Text>
                  )}
                </View>
                {/* Triangle tip */}
                <View style={[styles.pinTip, { borderTopColor: catColor }]} />
                {/* Unavailable dot */}
                {!tool.available ? <View style={styles.pinUnavailableDot} /> : null}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* "You" legend */}
      <View style={styles.mapLegend}>
        <View style={styles.mapLegendUserRow}>
          <View style={styles.mapLegendUserDot} />
          <Text style={styles.mapLegendUserText}>You</Text>
        </View>
      </View>

      {/* Category color legend */}
      <View style={styles.mapCatLegend}>
        <View style={styles.mapCatLegendContent}>
          {Object.entries(CATEGORY_COLORS)
            .filter(([cat]) => cat !== 'All')
            .map(([cat, color]) => (
              <View key={cat} style={styles.mapCatItem}>
                <View style={[styles.mapCatDot, { backgroundColor: color }]} />
                <Text style={styles.mapCatLabel}>{cat}</Text>
              </View>
            ))}
        </View>
      </View>

      {/* Results badge */}
      <View style={styles.mapResultsBadge}>
        <Ionicons name="pin" size={12} color={Colors.primary} />
        <Text style={styles.mapResultsText}>
          {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''} nearby
        </Text>
      </View>

      {/* Selected tool bottom card */}
      {selectedObj ? (
        <Pressable
          style={styles.mapToolCard}
          onPress={() => selectedObj.available && onRequestBorrow(selectedObj)}
        >
          <View style={[styles.mapToolCardAccent, { backgroundColor: selectedObj.accentColor }]} />
          <View style={[styles.mapToolCardEmoji, { backgroundColor: selectedObj.color, overflow: 'hidden' }]}>
            {selectedObj.emoji && selectedObj.emoji.startsWith('http') ? (
              <Image source={{ uri: selectedObj.emoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Text style={styles.mapToolCardEmojiText}>{selectedObj.emoji}</Text>
            )}
          </View>
          <View style={styles.mapToolCardInfo}>
            <View style={styles.mapToolCardHeader}>
              <Text style={styles.mapToolCardName}>{selectedObj.name}</Text>
              {selectedObj.available ? (
                <View style={styles.mapToolCardAvailBadge}>
                  <Text style={styles.mapToolCardAvailText}>Available</Text>
                </View>
              ) : (
                <View style={styles.mapToolCardUnavailBadge}>
                  <Text style={styles.mapToolCardUnavailText}>Borrowed</Text>
                </View>
              )}
            </View>
            <Text style={styles.mapToolCardBrand}>{selectedObj.brand}</Text>
            <View style={styles.mapToolCardMeta}>
              <Image source={{ uri: selectedObj.ownerAvatar }} style={styles.mapToolCardAvatar} contentFit="cover" transition={100} />
              <Text style={styles.mapToolCardOwner}>{selectedObj.ownerName}</Text>
              <View style={styles.mapToolCardDistBadge}>
                <Ionicons name="location-sharp" size={10} color={selectedObj.accentColor} />
                <Text style={[styles.mapToolCardDist, { color: selectedObj.accentColor }]}>{selectedObj.distance}</Text>
              </View>
              <Text style={styles.mapToolCardRating}>★ {selectedObj.rating}</Text>
            </View>
          </View>
          {selectedObj.available ? (
            <View style={[styles.mapToolCardCta, { backgroundColor: selectedObj.accentColor }]}>
              <Text style={styles.mapToolCardCtaText}>Request</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: { flex: 1, position: 'relative' },

  userMarker: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,97,86,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
  },
  userMarkerInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  pinWrap: { alignItems: 'center' },
  distanceLabel: {
    borderRadius: 9999, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  distanceLabelText: { fontSize: 9, fontWeight: '800', color: Colors.white, letterSpacing: 0.3 },
  pinBody: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: Colors.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  pinBodySelected: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 3,
    ...Platform.select({
      ios: { shadowOpacity: 0.4, shadowRadius: 12 },
      android: { elevation: 10 },
    }),
  },
  pinEmoji: { fontSize: 18 },
  pinTip: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },
  pinUnavailableDot: {
    position: 'absolute', top: 22, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: Colors.white,
  },

  mapLegend: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: Colors.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  mapLegendUserRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapLegendUserDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: 'rgba(0,97,86,0.25)',
  },
  mapLegendUserText: { fontSize: 11, fontWeight: '700', color: Colors.dark },

  mapCatLegend: { position: 'absolute', bottom: 220, left: 0, right: 0 },
  mapCatLegendContent: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 8, alignItems: 'center', justifyContent: 'center',
  },
  mapCatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  mapCatDot: { width: 8, height: 8, borderRadius: 4 },
  mapCatLabel: { fontSize: 11, fontWeight: '700', color: Colors.dark },

  mapResultsBadge: {
    position: 'absolute', top: 16, left: 16,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 9999,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: Colors.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  mapResultsText: { fontSize: 12, fontWeight: '700', color: Colors.dark },

  mapToolCard: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: Colors.white, borderRadius: 24, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: Colors.dark, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 32 },
      android: { elevation: 12 },
    }),
  },
  mapToolCardAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
    borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
  },
  mapToolCardEmoji: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8,
  },
  mapToolCardEmojiText: { fontSize: 26 },
  mapToolCardInfo: { flex: 1, gap: 3 },
  mapToolCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapToolCardName: { fontSize: 16, fontWeight: '800', color: Colors.dark, letterSpacing: -0.4, flex: 1 },
  mapToolCardAvailBadge: { backgroundColor: 'rgba(73,123,9,0.15)', borderRadius: 9999, paddingHorizontal: 7, paddingVertical: 2 },
  mapToolCardAvailText: { fontSize: 9, fontWeight: '800', color: Colors.greenDeep, letterSpacing: 0.3 },
  mapToolCardUnavailBadge: { backgroundColor: Colors.inputBg, borderRadius: 9999, paddingHorizontal: 7, paddingVertical: 2 },
  mapToolCardUnavailText: { fontSize: 9, fontWeight: '800', color: Colors.muted, letterSpacing: 0.3 },
  mapToolCardBrand: { fontSize: 12, fontWeight: '500', color: Colors.muted },
  mapToolCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  mapToolCardAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.avatarBg },
  mapToolCardOwner: { fontSize: 11, fontWeight: '700', color: Colors.darkMid, flex: 1 },
  mapToolCardDistBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  mapToolCardDist: { fontSize: 11, fontWeight: '800' },
  mapToolCardRating: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },
  mapToolCardCta: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', flexShrink: 0 },
  mapToolCardCtaText: { fontSize: 13, fontWeight: '700', color: Colors.white, letterSpacing: -0.2 },
});
