// ============================================
// Flight Tracking Layer — OpenSky Network API
// Renders on Leaflet map
// ============================================
import L from 'leaflet';
import { EventBus } from '../utils/event-bus';
import { getLayerGroup } from '../map/map-engine';
import { TrajectoryStore } from '../engines/trajectory-store';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const REFRESH_INTERVAL = 15000;

export interface FlightState {
    icao24: string;
    callsign: string;
    originCountry: string;
    longitude: number | null;
    latitude: number | null;
    altitude: number | null;
    onGround: boolean;
    velocity: number | null;
    heading: number | null;
    verticalRate: number | null;
}

function parseFlightStates(data: any): FlightState[] {
    if (!data?.states) return [];
    return data.states
        .filter((s: any[]) => s[5] != null && s[6] != null)
        .map((s: any[]) => ({
            icao24: s[0],
            callsign: (s[1] || '').trim(),
            originCountry: s[2],
            longitude: s[5],
            latitude: s[6],
            altitude: s[7] || s[13] || 0,
            onGround: s[8],
            velocity: s[9],
            heading: s[10],
            verticalRate: s[11],
        }));
}

function getFlightColor(alt: number | null): string {
    if (!alt || alt < 100) return '#888888';
    if (alt < 3000) return '#69f0ae';
    if (alt < 8000) return '#40c4ff';
    if (alt < 12000) return '#7b61ff';
    return '#ff80ab';
}

async function fetchFlights(): Promise<FlightState[]> {
    try {
        const r = await fetch(OPENSKY_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return parseFlightStates(await r.json());
    } catch {
        return [];
    }
}

function renderFlights(flights: FlightState[]) {
    const group = getLayerGroup('flights');
    if (!group) return;
    group.clearLayers();

    // Sample for performance
    const sampled = flights.length > 3000
        ? flights.filter((_, i) => i % Math.ceil(flights.length / 3000) === 0)
        : flights;

    sampled.forEach(f => {
        if (!f.longitude || !f.latitude) return;
        const color = getFlightColor(f.altitude);
        const marker = L.circleMarker([f.latitude, f.longitude], {
            radius: f.onGround ? 2 : 3,
            fillColor: color,
            color: color,
            fillOpacity: 0.8,
            weight: 0,
        });

        marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;font-size:12px;">
        <strong style="color:#00d4ff">${f.callsign || f.icao24}</strong><br>
        🏳️ ${f.originCountry}<br>
        📏 ${f.altitude?.toFixed(0) || 0}m | ${f.velocity?.toFixed(0) || 0} m/s<br>
        🧭 ${f.heading?.toFixed(0) || 0}° | ${f.onGround ? '🔴 Ground' : '🟢 Airborne'}
      </div>
    `, { className: 'dark-popup' });

        group.addLayer(marker);

        // Record trajectory
        TrajectoryStore.addPoint(f.icao24 || f.callsign, 'flight', f.callsign || f.icao24, {
            lat: f.latitude, lon: f.longitude, alt: f.altitude || 0,
            timestamp: Date.now(), velocity: f.velocity || 0, heading: f.heading || 0,
        });
    });

    updateCount('flight-count', flights.length);
    updateCount('sig-flights', flights.length);
    EventBus.getInstance().emit('data:flights', { count: flights.length, flights });
}

function updateCount(id: string, val: number) {
    const el = document.getElementById(id);
    if (el) el.textContent = val.toLocaleString();
}

export async function initFlightLayer() {
    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        const g = getLayerGroup('flights');
        if (layer === 'flights' && g) {
            const map = (g as any)._map || (window as any).__gcMap;
            if (map) { visible ? g.addTo(map) : map.removeLayer(g); }
        }
    });

    const flights = await fetchFlights();
    renderFlights(flights);

    setInterval(async () => {
        renderFlights(await fetchFlights());
    }, REFRESH_INTERVAL);
}
