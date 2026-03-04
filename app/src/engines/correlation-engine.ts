// ============================================
// Multi-Layer Correlation Engine
// Correlates satellite + ship + aircraft + news + earthquake signals
// Generates combined anomaly confidence score (0–100)
// ============================================
import { EventBus } from '../utils/event-bus';
import { TrajectoryStore, type TrackedEntity } from './trajectory-store';
import { INDIA_ZONES, isInIndiaZone, type IndiaZoneHit } from './india-strategic';

export interface CorrelatedAnomaly {
    id: string;
    timestamp: number;
    location: { lat: number; lon: number };
    riskScore: number;       // 0–100
    confidenceScore: number; // 0–100
    riskCategory: 'Low' | 'Medium' | 'High' | 'Critical';
    justification: string;
    signalSources: string[];
    entities: { type: string; id: string; name: string }[];
    indiaZone: string | null;
    eventType: string;
}

interface SignalSnapshot {
    flights: any[];
    satellites: any[];
    earthquakes: any[];
    news: any[];
    ships: any[];
}

const signals: SignalSnapshot = {
    flights: [],
    satellites: [],
    earthquakes: [],
    news: [],
    ships: [],
};

let anomalies: CorrelatedAnomaly[] = [];

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Check for spatial clustering of multi-domain signals
function correlateSignals(): CorrelatedAnomaly[] {
    const detected: CorrelatedAnomaly[] = [];
    const CORRELATION_RADIUS_KM = 500;

    // Build spatial index of all geolocated events
    interface GeoEvent {
        type: string;
        lat: number;
        lon: number;
        id: string;
        name: string;
        severity: number; // 0-100
        raw: any;
    }

    const allEvents: GeoEvent[] = [];

    // Flights
    signals.flights.forEach((f: any) => {
        if (f.latitude && f.longitude) {
            // Military callsign patterns
            const isMilitary = /^(RCH|DUKE|EVAC|JAKE|NATO|FORTE|HOMER|LAGR|VIPER|COBRA)/i.test(f.callsign || '');
            allEvents.push({
                type: 'flight',
                lat: f.latitude,
                lon: f.longitude,
                id: f.icao24 || f.callsign,
                name: f.callsign || f.icao24,
                severity: isMilitary ? 70 : 10,
                raw: f,
            });
        }
    });

    // Earthquakes (already major events)
    signals.earthquakes.forEach((q: any) => {
        allEvents.push({
            type: 'earthquake',
            lat: q.lat || q.latitude,
            lon: q.lon || q.longitude,
            id: q.id,
            name: `M${q.magnitude} ${q.place}`,
            severity: Math.min(100, (q.magnitude - 3) * 20),
            raw: q,
        });
    });

    // Ships (AIS)
    signals.ships.forEach((s: any) => {
        if (s.lat && s.lon) {
            const isNaval = /^(WARSHIP|HMS|INS|USS|FFG|DDG)/i.test(s.name || '');
            allEvents.push({
                type: 'ship',
                lat: s.lat,
                lon: s.lon,
                id: s.mmsi || s.id,
                name: s.name || s.mmsi,
                severity: isNaval ? 65 : 10,
                raw: s,
            });
        }
    });

    // News with geo-location
    signals.news.forEach((n: any) => {
        if (n.inferredLat && n.inferredLon) {
            const sevMap: Record<string, number> = { critical: 90, high: 70, medium: 40, low: 15, info: 5 };
            allEvents.push({
                type: 'news',
                lat: n.inferredLat,
                lon: n.inferredLon,
                id: n.link || n.title,
                name: n.title,
                severity: sevMap[n.severity] || 5,
                raw: n,
            });
        }
    });

    // Grid-based clustering: divide events into cells for O(n) correlation
    const cellSize = 5; // degrees
    const grid: Map<string, GeoEvent[]> = new Map();

    allEvents.forEach(evt => {
        const key = `${Math.floor(evt.lat / cellSize)},${Math.floor(evt.lon / cellSize)}`;
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(evt);
    });

    // Look for multi-type clusters in each cell + adjacent cells
    grid.forEach((events, key) => {
        const [cy, cx] = key.split(',').map(Number);
        const neighborhood: GeoEvent[] = [...events];

        // Add adjacent cells
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dy === 0 && dx === 0) continue;
                const nkey = `${cy + dy},${cx + dx}`;
                if (grid.has(nkey)) neighborhood.push(...grid.get(nkey)!);
            }
        }

        // Check for multi-domain presence
        const typeSet = new Set(neighborhood.map(e => e.type));
        if (typeSet.size < 2) return; // Need at least 2 signal types

        // Calculate centroid
        const centLat = neighborhood.reduce((s, e) => s + e.lat, 0) / neighborhood.length;
        const centLon = neighborhood.reduce((s, e) => s + e.lon, 0) / neighborhood.length;

        // Filter to events within correlation radius of centroid
        const correlated = neighborhood.filter(e =>
            haversine(centLat, centLon, e.lat, e.lon) < CORRELATION_RADIUS_KM
        );

        const correlatedTypes = new Set(correlated.map(e => e.type));
        if (correlatedTypes.size < 2) return;

        // Compute risk & confidence scores
        const maxSeverity = Math.max(...correlated.map(e => e.severity));
        const avgSeverity = correlated.reduce((s, e) => s + e.severity, 0) / correlated.length;
        const typeBonus = (correlatedTypes.size - 1) * 15; // more signal types = higher confidence

        const riskScore = Math.min(100, Math.round(maxSeverity * 0.5 + avgSeverity * 0.3 + typeBonus));
        const confidenceScore = Math.min(100, Math.round(
            correlatedTypes.size * 20 + correlated.length * 3 + (maxSeverity > 50 ? 15 : 0)
        ));

        const riskCategory = riskScore >= 80 ? 'Critical' :
            riskScore >= 60 ? 'High' :
                riskScore >= 35 ? 'Medium' : 'Low';

        // Build justification from real data
        const justParts: string[] = [];
        correlatedTypes.forEach(t => {
            const count = correlated.filter(e => e.type === t).length;
            justParts.push(`${count} ${t}(s)`);
        });

        // India zone check
        const indiaHit = isInIndiaZone(centLat, centLon);

        const anomaly: CorrelatedAnomaly = {
            id: `COR-${Date.now()}-${key}`,
            timestamp: Date.now(),
            location: { lat: centLat, lon: centLon },
            riskScore,
            confidenceScore,
            riskCategory,
            justification: `Multi-signal correlation detected: ${justParts.join(', ')} within ${CORRELATION_RADIUS_KM}km radius. ` +
                `${correlatedTypes.size} signal domains confirm activity.` +
                (indiaHit ? ` INDIA STRATEGIC: ${indiaHit.zone} zone alert.` : ''),
            signalSources: Array.from(correlatedTypes),
            entities: correlated.map(e => ({ type: e.type, id: e.id, name: e.name })),
            indiaZone: indiaHit?.zone || null,
            eventType: correlatedTypes.has('earthquake') ? 'natural_disaster' :
                maxSeverity > 60 ? 'military_activity' : 'activity_cluster',
        };

        detected.push(anomaly);
    });

    // Deduplicate by proximity
    const unique: CorrelatedAnomaly[] = [];
    detected.sort((a, b) => b.riskScore - a.riskScore);
    detected.forEach(a => {
        const tooClose = unique.some(u =>
            haversine(u.location.lat, u.location.lon, a.location.lat, a.location.lon) < 200
        );
        if (!tooClose) unique.push(a);
    });

    return unique.slice(0, 50); // Top 50 anomalies
}

export function getAnomalies(): CorrelatedAnomaly[] {
    return anomalies;
}

export function initCorrelationEngine() {
    const bus = EventBus.getInstance();

    bus.on('data:flights', (data: any) => {
        signals.flights = data.flights || [];
        runCorrelation();
    });

    bus.on('data:satellites', (data: any) => {
        signals.satellites = data.satellites || [];
    });

    bus.on('data:earthquakes', (data: any) => {
        signals.earthquakes = data.quakes || [];
        runCorrelation();
    });

    bus.on('data:news', (data: any) => {
        signals.news = data.news || [];
        runCorrelation();
    });

    bus.on('data:ships', (data: any) => {
        signals.ships = data.ships || [];
        runCorrelation();
    });

    // Run correlation every 30s
    setInterval(runCorrelation, 30000);
}

function runCorrelation() {
    anomalies = correlateSignals();
    EventBus.getInstance().emit('correlation:update', anomalies);
}
