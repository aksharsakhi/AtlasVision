// ============================================
// Flight Tracking Layer — OpenSky Network API
// Real data, no mock! Free, no API key needed.
// https://opensky-network.org/apidoc/rest.html
// ============================================
import * as Cesium from 'cesium';
import { EventBus } from '../../utils/event-bus';

const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const REFRESH_INTERVAL = 15000; // 15 seconds (OpenSky rate limit for anonymous)

let flightEntities: Cesium.Entity[] = [];
let isVisible = true;
let viewer: Cesium.Viewer;

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
    if (!data || !data.states) return [];

    return data.states
        .filter((s: any[]) => s[5] != null && s[6] != null) // must have coordinates
        .map((s: any[]) => ({
            icao24: s[0],
            callsign: (s[1] || '').trim(),
            originCountry: s[2],
            longitude: s[5],
            latitude: s[6],
            altitude: s[7] || s[13] || 0, // baro alt or geo alt
            onGround: s[8],
            velocity: s[9],
            heading: s[10],
            verticalRate: s[11],
        }));
}

function getFlightColor(altitude: number | null): Cesium.Color {
    if (!altitude || altitude < 100) return Cesium.Color.fromCssColorString('#888888'); // on ground
    if (altitude < 3000) return Cesium.Color.fromCssColorString('#69f0ae');
    if (altitude < 8000) return Cesium.Color.fromCssColorString('#40c4ff');
    if (altitude < 12000) return Cesium.Color.fromCssColorString('#7b61ff');
    return Cesium.Color.fromCssColorString('#ff80ab');
}

async function fetchFlights(): Promise<FlightState[]> {
    try {
        const response = await fetch(OPENSKY_URL);
        if (!response.ok) throw new Error(`OpenSky HTTP ${response.status}`);
        const data = await response.json();
        return parseFlightStates(data);
    } catch (err) {
        console.warn('OpenSky fetch failed, retrying next cycle:', err);
        return [];
    }
}

function renderFlights(flights: FlightState[]) {
    // Remove old entities
    flightEntities.forEach(e => viewer.entities.remove(e));
    flightEntities = [];

    if (!isVisible) return;

    // Sample flights to prevent overwhelming (show up to 3000)
    const sampled = flights.length > 3000
        ? flights.filter((_, i) => i % Math.ceil(flights.length / 3000) === 0)
        : flights;

    sampled.forEach(flight => {
        if (!flight.longitude || !flight.latitude) return;

        const entity = viewer.entities.add({
            name: flight.callsign || flight.icao24,
            position: Cesium.Cartesian3.fromDegrees(
                flight.longitude,
                flight.latitude,
                (flight.altitude || 0) * 1 // meters
            ),
            point: {
                pixelSize: flight.onGround ? 3 : 4,
                color: getFlightColor(flight.altitude),
                outlineColor: Cesium.Color.WHITE.withAlpha(0.3),
                outlineWidth: 1,
                scaleByDistance: new Cesium.NearFarScalar(1e5, 1.5, 1e7, 0.5),
            },
            properties: {
                type: 'flight',
                callsign: flight.callsign,
                origin: flight.originCountry,
                altitude: flight.altitude?.toFixed(0),
                velocity: flight.velocity?.toFixed(1),
                heading: flight.heading,
                onGround: flight.onGround,
            } as any,
        });

        flightEntities.push(entity);
    });

    // Update counters
    const count = flights.length;
    const el = document.getElementById('flight-count');
    if (el) el.textContent = count.toLocaleString();
    const sig = document.getElementById('sig-flights');
    if (sig) sig.textContent = count.toLocaleString();

    EventBus.getInstance().emit('data:flights', { count, flights });
}

export async function initFlightLayer(v: Cesium.Viewer) {
    viewer = v;

    // Listen for layer toggles
    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        if (layer === 'flights') {
            isVisible = visible;
            flightEntities.forEach(e => {
                e.show = visible;
            });
        }
    });

    // Initial fetch
    const flights = await fetchFlights();
    renderFlights(flights);

    // Auto-refresh
    setInterval(async () => {
        const flights = await fetchFlights();
        renderFlights(flights);
    }, REFRESH_INTERVAL);
}
