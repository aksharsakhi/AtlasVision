// ============================================
// Earthquake Layer — USGS (Leaflet version)
// ============================================
import L from 'leaflet';
import { EventBus } from '../utils/event-bus';
import { getLayerGroup } from '../map/map-engine';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';

function getMagColor(mag: number): string {
    if (mag >= 7) return '#ff1744';
    if (mag >= 6) return '#ff5252';
    if (mag >= 5) return '#ff9800';
    return '#ffeb3b';
}

async function fetchQuakes() {
    try {
        const r = await fetch(USGS_URL);
        if (!r.ok) return [];
        const data = await r.json();
        return (data.features || []).map((f: any) => ({
            id: f.id,
            magnitude: f.properties.mag,
            place: f.properties.place,
            time: f.properties.time,
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            depth: f.geometry.coordinates[2],
        }));
    } catch { return []; }
}

function render(quakes: any[]) {
    const group = getLayerGroup('earthquakes');
    if (!group) return;
    group.clearLayers();

    quakes.forEach(q => {
        const color = getMagColor(q.magnitude);
        const size = Math.max(5, q.magnitude * 3);
        const marker = L.circleMarker([q.lat, q.lon], {
            radius: size,
            fillColor: color,
            color: color,
            fillOpacity: 0.6,
            weight: 2,
        });
        marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;font-size:12px;">
        <strong style="color:${color}">M${q.magnitude.toFixed(1)}</strong><br>
        📍 ${q.place}<br>
        📏 Depth: ${q.depth.toFixed(0)} km<br>
        🕐 ${new Date(q.time).toUTCString()}
      </div>
    `, { className: 'dark-popup' });
        group.addLayer(marker);
    });

    const el = document.getElementById('earthquake-count');
    if (el) el.textContent = quakes.length.toString();
    const sig = document.getElementById('sig-earthquakes');
    if (sig) sig.textContent = quakes.length.toString();

    EventBus.getInstance().emit('data:earthquakes', { count: quakes.length, quakes });
}

export async function initEarthquakeLayer() {
    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        const g = getLayerGroup('earthquakes');
        if (layer === 'earthquakes' && g) {
            const map = (window as any).__gcMap;
            if (map) { visible ? g.addTo(map) : map.removeLayer(g); }
        }
    });

    render(await fetchQuakes());
    setInterval(async () => render(await fetchQuakes()), 300000);
}
