import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ToolMapView from '../components/ToolMapView';
import { Colors } from '../constants/theme';
import { fetchTools, type ToolItem } from '../lib/api';

// ─── Data ──────────────────────────────────────────────────────────────────

const CATEGORY_EMOJIS: Record<string, string> = {
  'Power Tools': '🔧',
  'Garden': '🌿',
  'Kitchen': '🍚',
  'Cleaning': '💧',
  'Ladders': '🪜',
  'Sport': '🏸',
};

type ViewMode = 'list' | 'map';

export default function ToolShareScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedMapTool, setSelectedMapTool] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchTools()
      .then((rows) => {
        if (mounted) setTools(rows);
      })
      .catch((error) => {
        Alert.alert('Could not load items', JSON.stringify(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(tools.map((tool) => tool.category).filter(Boolean)));
    return ['All', ...dynamic];
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAvailability = showAvailableOnly ? tool.available : true;
      return matchesCategory && matchesSearch && matchesAvailability;
    });
  }, [tools, selectedCategory, searchQuery, showAvailableOnly]);

  const availableCount = tools.filter((t) => t.available).length;

  function handleRequestBorrow(tool: ToolItem) {
    router.push({
      pathname: '/tool-request',
      params: {
        toolId: tool.id,
        ownerId: tool.ownerId,
        toolName: tool.name,
        toolBrand: tool.brand,
        toolEmoji: tool.emoji,
        toolColor: tool.color,
        toolAccentColor: tool.accentColor,
        toolCondition: tool.condition,
        toolDescription: tool.description,
        ownerName: tool.ownerName,
        ownerAvatar: tool.ownerAvatar,
        ownerRating: String(tool.rating),
        ownerLends: String(tool.lends),
        distance: tool.distance,
      },
    });
  }

  const renderToolCard = ({ item: tool }: { item: ToolItem }) => (
    <Pressable
      style={({ pressed }) => [
        styles.toolCard,
        pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
        !tool.available && styles.toolCardUnavailable,
      ]}
      onPress={() => tool.available && handleRequestBorrow(tool)}
    >
      {/* Tool Emoji Badge */}
      <View style={[styles.toolEmojiWrap, { backgroundColor: tool.color }]}>
        {tool.emoji && tool.emoji.startsWith('http') ? (
          <Image source={{ uri: tool.emoji }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Text style={styles.toolEmoji}>{tool.emoji || '🔧'}</Text>
        )}
        {!tool.available ? (
          <View style={styles.unavailablePill}>
            <Text style={styles.unavailablePillText}>Borrowed</Text>
          </View>
        ) : null}
      </View>

      {/* Tool Info */}
      <View style={styles.toolInfo}>
        <Text style={styles.toolName} numberOfLines={1}>{tool.name}</Text>
        <Text style={styles.toolBrand} numberOfLines={1}>{tool.brand}</Text>
      </View>

      {/* Owner Row */}
      <View style={styles.ownerRow}>
        <Image
          source={{ uri: tool.ownerAvatar }}
          style={styles.ownerAvatar}
          contentFit="cover"
          transition={150}
        />
        <View style={styles.ownerDetails}>
          <Text style={styles.ownerName} numberOfLines={1}>{tool.ownerName}</Text>
          <Text style={styles.toolDistance}>{tool.distance}</Text>
        </View>
      </View>

      {/* Rating + Borrow count */}
      <View style={styles.toolMeta}>
        <View style={styles.ratingRow}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.ratingText}>{tool.rating}</Text>
        </View>
        <View style={styles.lendsBadge}>
          <Text style={styles.lendsText}>{tool.lends}× lent</Text>
        </View>
      </View>

      {/* CTA */}
      {tool.available ? (
        <View style={[styles.borrowBtn, { backgroundColor: tool.accentColor }]}>
          <Text style={styles.borrowBtnText}>Request</Text>
        </View>
      ) : (
        <View style={styles.borrowBtnDisabled}>
          <Text style={styles.borrowBtnDisabledText}>Unavailable</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nabourly</Text>
          <View style={styles.headerAvailablePill}>
            <Text style={styles.headerAvailableText}>{availableCount} available</Text>
          </View>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggleGroup}>
          <Pressable
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('list')}
            hitSlop={4}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? Colors.white : Colors.muted}
            />
          </Pressable>
          <Pressable
            style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
            onPress={() => { setViewMode('map'); setSelectedMapTool(null); }}
            hitSlop={4}
          >
            <Ionicons
              name="map"
              size={18}
              color={viewMode === 'map' ? Colors.white : Colors.muted}
            />
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIconText}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search items, brands, owners..."
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <View style={styles.clearIcon}>
                <Text style={styles.clearIconText}>✕</Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBarContent}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              {CATEGORY_EMOJIS[cat] ? (
                <Text style={styles.categoryChipEmoji}>{CATEGORY_EMOJIS[cat]}</Text>
              ) : null}
              <Text style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* ─── MAP VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'map' ? (
        <ToolMapView
          filteredTools={filteredTools}
          selectedMapTool={selectedMapTool}
          setSelectedMapTool={setSelectedMapTool}
          onRequestBorrow={handleRequestBorrow}
        />
      ) : (
        /* ─── LIST VIEW ──────────────────────────────────────────────────── */
        <>
          {/* Eco Banner */}
          <View style={styles.ecoBannerWrap}>
            <LinearGradient
              colors={['#064e3b', '#366000']}
              style={styles.ecoBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ecoBannerEmoji}>🌿</Text>
              <Text style={styles.ecoBannerText}>
                {'Every shared item = one less product manufactured'}
              </Text>
            </LinearGradient>
          </View>

          {/* Results Label */}
          <View style={styles.resultsLabelWrap}>
            <Text style={styles.resultsLabel}>
                {loading ? 'Loading items...' : `${filteredTools.length} item${filteredTools.length !== 1 ? 's' : ''} nearby`}
              {selectedCategory !== 'All' ? ` · ${selectedCategory}` : ''}
            </Text>
            <Pressable
              style={[styles.filterToggle, showAvailableOnly && styles.filterToggleActive]}
              onPress={() => setShowAvailableOnly((v) => !v)}
            >
              <Text style={[styles.filterToggleText, showAvailableOnly && styles.filterToggleTextActive]}>
                Available only
              </Text>
            </Pressable>
          </View>

          {/* Grid */}
          <FlatList
            data={filteredTools}
            keyExtractor={(item) => item.id}
            renderItem={renderToolCard}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>{loading ? 'Loading items' : 'No items found'}</Text>
                <Text style={styles.emptySubtitle}>
                  {loading ? 'Fetching items from Supabase' : 'Try a different category or search term'}
                </Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: 'rgba(246,250,247,0.97)',
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 20,
    color: Colors.dark,
    fontWeight: '600',
    marginTop: -1,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.dark,
    letterSpacing: -0.5,
  },
  headerAvailablePill: {
    backgroundColor: 'rgba(73,123,9,0.15)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerAvailableText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenDeep,
    letterSpacing: 0.3,
  },

  // ─── View Toggle ──────────────────────────────────────────────────────────
  viewToggleGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewToggleBtnActive: {
    backgroundColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },

  // ─── Search ───────────────────────────────────────────────────────────────
  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  searchIconText: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: Colors.dark,
    padding: 0,
    includeFontPadding: false,
  },
  clearIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIconText: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: '700',
  },

  // ─── Category Bar ─────────────────────────────────────────────────────────
  categoryBarWrap: {
    minHeight: 52,
    paddingVertical: 8,
  },
  categoryBarContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryChip: {
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  categoryChipActive: {
    backgroundColor: Colors.greenAccent,
    borderColor: Colors.greenAccent,
  },
  categoryChipEmoji: {
    fontSize: 12,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },

  // ─── Eco Banner ───────────────────────────────────────────────────────────
  ecoBannerWrap: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  ecoBanner: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ecoBannerEmoji: {
    fontSize: 16,
  },
  ecoBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenLight,
    lineHeight: 17,
  },

  // ─── Results Label ────────────────────────────────────────────────────────
  resultsLabelWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  filterToggle: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterToggleActive: {
    borderColor: Colors.greenAccent,
    backgroundColor: 'rgba(73,123,9,0.1)',
  },
  filterToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
  },
  filterToggleTextActive: {
    color: Colors.greenDeep,
  },

  // ─── Grid ─────────────────────────────────────────────────────────────────
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },

  // ─── Tool Card ────────────────────────────────────────────────────────────
  toolCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.dark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.07,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
    }),
  },
  toolCardUnavailable: {
    opacity: 0.72,
  },
  toolEmojiWrap: {
    height: 80,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  toolEmoji: {
    fontSize: 36,
  },
  unavailablePill: {
    position: 'absolute',
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unavailablePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  toolInfo: {
    gap: 2,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.dark,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  toolBrand: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    lineHeight: 15,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ownerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.avatarBg,
  },
  ownerDetails: {
    flex: 1,
    gap: 0,
  },
  ownerName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 15,
  },
  toolDistance: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.muted,
    lineHeight: 14,
  },
  toolMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starIcon: {
    fontSize: 11,
    color: '#f59e0b',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.dark,
  },
  lendsBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lendsText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  borrowBtn: {
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  borrowBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  borrowBtnDisabled: {
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
  },
  borrowBtnDisabledText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.muted,
  },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

});

