import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { reverseGeocode, geocodeLocation } from '../lib/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  title: string;
}

export default function LocationPickerModal({ visible, onClose, onSelect, title }: Props) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [mode, setMode] = useState<'map' | 'search'>('map');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ lat: number; lng: number; displayName: string } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedCoords(null);
      setAddress(null);
      setQuery('');
      setSearchResult(null);
      setMode('map');
    }
  }, [visible]);

  const handleWebViewMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapClick') {
        const { lat, lng } = data;
        setSelectedCoords({ lat, lng });
        setLoading(true);
        try {
          const result = await reverseGeocode(lat, lng);
          setAddress(result || 'Unknown location');
        } catch {
          setAddress('Unknown location');
        } finally {
          setLoading(false);
        }
      }
    } catch {}
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const data = await geocodeLocation(query.trim());
      setSearchResult(data);
    } catch {
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConfirm = () => {
    if (mode === 'map' && selectedCoords && address) {
      onSelect({ lat: selectedCoords.lat, lng: selectedCoords.lng, address });
    } else if (mode === 'search' && searchResult) {
      onSelect({ lat: searchResult.lat, lng: searchResult.lng, address: searchResult.displayName });
    }
  };

  const canConfirm =
    (mode === 'map' && selectedCoords && !loading) ||
    (mode === 'search' && searchResult);

  const mapHtml = useMemo(() => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;}
.leaflet-control-attribution{display:none!important;}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false}).setView([12.9716,77.5946],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var marker = null;

map.on('click',function(e){
  var lat=e.latlng.lat,lng=e.latlng.lng;
  if(marker){map.removeLayer(marker);}
  marker=L.circleMarker([lat,lng],{radius:8,color:'#006156',fillColor:'#006156',fillOpacity:0.9,weight:2,borderColor:'#fff'}).addTo(map);
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'mapClick',lat:lat,lng:lng}));
});
</script>
</body>
</html>`, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.closeBtn} />
        </View>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, mode === 'map' && styles.tabActive]}
            onPress={() => setMode('map')}
          >
            <Text style={[styles.tabText, mode === 'map' && styles.tabTextActive]}>Map</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === 'search' && styles.tabActive]}
            onPress={() => setMode('search')}
          >
            <Text style={[styles.tabText, mode === 'search' && styles.tabTextActive]}>Search</Text>
          </Pressable>
        </View>

        {mode === 'map' ? (
          <View style={styles.mapContainer}>
            <WebView
              ref={webViewRef}
              style={styles.map}
              source={{ html: mapHtml }}
              onMessage={handleWebViewMessage}
              scrollEnabled={false}
            />
            {selectedCoords && (
              <View style={[styles.infoPanel, { bottom: 100 }]}>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Getting address...</Text>
                  </View>
                ) : (
                  <Text style={styles.addressText} numberOfLines={2}>
                    {address || 'Tap somewhere else'}
                  </Text>
                )}
              </View>
            )}
            <View style={styles.hintBar}>
              <Text style={styles.hint}>
                {selectedCoords ? 'Tap elsewhere to adjust' : 'Tap on the map to select'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.searchContainer}>
            <View style={styles.searchSection}>
              <Text style={styles.label}>Enter location name</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="e.g. Indiranagar, Bangalore"
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  placeholderTextColor={Colors.muted}
                />
                <Pressable
                  style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
                  onPress={handleSearch}
                  disabled={!query.trim() || searchLoading}
                >
                  {searchLoading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.searchBtnText}>Search</Text>
                  )}
                </Pressable>
              </View>
            </View>

            {searchResult && (
              <View style={styles.resultCard}>
                <View style={styles.resultDot} />
                <Text style={styles.resultText} numberOfLines={2}>
                  {searchResult.displayName}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            <Text style={styles.confirmText}>Confirm Location</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.dark,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  infoPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.muted,
  },
  addressText: {
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },
  hintBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hint: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
  },
  searchContainer: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.dark,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  searchBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.accentBg,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  resultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },
  footer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
