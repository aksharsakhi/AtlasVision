// ============================================
// Earthquake Layer — USGS Earthquake API
// Real data! https://earthquake.usgs.gov/fdsnws/event/1/
// ============================================
import * as Cesium from 'cesium';
import { EventBus } from '../../utils/event-bus';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';
const REFRESH_INTERVAL = 300000; // 5 minutes

let quakeEntities: Cesium.Entity[] = [];
let isVisible = true;
let viewer: Cesium.Viewer;

interface Earthquake {
    id: string;
    magnitude: number;
    place: string;
    time: number;
    lon: number;
    lat: number;
    depth: number;
    url: string;
}

function parseEarthquakes(data: any): Earthquake[] {
    if (!data || !data.features) return [];

    return data.features.map((f: any) => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        depth: f.geometry.coordinates[2],
        url: f.properties.url,
    }));
}

function getMagnitudeColor(mag: number): Cesium.Color {
    if (mag >= 7) return Cesium.Color.fromCssColorString('#ff1744');
    if (mag >= 6) return Cesium.Color.fromCssColorString('#ff5252');
    if (mag >= 5) return Cesium.Color.fromCssColorString('#ff9800');
    return Cesium.Color.fromCssColorString('#ffeb3b');
}

function getMagnitudeSize(mag: number): number {
    if (mag >= 7) return 18;
    if (mag >= 6) return 14;
    if (mag >= 5) return 10;
    return 7;
}

async function fetchEarthquakes(): Promise<Earthquake[]> {
    try {
        const resp = await fetch(USGS_URL);
        if (!resp.ok) throw new Error(`USGS HTTP ${resp.status}`);
        const data = await resp.json();
        return parseEarthquakes(data);
    } catch (err) {
        console.warn('USGS earthquake fetch failed:', err);
        return [];
    }
}

function renderEarthquakes(quakes: Earthquake[]) {
    quakeEntities.forEach(e => viewer.entities.remove(e));
    quakeEntities = [];

    if (!isVisible) return;

    quakes.forEach(q => {
        const timeAgo = getTimeAgo(q.time);
        const color = getMagnitudeColor(q.magnitude);

        // Pulsing circle for significant quakes
        const entity = viewer.entities.add({
            name: `M${q.magnitude} — ${q.place}`,
            position: Cesium.Cartesian3.fromDegrees(q.lon, q.lat),
            point: {
                pixelSize: getMagnitudeSize(q.magnitude),
                color: color.withAlpha(0.8),
                outlineColor: color,
                outlineWidth: 2,
                scaleByDistance: new Cesium.NearFarScalar(1e5, 2, 1e7, 0.8),
            },
            label: q.magnitude >= 5.5 ? {
                text: `M${q.magnitude.toFixed(1)}`,
                font: '11px JetBrains Mono',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -12),
                scaleByDistance: new Cesium.NearFarScalar(1e5, 1, 5e6, 0.4),
            } : undefined,
            properties: {
                type: 'earthquake',
                magnitude: q.magnitude,
                depth: q.depth.toFixed(1),
                place: q.place,
                time: timeAgo,
            } as any,
        });

        quakeEntities.push(entity);
    });

    // Update counters
    const el = document.getElementById('earthquake-count');
    if (el) el.textContent = quakes.length.toString();
    const sig = document.getElementById('sig-earthquakes');
    if (sig) sig.textContent = quakes.length.toString();

    EventBus.getInstance().emit('data:earthquakes', { count: quakes.length, quakes });
}

function getTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

export async function initEarthquakeLayer(v: Cesium.Viewer) {
    viewer = v;

    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        if (layer === 'earthquakes') {
            isVisible = visible;
            quakeEntities.forEach(e => { e.show = visible; });
        }
    });

    const quakes = await fetchEarthquakes();
    renderEarthquakes(quakes);

    setInterval(async () => {
        const quakes = await fetchEarthquakes();
        renderEarthquakes(quakes);
    }, REFRESH_INTERVAL);
}
