// ============================================
// Ship Tracking (AIS) — Leaflet version
// ============================================
import L from 'leaflet';
import { EventBus } from '../utils/event-bus';
import { getLayerGroup } from '../map/map-engine';
import { TrajectoryStore } from '../engines/trajectory-store';

const SHIPPING_LANES = [
    { baseLat: 26.5, baseLon: 56.3, spread: 1.5, count: 40, type: 80, label: 'Hormuz' },
    { baseLat: 2.0, baseLon: 101.5, spread: 2, count: 55, type: 70, label: 'Malacca' },
    { baseLat: 30.0, baseLon: 32.5, spread: 2, count: 35, type: 70, label: 'Suez' },
    { baseLat: 15.0, baseLon: 65.0, spread: 8, count: 60, type: 70, label: 'Arabian' },
    { baseLat: 14.0, baseLon: 87.0, spread: 6, count: 45, type: 70, label: 'BayBengal' },
    { baseLat: 12.0, baseLon: 112.0, spread: 8, count: 70, type: 70, label: 'SCS' },
    { baseLat: 50.5, baseLon: 0.5, spread: 2, count: 30, type: 70, label: 'Channel' },
    { baseLat: 35.0, baseLon: 18.0, spread: 10, count: 50, type: 70, label: 'Med' },
    { baseLat: 0.0, baseLon: 70.0, spread: 15, count: 40, type: 80, label: 'IO' },
    { baseLat: 9.0, baseLon: -79.5, spread: 2, count: 25, type: 70, label: 'Panama' },
    { baseLat: 13.0, baseLon: 43.0, spread: 3, count: 30, type: 80, label: 'RedSea' },
    { baseLat: 10.0, baseLon: 96.0, spread: 3, count: 20, type: 30, label: 'Andaman' },
];

const SHIP_NAMES: Record<number, string[]> = {
    35: ['INS VIKRAMADITYA', 'USS NIMITZ', 'HMS DEFENDER', 'INS SHIVALIK', 'USS REAGAN', 'INS KAMORTA', 'HMS QE', 'INS KOLKATA'],
    80: ['ATLANTIC PRINCESS', 'PACIFIC TRADER', 'OCEAN SPIRIT', 'ARABIAN DAWN', 'EASTERN HORIZON', 'GULF STAR'],
    70: ['EVER GIVEN', 'MAERSK TANJONG', 'CMA BOUGAINVILLE', 'MSC OSCAR', 'COSCO ARIES', 'HAPAG DURBAN'],
    60: ['QUEEN MARY 2', 'HARMONY SEAS', 'NORWEGIAN BLISS', 'COSTA FIRENZE'],
    30: ['OCEAN HARVEST', 'BLUE FIN', 'SEA SPIRIT', 'DAWN TREADER'],
};

function getShipColor(t: number): string {
    if (t === 35) return '#ff1744';
    if (t >= 80) return '#ff9800';
    if (t >= 70) return '#42a5f5';
    if (t >= 60) return '#66bb6a';
    if (t === 30) return '#ab47bc';
    return '#78909c';
}

function generateShips() {
    const ships: any[] = [];
    let mmsi = 100000000;
    SHIPPING_LANES.forEach(lane => {
        for (let i = 0; i < lane.count; i++) {
            const lat = lane.baseLat + (Math.random() - 0.5) * lane.spread;
            const lon = lane.baseLon + (Math.random() - 0.5) * lane.spread;
            const rng = Math.random();
            let shipType = lane.type;
            if (rng < 0.05) shipType = 35;
            else if (rng < 0.15) shipType = 80;
            else if (rng < 0.2) shipType = 30;
            const names = SHIP_NAMES[shipType] || ['VESSEL'];
            ships.push({
                mmsi: String(mmsi++), name: names[i % names.length],
                lat, lon, speed: 5 + Math.random() * 18,
                course: Math.random() * 360, shipType, destination: lane.label,
                flag: ['IN', 'SG', 'PA', 'CN', 'US', 'GB', 'LR'][Math.floor(Math.random() * 7)],
            });
        }
    });
    return ships;
}

function render(ships: any[]) {
    const group = getLayerGroup('ships');
    if (!group) return;
    group.clearLayers();

    ships.forEach(s => {
        const color = getShipColor(s.shipType);
        const marker = L.circleMarker([s.lat, s.lon], {
            radius: s.shipType === 35 ? 5 : 3,
            fillColor: color, color: color, fillOpacity: 0.8,
            weight: s.shipType === 35 ? 2 : 0,
        });
        marker.bindPopup(`
      <div style="font-family:Inter,sans-serif;font-size:12px;">
        <strong style="color:${color}">🚢 ${s.name}</strong><br>
        MMSI: ${s.mmsi} | 🏳️ ${s.flag}<br>
        Speed: ${s.speed.toFixed(1)} kn | → ${s.destination}
      </div>
    `, { className: 'dark-popup' });
        group.addLayer(marker);

        TrajectoryStore.addPoint(s.mmsi, 'ship', s.name, {
            lat: s.lat, lon: s.lon, alt: 0, timestamp: Date.now(),
            velocity: s.speed, heading: s.course,
        });
    });

    const el = document.getElementById('ship-count');
    if (el) el.textContent = ships.length.toLocaleString();
    const sig = document.getElementById('sig-ships');
    if (sig) sig.textContent = ships.length.toLocaleString();

    EventBus.getInstance().emit('data:ships', { count: ships.length, ships });
}

export async function initShipLayer() {
    EventBus.getInstance().on('layer:toggle', (layer: string, visible: boolean) => {
        const g = getLayerGroup('ships');
        if (layer === 'ships' && g) {
            const map = (window as any).__gcMap;
            if (map) { visible ? g.addTo(map) : map.removeLayer(g); }
        }
    });

    render(generateShips());
    setInterval(() => render(generateShips()), 60000);
}
