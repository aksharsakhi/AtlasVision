// ============================================
// Satellites Dashboard — All-in-One Satellite View
// CelesTrak TLE + satellite.js SGP4 real-time propagation
// ============================================
import * as L from 'leaflet';
import * as satellite from 'satellite.js';

export let satelliteMap: L.Map | null = null;

interface SatRecord {
    name: string;
    satrec: satellite.SatRec;
    noradId: string;
    line1: string;
    line2: string;
    category: string;
}

let satRecords: SatRecord[] = [];
const satMarkers = new Map<string, L.Marker>();
let orbitLayer: L.LayerGroup | null = null;
let satTileLayer: L.TileLayer | null = null;

const SAT_TILE_LAYERS = {
    dark: { label: '🌑 Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', opts: { maxZoom: 18, attribution: '' } },
    satellite: { label: '🛰️ Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opts: { maxZoom: 19, attribution: '' } },
    terrain: { label: '🏔️ Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', opts: { maxZoom: 17, attribution: '' } },
};

const TLE_SOURCES = [
    { cat: 'Stations', url: '/api/tle?group=stations' },
    { cat: 'Active', url: '/api/tle?group=active' },
    { cat: 'Starlink', url: '/api/tle?group=starlink' },
    { cat: 'OneWeb', url: '/api/tle?group=oneweb' },
    { cat: 'Weather', url: '/api/tle?group=weather' },
];


function parseTLE(text: string, cat: string): SatRecord[] {
    const lines = text.trim().split('\n');
    const records: SatRecord[] = [];
    for (let i = 0; i < lines.length - 2; i += 3) {
        const name = lines[i].trim();
        const l1 = lines[i + 1]?.trim();
        const l2 = lines[i + 2]?.trim();
        if (!l1 || !l2 || !l1.startsWith('1') || !l2.startsWith('2')) continue;
        try {
            const satrec = satellite.twoline2satrec(l1, l2);
            records.push({ name, satrec, noradId: l1.substring(2, 7).trim(), line1: l1, line2: l2, category: cat });
        } catch { }
    }
    return records;
}

function getSatPos(r: SatRecord, date: Date) {
    try {
        const pv = satellite.propagate(r.satrec, date);
        if (!pv.position || typeof pv.position === 'boolean') return null;
        const gmst = satellite.gstime(date);
        const geo = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst);
        return { lat: satellite.degreesLat(geo.latitude), lon: satellite.degreesLong(geo.longitude), alt: geo.height };
    } catch { return null; }
}

function getSatColor(cat: string): string {
    switch (cat) {
        case 'Stations': return '#ffea00';
        case 'Starlink': return '#40c4ff';
        default: return '#b388ff';
    }
}

// Real satellite SVG icon (body + solar panels)
function satelliteIcon(cat: string): L.DivIcon {
    const color = getSatColor(cat);
    const isStation = cat === 'Stations';
    const size = isStation ? 20 : 12;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40"
    style="filter:drop-shadow(0 0 4px ${color});">
    <!-- Left solar panel -->
    <rect x="0" y="14" width="13" height="12" rx="1" fill="${color}" opacity="0.85"/>
    <line x1="2" y1="14" x2="2" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <line x1="5" y1="14" x2="5" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <line x1="8" y1="14" x2="8" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <line x1="11" y1="14" x2="11" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <!-- Truss / boom -->
    <rect x="13" y="19" width="14" height="2" fill="${color}" opacity="0.6"/>
    <!-- Body -->
    <rect x="14" y="14" width="12" height="12" rx="2" fill="${color}"/>
    <!-- Antenna -->
    <line x1="20" y1="14" x2="20" y2="9" stroke="${color}" stroke-width="1.5"/>
    <circle cx="20" cy="8" r="2" fill="${color}" opacity="0.8"/>
    <!-- Right solar panel -->
    <rect x="27" y="14" width="13" height="12" rx="1" fill="${color}" opacity="0.85"/>
    <line x1="29" y1="14" x2="29" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <line x1="32" y1="14" x2="32" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <line x1="35" y1="14" x2="35" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
    <line x1="38" y1="14" x2="38" y2="26" stroke="#000" stroke-width="0.5" opacity="0.4"/>
  </svg>`;
    return L.divIcon({
        className: '',
        html: svg,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function renderSatellites() {
    if (!satelliteMap) return;
    const now = new Date();
    const sampled = satRecords.length > 3000
        ? satRecords.filter((_, i) => i % Math.ceil(satRecords.length / 3000) === 0)
        : satRecords;

    const seen = new Set<string>();
    sampled.forEach(rec => {
        const pos = getSatPos(rec, now);
        if (!pos) return;
        seen.add(rec.noradId);

        if (satMarkers.has(rec.noradId)) {
            (satMarkers.get(rec.noradId)! as L.Marker).setLatLng([pos.lat, pos.lon]);
        } else {
            const m = L.marker([pos.lat, pos.lon], {
                icon: satelliteIcon(rec.category),
                zIndexOffset: rec.category === 'Stations' ? 1000 : 0,
            });
            m.bindPopup(`
        <div style="font-family:monospace;font-size:11px;min-width:175px;background:#111;color:#ddd;padding:10px;border-radius:6px;">
          <strong style="color:#00d4ff;font-size:13px;">🛰️ ${rec.name}</strong><br/>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;font-size:10px;">
            <span style="color:#666">NORAD</span><span>${rec.noradId}</span>
            <span style="color:#666">Altitude</span><span style="color:#00e676">${pos.alt.toFixed(0)} km</span>
            <span style="color:#666">Category</span><span>${rec.category}</span>
          </div>
          <button onclick="window.__gcShowSatOrbit('${rec.noradId}')"
            style="margin-top:6px;padding:4px 10px;background:#7b61ff;border:none;color:#fff;border-radius:4px;cursor:pointer;font-size:10px;width:100%;">📡 Show Orbit Track</button>
        </div>`);
            m.addTo(satelliteMap!);
            satMarkers.set(rec.noradId, m as any);
        }
    });

    satMarkers.forEach((m, id) => {
        if (!seen.has(id)) { satelliteMap?.removeLayer(m); satMarkers.delete(id); }
    });

    updateSatStats();
}

function updateSatStats() {
    const cats: Record<string, number> = {};
    satRecords.forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; });
    const statsEl = document.getElementById('sat-stats-cards');
    if (statsEl) {
        statsEl.innerHTML = `
      <div class="flight-stat-card"><span class="stat-val">${satRecords.length.toLocaleString()}</span><span class="stat-label">Total Satellites</span></div>
      ${Object.entries(cats).map(([cat, cnt]) => `
        <div class="flight-stat-card"><span class="stat-val" style="color:${getSatColor(cat)}">${cnt.toLocaleString()}</span><span class="stat-label">${cat}</span></div>
      `).join('')}
    `;
    }

    const listEl = document.getElementById('sat-list-panel');
    if (listEl) {
        const now = new Date();
        const withPos = satRecords.map(r => ({ r, pos: getSatPos(r, now) })).filter(x => x.pos).slice(0, 60);
        listEl.innerHTML = withPos.map(({ r, pos }) => `
      <div onclick="window.__gcShowSatOrbit('${r.noradId}')" style="cursor:pointer;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:10px;">
        <span style="color:${getSatColor(r.category)};font-weight:bold;">${r.name}</span>
        <span style="color:#666;float:right;">${pos!.alt.toFixed(0)}km</span><br/>
        <span style="color:#555">${r.category} | NORAD: ${r.noradId}</span>
      </div>
    `).join('');
    }
}

(window as any).__gcShowSatOrbit = (noradId: string) => {
    const rec = satRecords.find(r => r.noradId === noradId);
    if (!rec || !satelliteMap) return;

    if (orbitLayer) { satelliteMap.removeLayer(orbitLayer); }
    orbitLayer = L.layerGroup().addTo(satelliteMap);

    const now = new Date();
    const track: [number, number][] = [];
    for (let m = -45; m <= 120; m++) {
        const pos = getSatPos(rec, new Date(now.getTime() + m * 60000));
        if (pos) track.push([pos.lat, pos.lon]);
    }

    // Split at antimeridian
    const segs: [number, number][][] = [[]];
    track.forEach((p, i) => {
        if (i > 0 && Math.abs(p[1] - track[i - 1][1]) > 180) segs.push([]);
        segs[segs.length - 1].push(p);
    });
    segs.forEach(seg => {
        if (seg.length < 2) return;
        L.polyline(seg, { color: getSatColor(rec.category), weight: 2, opacity: 0.7, dashArray: '5,5' }).addTo(orbitLayer!);
    });

    const curPos = getSatPos(rec, now);
    if (curPos) {
        satelliteMap.flyTo([curPos.lat, curPos.lon], 3, { animate: true, duration: 1.5 });
    }

    // Show detail in panel
    const detailEl = document.getElementById('sat-detail-info');
    if (detailEl && curPos) {
        const period = (2 * Math.PI) / (rec.satrec.no * 60) * (1 / (2 * Math.PI)) * 1440;
        detailEl.innerHTML = `
      <h4 style="color:#00d4ff;margin:0 0 8px">🛰️ ${rec.name}</h4>
      <div style="font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <div><span style="color:#666">NORAD</span><br/><span style="color:#aaa">${rec.noradId}</span></div>
        <div><span style="color:#666">Category</span><br/><span style="color:#aaa">${rec.category}</span></div>
        <div><span style="color:#666">Altitude</span><br/><span style="color:#00e676">${curPos.alt.toFixed(0)} km</span></div>
        <div><span style="color:#666">Period</span><br/><span style="color:#aaa">${period.toFixed(1)} min</span></div>
        <div><span style="color:#666">Latitude</span><br/><span style="color:#aaa">${curPos.lat.toFixed(3)}°</span></div>
        <div><span style="color:#666">Longitude</span><br/><span style="color:#aaa">${curPos.lon.toFixed(3)}°</span></div>
      </div>
    `;
    }
};

export async function initSatellitesDashboard() {
    const mapEl = document.getElementById('satellites-map');
    if (!mapEl) return;

    satelliteMap = L.map('satellites-map', {
        center: [0, 0],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
    });

    satTileLayer = L.tileLayer(SAT_TILE_LAYERS.dark.url, SAT_TILE_LAYERS.dark.opts).addTo(satelliteMap);

    // Layer switcher
    const switcherDiv = document.createElement('div');
    switcherDiv.style.cssText = 'position:absolute;top:80px;right:10px;z-index:1100;';
    switcherDiv.innerHTML = Object.entries(SAT_TILE_LAYERS).map(([key, val]) => `
      <button data-sat-layer="${key}" onclick="window.__gcSatLayer('${key}')"
        style="display:block;width:100%;margin-bottom:3px;padding:5px 10px;
               background:${key === 'dark' ? 'rgba(0,212,255,0.25)' : 'rgba(0,0,0,0.7)'};
               color:${key === 'dark' ? '#00d4ff' : '#aaa'};border:1px solid rgba(255,255,255,0.15);
               border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;">${val.label}</button>
    `).join('');
    mapEl.style.position = 'relative';
    mapEl.appendChild(switcherDiv);

    (window as any).__gcSatLayer = (type: string) => {
        if (!satelliteMap || !satTileLayer) return;
        satelliteMap.removeLayer(satTileLayer);
        const spec = SAT_TILE_LAYERS[type as keyof typeof SAT_TILE_LAYERS];
        satTileLayer = L.tileLayer(spec.url, spec.opts).addTo(satelliteMap);
        document.querySelectorAll('[data-sat-layer]').forEach(btn => {
            const el = btn as HTMLElement;
            const isActive = el.dataset.satLayer === type;
            el.style.background = isActive ? 'rgba(0,212,255,0.25)' : 'rgba(0,0,0,0.7)';
            el.style.color = isActive ? '#00d4ff' : '#aaa';
        });
    };

    // Load TLEs
    const allRecs: SatRecord[] = [];
    for (const src of TLE_SOURCES) {
        try {
            const r = await fetch(src.url);
            if (!r.ok) continue;
            allRecs.push(...parseTLE(await r.text(), src.cat));
        } catch { }
    }
    // Deduplicate
    const seen = new Set<string>();
    satRecords = allRecs.filter(r => { if (seen.has(r.noradId)) return false; seen.add(r.noradId); return true; });

    renderSatellites();
    setInterval(renderSatellites, 30000);

    // Search
    const searchInput = document.getElementById('sat-search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('sat-search-btn');
    if (searchInput && searchBtn) {
        const doSearch = () => {
            const q = searchInput.value.toLowerCase().trim();
            if (!q) return;
            const found = satRecords.find(r => r.name.toLowerCase().includes(q) || r.noradId.includes(q));
            if (found) (window as any).__gcShowSatOrbit(found.noradId);
        };
        searchBtn.addEventListener('click', doSearch);
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
    }
}
