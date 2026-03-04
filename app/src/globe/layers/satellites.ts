// ============================================
// Satellite Tracking Layer — CelesTrak TLE Data
// Real data! Uses satellite.js (SGP4) for orbit propagation
// https://celestrak.org/NORAD/elements/
// ============================================
import * as Cesium from 'cesium';
import { EventBus } from '../../utils/event-bus';
import * as satellite from 'satellite.js';

const TLE_URLS = [
    { name: 'ISS', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle' },
    { name: 'Active Satellites', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle' },
];

let satEntities: Cesium.Entity[] = [];
let isVisible = true;
let viewer: Cesium.Viewer;
let satRecords: SatRecord[] = [];

interface SatRecord {
    name: string;
    satrec: satellite.SatRec;
    noradId: string;
}

function parseTLE(tleText: string): SatRecord[] {
    const lines = tleText.trim().split('\n');
    const records: SatRecord[] = [];

    for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i].trim();
        const line1 = lines[i + 1]?.trim();
        const line2 = lines[i + 2]?.trim();

        if (!line1 || !line2 || !line1.startsWith('1') || !line2.startsWith('2')) continue;

        try {
            const satrec = satellite.twoline2satrec(line1, line2);
            const noradId = line1.substring(2, 7).trim();
            records.push({ name, satrec, noradId });
        } catch (e) {
            // Skip invalid TLEs
        }
    }

    return records;
}

function getSatPosition(satrec: satellite.SatRec, date: Date): { lat: number; lon: number; alt: number } | null {
    try {
        const posVel = satellite.propagate(satrec, date);
        if (!posVel.position || typeof posVel.position === 'boolean') return null;

        const gmst = satellite.gstime(date);
        const geo = satellite.eciToGeodetic(posVel.position as satellite.EciVec3<number>, gmst);

        return {
            lat: satellite.degreesLat(geo.latitude),
            lon: satellite.degreesLong(geo.longitude),
            alt: geo.height, // km
        };
    } catch {
        return null;
    }
}

function getSatColor(alt: number): Cesium.Color {
    if (alt < 600) return Cesium.Color.fromCssColorString('#00e5ff'); // LEO
    if (alt < 2000) return Cesium.Color.fromCssColorString('#7c4dff'); // MEO low
    if (alt < 20000) return Cesium.Color.fromCssColorString('#ff6e40'); // MEO
    return Cesium.Color.fromCssColorString('#ffd740'); // GEO
}

async function fetchTLEData(): Promise<SatRecord[]> {
    const allRecords: SatRecord[] = [];

    for (const source of TLE_URLS) {
        try {
            const resp = await fetch(source.url);
            if (!resp.ok) continue;
            const text = await resp.text();
            const records = parseTLE(text);
            allRecords.push(...records);
        } catch (err) {
            console.warn(`Failed to fetch TLE from ${source.name}:`, err);
        }
    }

    return allRecords;
}

function renderSatellites() {
    // Remove old entities
    satEntities.forEach(e => viewer.entities.remove(e));
    satEntities = [];

    if (!isVisible || satRecords.length === 0) return;

    const now = new Date();

    // Sample if too many (show up to 2000)
    const sampled = satRecords.length > 2000
        ? satRecords.filter((_, i) => i % Math.ceil(satRecords.length / 2000) === 0)
        : satRecords;

    let rendered = 0;

    sampled.forEach(rec => {
        const pos = getSatPosition(rec.satrec, now);
        if (!pos) return;

        const entity = viewer.entities.add({
            name: rec.name,
            position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, pos.alt * 1000), // km to m
            point: {
                pixelSize: 3,
                color: getSatColor(pos.alt),
                outlineColor: Cesium.Color.WHITE.withAlpha(0.2),
                outlineWidth: 1,
                scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 5e7, 0.3),
            },
            properties: {
                type: 'satellite',
                noradId: rec.noradId,
                altitude: pos.alt,
                period: (2 * Math.PI) / (rec.satrec.no * 60) * (1 / (2 * Math.PI)) * 1440, // minutes
            } as any,
        });

        satEntities.push(entity);
        rendered++;
    });

    // Update counters
    const el = document.getElementById('satellite-count');
    if (el) el.textContent = rendered.toLocaleString();
    const sig = document.getElementById('sig-satellites');
    if (sig) sig.textContent = satRecords.length.toLocaleString();

    EventBus.getInstance().emit('data:satellites', { count: satRecords.length });
}

export async function initSatelliteLayer(v: Cesium.Viewer) {
    viewer = v;

    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        if (layer === 'satellites') {
            isVisible = visible;
            satEntities.forEach(e => { e.show = visible; });
        }
    });

    // Fetch TLE data
    satRecords = await fetchTLEData();
    console.log(`Loaded ${satRecords.length} satellite TLE records`);

    // Initial render
    renderSatellites();

    // Re-propagate positions every 30 seconds
    setInterval(() => {
        renderSatellites();
    }, 30000);
}
