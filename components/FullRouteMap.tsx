import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  depLat: number;
  depLng: number;
  arrLat: number;
  arrLng: number;
  routeCoords: { latitude: number; longitude: number }[] | null;
  loading: boolean;
  hasCoords: boolean;
  midRegion?: any;
  departure?: string;
  arrival?: string;
}

export default function FullRouteMap({ depLat, depLng, arrLat, arrLng, routeCoords, hasCoords, departure, arrival }: Props) {
  const html = useMemo(() => {
    if (!hasCoords && (!departure || !arrival)) {
      return '<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100%;margin:0;background:#f0f4f0;font-family:sans-serif;color:#999;font-size:13px;text-align:center;padding:16px;">No route data available</body></html>';
    }

    if (!hasCoords && departure && arrival) {
      return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}
.leaflet-control-attribution{display:none!important;}
#loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;background:rgba(255,255,255,0.95);padding:12px 20px;border-radius:10px;font-family:sans-serif;font-size:13px;color:#666;box-shadow:0 2px 8px rgba(0,0,0,0.1);}</style>
</head>
<body>
<div id="map"></div>
<div id="loading">Loading route...</div>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([12.97,77.59],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
var depIcon = L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:14px;background:#006156;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span style="color:#fff;font-weight:800;font-size:13px;">A</span></div>',iconSize:[28,28],iconAnchor:[14,28]});
var arrIcon = L.divIcon({className:'',html:'<div style="width:28px;height:28px;border-radius:14px;background:#7FC5FD;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span style="color:#fff;font-weight:800;font-size:13px;">B</span></div>',iconSize:[28,28],iconAnchor:[14,28]});
function geocode(q){
  return fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(q)+'&format=json&limit=1')
    .then(function(r){return r.json();})
    .then(function(d){return d&&d.length?{lat:parseFloat(d[0].lat),lng:parseFloat(d[0].lon)}:null;});
}
Promise.all([geocode('${departure.replace(/'/g, "\\'")}'),geocode('${arrival.replace(/'/g, "\\'")}')]).then(function(results){
  var dep=results[0],arr=results[1];
  document.getElementById('loading').style.display='none';
  if(!dep||!arr){document.getElementById('loading').textContent='Could not find locations';document.getElementById('loading').style.display='block';return;}
  L.marker([dep.lat,dep.lng],{icon:depIcon}).addTo(map);
  L.marker([arr.lat,arr.lng],{icon:arrIcon}).addTo(map);
  var route=L.polyline([[dep.lat,dep.lng],[arr.lat,arr.lng]],{color:'#006156',weight:4,opacity:0.85}).addTo(map);
  map.fitBounds(route.getBounds().pad(0.15));
}).catch(function(){
  document.getElementById('loading').textContent='Could not load route';
});
</script>
</body>
</html>`;
    }

    const routeLine = routeCoords
      ? routeCoords.map((c) => `[${c.latitude},${c.longitude}]`).join(',')
      : `[${depLat},${depLng}],[${arrLat},${arrLng}]`;

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%;}
.leaflet-control-attribution{display:none!important;}</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false,attributionControl:false}).setView([${(depLat+arrLat)/2},${(depLng+arrLng)/2}],13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'&copy; OpenStreetMap'
}).addTo(map);

var route = L.polyline(${routeLine},{color:'#006156',weight:4,opacity:0.85}).addTo(map);

var depIcon = L.divIcon({
  className:'',
  html:'<div style="width:28px;height:28px;border-radius:14px;background:#006156;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span style="color:#fff;font-weight:800;font-size:13px;">A</span></div>',
  iconSize:[28,28],
  iconAnchor:[14,28]
});
var arrIcon = L.divIcon({
  className:'',
  html:'<div style="width:28px;height:28px;border-radius:14px;background:#7FC5FD;border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);"><span style="color:#fff;font-weight:800;font-size:13px;">B</span></div>',
  iconSize:[28,28],
  iconAnchor:[14,28]
});

L.marker([${depLat},${depLng}],{icon:depIcon}).addTo(map);
L.marker([${arrLat},${arrLng}],{icon:arrIcon}).addTo(map);

map.fitBounds(route.getBounds().pad(0.15));
</script>
</body>
</html>`;
  }, [depLat, depLng, arrLat, arrLng, routeCoords, hasCoords, departure, arrival]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        style={StyleSheet.absoluteFill}
        source={{ html }}
        scrollEnabled={false}
      />
    </View>
  );
}
