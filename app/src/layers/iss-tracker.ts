// ============================================
// ISS Tracker — real-time ISS position on the map
// Uses open-notify.org API (free)
// ============================================
import L from 'leaflet';
import { getMap } from '../map/map-engine';

let issMarker: L.Marker | null = null;
let issTrail: L.Polyline | null = null;
const trailPoints: [number, number][] = [];

const ISS_ICON = L.divIcon({
    html: `<div style="font-size:22px;filter:drop-shadow(0 0 6px rgba(0,212,255,0.6));">🛸</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: 'iss-icon',
});

async function fetchISSPosition(): Promise<{ lat: number; lon: number } | null> {
    try {
        const r = await fetch('http://api.open-notify.org/iss-now.json');
        if (!r.ok) return null;
        const data = await r.json();
        return {
            lat: parseFloat(data.iss_position.latitude),
            lon: parseFloat(data.iss_position.longitude),
        };
    } catch {
        return null;
    }
}

async function updateISS() {
    const pos = await fetchISSPosition();
    if (!pos) return;

    const map = getMap();
    if (!map) return;

    trailPoints.push([pos.lat, pos.lon]);
    if (trailPoints.length > 100) trailPoints.shift();

    if (!issMarker) {
        issMarker = L.marker([pos.lat, pos.lon], { icon: ISS_ICON, zIndexOffset: 1000 }).addTo(map);
        issMarker.bindPopup(`
      <div style="font-family:Inter,sans-serif;font-size:12px;">
        <strong style="color:#00d4ff">🛸 International Space Station</strong><br>
        Alt: ~408 km | Speed: ~27,600 km/h<br>
        Lat: ${pos.lat.toFixed(2)}° | Lon: ${pos.lon.toFixed(2)}°
      </div>
    `, { className: 'dark-popup' });
    } else {
        issMarker.setLatLng([pos.lat, pos.lon]);
        issMarker.getPopup()?.setContent(`
      <div style="font-family:Inter,sans-serif;font-size:12px;">
        <strong style="color:#00d4ff">🛸 International Space Station</strong><br>
        Alt: ~408 km | Speed: ~27,600 km/h<br>
        Lat: ${pos.lat.toFixed(2)}° | Lon: ${pos.lon.toFixed(2)}°
      </div>
    `);
    }

    // Trail
    if (issTrail) map.removeLayer(issTrail);

    // Split trail at antimeridian
    const segments: [number, number][][] = [[]];
    trailPoints.forEach((p, i) => {
        if (i > 0 && Math.abs(p[1] - trailPoints[i - 1][1]) > 180) {
            segments.push([]);
        }
        segments[segments.length - 1].push(p);
    });

    segments.forEach(seg => {
        if (seg.length < 2) return;
        L.polyline(seg, { color: '#00d4ff', weight: 1.5, opacity: 0.5, dashArray: '4,4' }).addTo(map);
    });

    // Update count display
    const el = document.getElementById('iss-lat-lon');
    if (el) el.textContent = `${pos.lat.toFixed(1)}°, ${pos.lon.toFixed(1)}°`;
}

export async function initISSTracker() {
    await updateISS();
    setInterval(updateISS, 5000); // Update every 5 seconds
}
