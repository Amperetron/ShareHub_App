import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../constants/theme';

interface Props {
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  departureLat?: number | null;
  departureLng?: number | null;
  arrivalLat?: number | null;
  arrivalLng?: number | null;
}

export default function RideMapView({ departure, arrival, departureTime, arrivalTime, departureLat, departureLng, arrivalLat, arrivalLng }: Props) {
  const hasCoords = departureLat && departureLng && arrivalLat && arrivalLng;

  const html = useMemo(() => {
    if (!hasCoords) {
      return `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100%;margin:0;background:#f0f4f0;font-family:sans-serif;color:#999;font-size:13px;">Map data unavailable</body></html>`;
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${(departureLat!+arrivalLat!)/2},${(departureLng!+arrivalLng!)/2}],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var route = L.polyline([[${departureLat},${departureLng}],[${arrivalLat},${arrivalLng}]],{color:'#006156',weight:4,opacity:0.85}).addTo(map);
var depIcon = L.divIcon({className:'',html:'<div style="width:24px;height:24px;border-radius:12px;background:#006156;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);"><span style="color:#fff;font-weight:800;font-size:11px;">A</span></div>',iconSize:[24,24],iconAnchor:[12,24]});
var arrIcon = L.divIcon({className:'',html:'<div style="width:24px;height:24px;border-radius:12px;background:#7FC5FD;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.3);"><span style="color:#fff;font-weight:800;font-size:11px;">B</span></div>',iconSize:[24,24],iconAnchor:[12,24]});
L.marker([${departureLat},${departureLng}],{icon:depIcon}).addTo(map);
L.marker([${arrivalLat},${arrivalLng}],{icon:arrIcon}).addTo(map);
map.fitBounds(route.getBounds().pad(0.15));
</script>
</body>
</html>`;
  }, [departureLat, departureLng, arrivalLat, arrivalLng, hasCoords]);

  return (
    <View style={styles.container}>
      <View style={styles.noticeRow}>
        <Text style={styles.noticeIcon}>🗺️</Text>
        <Text style={styles.noticeText}>Route preview</Text>
      </View>

      <View style={styles.mapWrap}>
        <WebView source={{ html }} scrollEnabled={false} style={StyleSheet.absoluteFill} />
      </View>

      <View style={styles.timeline}>
        <View style={styles.stopRow}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={styles.connector} />
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName} numberOfLines={1}>{departure}</Text>
            <View style={[styles.timePill, { backgroundColor: 'rgba(0,97,86,0.1)' }]}>
              <Text style={[styles.timeText, { color: Colors.primary }]}>{departureTime}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.stopRow, { marginBottom: 0 }]}>
          <View style={styles.dotCol}>
            <View style={[styles.dot, { backgroundColor: Colors.blueMid }]} />
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName} numberOfLines={1}>{arrival}</Text>
            <View style={[styles.timePill, { backgroundColor: 'rgba(127,197,253,0.2)' }]}>
              <Text style={[styles.timeText, { color: Colors.blueMid }]}>{arrivalTime}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,97,86,0.07)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noticeIcon: { fontSize: 14 },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    flex: 1,
  },
  mapWrap: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  timeline: { gap: 0 },
  stopRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 0,
  },
  dotCol: {
    width: 12,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 4,
    minHeight: 28,
  },
  stopInfo: {
    flex: 1,
    paddingBottom: 20,
    gap: 6,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark,
    lineHeight: 22,
  },
  timePill: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
