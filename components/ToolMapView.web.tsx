import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Colors } from '../constants/theme';

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

// Web fallback: a styled list sorted by distance with a map-style card UI
export default function ToolMapView({ filteredTools, selectedMapTool, setSelectedMapTool, onRequestBorrow }: Props) {
  const sorted = [...filteredTools].sort((a, b) => a.distanceNum - b.distanceNum);

  return (
    <View style={styles.container}>
      {/* Header notice */}
      <View style={styles.notice}>
        <Text style={styles.noticeIcon}>📍</Text>
        <Text style={styles.noticeText}>Map view is available on the mobile app · Showing tools sorted by distance</Text>
      </View>

      {/* Distance-sorted list */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {sorted.map((tool) => {
          const isSelected = selectedMapTool === tool.id;
          return (
            <Pressable
              key={tool.id}
              style={[styles.row, isSelected && styles.rowSelected, { borderLeftColor: tool.accentColor }]}
              onPress={() => {
                setSelectedMapTool(isSelected ? null : tool.id);
                if (tool.available) onRequestBorrow(tool);
              }}
            >
              <View style={[styles.emojiWrap, { backgroundColor: tool.color, overflow: 'hidden' }]}>
                {tool.emoji && tool.emoji.startsWith('http') ? (
                  <Image source={{ uri: tool.emoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                ) : (
                  <Text style={styles.emoji}>{tool.emoji}</Text>
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{tool.name}</Text>
                <Text style={styles.brand}>{tool.brand}</Text>
                <View style={styles.meta}>
                  <Image source={{ uri: tool.ownerAvatar }} style={styles.avatar} contentFit="cover" transition={100} />
                  <Text style={styles.owner}>{tool.ownerName}</Text>
                  <Text style={styles.rating}>★ {tool.rating}</Text>
                </View>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.distBadge, { backgroundColor: tool.accentColor }]}>
                  <Text style={styles.distText}>{tool.distance}</Text>
                </View>
                {tool.available ? (
                  <View style={styles.availBadge}>
                    <Text style={styles.availText}>Available</Text>
                  </View>
                ) : (
                  <View style={styles.borrowedBadge}>
                    <Text style={styles.borrowedText}>Borrowed</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,97,86,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  noticeIcon: { fontSize: 14 },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.primary, lineHeight: 17 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  rowSelected: {
    backgroundColor: '#f0fdf4',
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 24 },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: '800', color: Colors.dark, letterSpacing: -0.3 },
  brand: { fontSize: 11, fontWeight: '500', color: Colors.muted },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  avatar: { width: 18, height: 18, borderRadius: 9 },
  owner: { fontSize: 11, fontWeight: '700', color: Colors.darkMid, flex: 1 },
  rating: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },
  rightCol: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  distBadge: { borderRadius: 9999, paddingHorizontal: 9, paddingVertical: 4 },
  distText: { fontSize: 11, fontWeight: '800', color: Colors.white, letterSpacing: 0.2 },
  availBadge: { backgroundColor: 'rgba(73,123,9,0.12)', borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
  availText: { fontSize: 10, fontWeight: '700', color: Colors.greenDeep },
  borrowedBadge: { backgroundColor: Colors.inputBg, borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 3 },
  borrowedText: { fontSize: 10, fontWeight: '700', color: Colors.muted },
});
