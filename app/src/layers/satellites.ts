// ============================================
// Satellite Tracking — ALL satellites with orbits + pass prediction
// CelesTrak TLE + satellite.js SGP4 propagation
// ============================================
import L from 'leaflet';
import { EventBus } from '../utils/event-bus';
import { getLayerGroup, getMap } from '../map/map-engine';
import * as satellite from 'satellite.js';

const TLE_URLS = [
    { name: 'Stations', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle' },
    { name: 'Active', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle' },
];

interface SatRecord {
    name: string;
    satrec: satellite.SatRec;
    noradId: string;
    line1: string;
    line2: string;
}

let satRecords: SatRecord[] = [];
let selectedSat: SatRecord | null = null;
let orbitLine: L.Polyline | null = null;

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
            records.push({ name, satrec, noradId, line1, line2 });
        } catch { /* skip */ }
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
            alt: geo.height,
        };
    } catch { return null; }
}

function getSatColor(alt: number): string {
    if (alt < 600) return '#00e5ff';
    if (alt < 2000) return '#7c4dff';
    if (alt < 20000) return '#ff6e40';
    return '#ffd740';
}

// Compute orbit ground track (full orbit path)
function computeOrbitTrack(satrec: satellite.SatRec, minutes: number = 90): [number, number][] {
    const points: [number, number][] = [];
    const now = new Date();
    for (let m = -45; m <= minutes; m += 1) {
        const t = new Date(now.getTime() + m * 60000);
        const pos = getSatPosition(satrec, t);
        if (pos) points.push([pos.lat, pos.lon]);
    }
    return points;
}

// Pass prediction: when will satellite pass over a location
export function predictPasses(satrec: satellite.SatRec, obsLat: number, obsLon: number, hours: number = 48): {
    riseTime: Date; peakTime: Date; setTime: Date; peakElevation: number;
}[] {
    const passes: any[] = [];
    const now = new Date();
    const obsGd = {
        latitude: satellite.degreesToRadians(obsLat),
        longitude: satellite.degreesToRadians(obsLon),
        height: 0,
    };

    let inPass = false;
    let riseTime: Date | null = null;
    let peakEl = 0;
    let peakTime: Date | null = null;

    for (let m = 0; m < hours * 60; m++) {
        const t = new Date(now.getTime() + m * 60000);
        const posVel = satellite.propagate(satrec, t);
        if (!posVel.position || typeof posVel.position === 'boolean') continue;

        const gmst = satellite.gstime(t);
        const posEci = posVel.position as satellite.EciVec3<number>;
        const lookAngles = satellite.ecfToLookAngles(obsGd, satellite.eciToEcf(posEci, gmst));
        const elevation = lookAngles.elevation * (180 / Math.PI);

        if (elevation > 0 && !inPass) {
            inPass = true;
            riseTime = t;
            peakEl = elevation;
            peakTime = t;
        } else if (elevation > 0 && inPass) {
            if (elevation > peakEl) {
                peakEl = elevation;
                peakTime = t;
            }
        } else if (elevation <= 0 && inPass) {
            inPass = false;
            if (riseTime && peakTime && peakEl > 5) { // Only passes above 5°
                passes.push({ riseTime, peakTime, setTime: t, peakElevation: peakEl });
            }
            if (passes.length >= 10) break;
        }
    }
    return passes;
}

function renderSatellites() {
    const group = getLayerGroup('satellites');
    if (!group) return;
    group.clearLayers();

    const now = new Date();
    const sampled = satRecords.length > 2000
        ? satRecords.filter((_, i) => i % Math.ceil(satRecords.length / 2000) === 0)
        : satRecords;

    let rendered = 0;
    sampled.forEach(rec => {
        const pos = getSatPosition(rec.satrec, now);
        if (!pos) return;

        const color = getSatColor(pos.alt);
        const marker = L.circleMarker([pos.lat, pos.lon], {
            radius: rec.name.includes('ISS') ? 6 : 2,
            fillColor: color,
            color: color,
            fillOpacity: 0.9,
            weight: rec.name.includes('ISS') ? 2 : 0,
        });

        marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;font-size:12px;">
        <strong style="color:#00d4ff">🛰️ ${rec.name}</strong><br>
        NORAD: ${rec.noradId}<br>
        Alt: ${pos.alt.toFixed(0)} km<br>
        <button onclick="window.__gcShowOrbit('${rec.noradId}')" style="margin-top:4px;padding:3px 8px;background:#00d4ff;border:none;color:#000;border-radius:4px;cursor:pointer;font-size:10px;">Show Orbit</button>
      </div>
    `, { className: 'dark-popup' });

        group.addLayer(marker);
        rendered++;
    });

    updateCount('satellite-count', rendered);
    updateCount('sig-satellites', satRecords.length);
    EventBus.getInstance().emit('data:satellites', { count: satRecords.length });
}

// Show orbit track for a selected satellite
(window as any).__gcShowOrbit = (noradId: string) => {
    const rec = satRecords.find(r => r.noradId === noradId);
    if (!rec) return;

    const map = getMap();
    const orbitGroup = getLayerGroup('orbits');
    if (!map || !orbitGroup) return;

    orbitGroup.clearLayers();

    const track = computeOrbitTrack(rec.satrec, 100);

    // Split track at antimeridian crossings
    const segments: [number, number][][] = [[]];
    track.forEach((p, i) => {
        if (i > 0 && Math.abs(p[1] - track[i - 1][1]) > 180) {
            segments.push([]);
        }
        segments[segments.length - 1].push(p);
    });

    segments.forEach(seg => {
        if (seg.length < 2) return;
        const line = L.polyline(seg, {
            color: '#7b61ff',
            weight: 2,
            opacity: 0.7,
            dashArray: '5,5',
        });
        orbitGroup.addLayer(line);
    });

    selectedSat = rec;
    updateSatInfo(rec);
};

function updateSatInfo(rec: SatRecord) {
    const el = document.getElementById('sat-detail-content');
    if (!el) return;

    const pos = getSatPosition(rec.satrec, new Date());
    if (!pos) return;

    // Compute orbital period
    const period = (2 * Math.PI) / (rec.satrec.no * 60) * (1 / (2 * Math.PI)) * 1440;

    el.innerHTML = `
    <div class="sat-detail-header">
      <h4>🛰️ ${rec.name}</h4>
      <span class="sat-norad">${rec.noradId}</span>
    </div>
    <div class="sat-detail-grid">
      <div class="sd-item"><span class="sd-label">Altitude</span><span class="sd-value">${pos.alt.toFixed(0)} km</span></div>
      <div class="sd-item"><span class="sd-label">Latitude</span><span class="sd-value">${pos.lat.toFixed(3)}°</span></div>
      <div class="sd-item"><span class="sd-label">Longitude</span><span class="sd-value">${pos.lon.toFixed(3)}°</span></div>
      <div class="sd-item"><span class="sd-label">Period</span><span class="sd-value">${period.toFixed(1)} min</span></div>
    </div>
  `;

    document.getElementById('sat-detail-panel')!.style.display = 'block';
}

function updateCount(id: string, val: number) {
    const el = document.getElementById(id);
    if (el) el.textContent = val.toLocaleString();
}

async function fetchTLEData(): Promise<SatRecord[]> {
    const allRecords: SatRecord[] = [];
    for (const src of TLE_URLS) {
        try {
            const r = await fetch(src.url);
            if (!r.ok) continue;
            allRecords.push(...parseTLE(await r.text()));
        } catch { /* skip */ }
    }
    return allRecords;
}

export async function initSatelliteLayer() {
    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        const g = getLayerGroup('satellites');
        if (layer === 'satellites' && g) {
            const map = getMap();
            if (map) { visible ? g.addTo(map) : map.removeLayer(g); }
        }
    });

    satRecords = await fetchTLEData();
    console.log(`Loaded ${satRecords.length} satellite TLE records`);
    renderSatellites();

    // Re-propagate every 30 seconds
    setInterval(renderSatellites, 30000);
}

// Export for pass prediction panel
export function getSatRecords(): SatRecord[] {
    return satRecords;
}

export function findSatByName(query: string): SatRecord[] {
    const q = query.toLowerCase();
    return satRecords.filter(r => r.name.toLowerCase().includes(q) || r.noradId.includes(q));
}
