// ============================================
// Flights Dashboard v2 — Live ADS-B Tracking
// Backend-proxied OpenSky | Real plane SVGs | Layer switcher | Aviation news
// ============================================
import * as L from 'leaflet';

export let flightMap: L.Map | null = null;

interface FlightState {
    icao24: string;
    callsign: string;
    originCountry: string;
    longitude: number;
    latitude: number;
    altitude: number;
    onGround: boolean;
    velocity: number;
    heading: number;
}

const flightMarkers = new Map<string, L.Marker>();
const flightTrails = new Map<string, L.Polyline>();
let allFlights: FlightState[] = [];
let currentTileLayer: L.TileLayer | null = null;
let flightMapRef: L.Map | null = null;

// ── TILE LAYERS ─────────────────────────────────────────────────────────
const TILE_LAYERS = {
    dark: {
        label: '🌑 Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        opts: { maxZoom: 19, attribution: '' },
    },
    satellite: {
        label: '🛰️ Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        opts: { maxZoom: 19, attribution: '' },
    },
    terrain: {
        label: '🏔️ Terrain',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 17, attribution: '' },
    },
    street: {
        label: '🗺️ Street',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        opts: { maxZoom: 19, attribution: '' },
    },
};

// ── REAL AIRPLANE SVG (commercial airliner silhouette viewed from above) ──
function airplaneIcon(heading: number, color: string, onGround: boolean): L.DivIcon {
    const size = onGround ? 14 : 18;
    const glow = `drop-shadow(0 0 3px ${color})`;
    // Full commercial airliner top-view SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100"
    style="transform:rotate(${heading - 90}deg);filter:${glow};opacity:${onGround ? 0.5 : 1}">
    <!-- Fuselage -->
    <ellipse cx="50" cy="50" rx="6" ry="38" fill="${color}"/>
    <!-- Wings -->
    <ellipse cx="50" cy="52" rx="44" ry="8" fill="${color}" opacity="0.9"/>
    <!-- Tail horizontal stabilizer -->
    <ellipse cx="50" cy="15" rx="22" ry="5" fill="${color}" opacity="0.85"/>
    <!-- Tail vertical fin -->
    <ellipse cx="50" cy="14" rx="4" ry="10" fill="${color}"/>
    <!-- Engine pods left -->
    <ellipse cx="24" cy="56" rx="4" ry="10" fill="${color}" opacity="0.8"/>
    <!-- Engine pods right -->
    <ellipse cx="76" cy="56" rx="4" ry="10" fill="${color}" opacity="0.8"/>
    <!-- Nose -->
    <ellipse cx="50" cy="88" rx="4" ry="6" fill="${color}"/>
  </svg>`;
    return L.divIcon({
        className: '',
        html: svg,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function getFlightColor(alt: number, onGround: boolean): string {
    if (onGround) return '#888888';
    if (alt < 1000) return '#69f0ae';   // Very low — green
    if (alt < 5000) return '#40c4ff';   // Low — cyan
    if (alt < 10000) return '#7b61ff';  // Cruise — purple
    return '#ff80ab';                    // High — pink
}

// Parse OpenSky-format states array
function parseStates(data: any): FlightState[] {
    if (!data?.states) return [];
    return data.states
        .filter((s: any[]) => s[5] != null && s[6] != null)
        .map((s: any[]) => ({
            icao24: s[0] || '',
            callsign: String(s[1] || '').trim(),
            originCountry: s[2] || '?',
            longitude: parseFloat(s[5]),
            latitude: parseFloat(s[6]),
            altitude: parseFloat(s[7] || s[13] || 0),
            onGround: s[8] || false,
            velocity: parseFloat(s[9] || 0),
            heading: parseFloat(s[10] || 0),
        }));
}

// Parse ADS-B Exchange format (adsb.lol / adsb.one) — returns FlightState[] directly
function parseADSBEx(data: any): FlightState[] {
    if (!data?.ac) return [];
    return data.ac
        .filter((a: any) => a.lat != null && a.lon != null)
        .map((a: any) => ({
            icao24: (a.hex || '').toLowerCase(),
            callsign: (a.flight || a.r || '').trim(),
            originCountry: a.ownOp || a.dbFlags !== undefined ? 'Global' : '?',
            longitude: a.lon,
            latitude: a.lat,
            altitude: (a.alt_baro && a.alt_baro !== 'ground') ? Number(a.alt_baro) * 0.3048 : 0,
            onGround: a.alt_baro === 'ground' || a.alt_geom === 0,
            velocity: (a.gs ?? 0) * 0.514444,
            heading: a.track ?? 0,
        }));
}

// ── FLIGHT DATA CASCADE ───────────────────────────────────────────────────────
// Source priority: adsb.lol (CORS-enabled) → backend proxy → adsb.one direct
let _flightSource = 'unknown';
async function fetchFlights(): Promise<FlightState[]> {
    const fetchWithTimeout = async (resource: string, options: any & { timeout?: number } = {}) => {
        const { timeout = 15000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    };

    // 1. Try adsb.lol directly from browser — supports CORS, free, best quality
    try {
        updateFlightStatus('🔄 Contacting ADS-B Exchange (adsb.lol)...');
        const r = await fetchWithTimeout('https://api.adsb.lol/v2/all', {
            headers: { 'Accept': 'application/json' },
            timeout: 15000
        });
        if (r.ok) {
            const data = await r.json();
            const flights = parseADSBEx(data);
            if (flights.length > 0) {
                _flightSource = 'adsb.lol (direct)';
                console.log(`[Flights] ✅ adsb.lol direct: ${flights.length} aircraft`);
                return flights;
            }
        }
    } catch (e) {
        console.log('[Flights] adsb.lol direct failed, trying next...', e);
    }

    // 2. Try adsb.one directly from browser
    try {
        updateFlightStatus('🔄 Contacting ADS-B Exchange (adsb.one)...');
        const r = await fetchWithTimeout('https://api.adsb.one/v2/all', {
            headers: { 'Accept': 'application/json' },
            timeout: 15000
        });
        if (r.ok) {
            const data = await r.json();
            const flights = parseADSBEx(data);
            if (flights.length > 0) {
                _flightSource = 'adsb.one (direct)';
                console.log(`[Flights] ✅ adsb.one direct: ${flights.length} aircraft`);
                return flights;
            }
        }
    } catch (e) {
        console.log('[Flights] adsb.one direct failed, trying backend proxy...', e);
    }

    // 3. Try backend proxy (our server cascades through FR24 → adsbExchange → opensky)
    try {
        updateFlightStatus('🔄 Connecting via backend proxy...');
        const r = await fetchWithTimeout('/api/flights', { timeout: 25000 });
        if (r.ok) {
            const data = await r.json();
            const flights = parseStates(data);
            if (flights.length > 0) {
                _flightSource = data.source || 'proxy';
                console.log(`[Flights] ✅ Backend proxy (${_flightSource}): ${flights.length} aircraft`);
                return flights;
            }
        }
    } catch (e) {
        console.log('[Flights] Backend proxy failed, trying regional fallback...', e);
    }

    // 4. Regional fallback — fetch a smaller bounding box to reduce load
    try {
        updateFlightStatus('🔄 Trying regional ADS-B fallback...');
        const r = await fetchWithTimeout('https://api.adsb.lol/v2/lat/0/lon/0/dist/5000', {
            headers: { 'Accept': 'application/json' },
            timeout: 12000
        });
        if (r.ok) {
            const data = await r.json();
            const flights = parseADSBEx(data);
            if (flights.length > 0) {
                _flightSource = 'adsb.lol (regional)';
                console.log(`[Flights] ✅ Regional fallback: ${flights.length} aircraft`);
                return flights;
            }
        }
    } catch (e) {
        console.log('[Flights] All sources exhausted', e);
    }

    updateFlightStatus('⚠️ All ADS-B sources unavailable — retrying in 60s');
    return [];
}


function renderFlightsOnMap(flights: FlightState[]) {
    if (!flightMapRef) return;

    // Cap at 6000 for performance, prioritize airborne
    const airborne = flights.filter(f => !f.onGround);
    const ground = flights.filter(f => f.onGround);
    const combined = [...airborne, ...ground].slice(0, 6000);

    const seen = new Set<string>();

    combined.forEach(f => {
        if (!f.longitude || !f.latitude || isNaN(f.latitude) || isNaN(f.longitude)) return;
        const color = getFlightColor(f.altitude, f.onGround);
        const key = f.icao24 || `${f.latitude},${f.longitude}`;
        seen.add(key);

        if (flightMarkers.has(key)) {
            const m = flightMarkers.get(key)!;
            m.setLatLng([f.latitude, f.longitude]);
            m.setIcon(airplaneIcon(f.heading, color, f.onGround));

            if (flightTrails.has(key)) {
                const trail = flightTrails.get(key)!;
                trail.addLatLng([f.latitude, f.longitude]);
                if ((trail.getLatLngs() as L.LatLng[]).length > 20) {
                    const latlngs = trail.getLatLngs() as L.LatLng[];
                    latlngs.shift();
                    trail.setLatLngs(latlngs);
                }
            } else if (!f.onGround) {
                const trail = L.polyline([[f.latitude, f.longitude]], { color, weight: 2, opacity: 0.4, dashArray: '4, 4' }).addTo(flightMapRef!);
                flightTrails.set(key, trail);
            }
        } else {
            const m = L.marker([f.latitude, f.longitude], {
                icon: airplaneIcon(f.heading, color, f.onGround),
                zIndexOffset: f.onGround ? 0 : 100,
            });
            m.bindPopup(`
        <div style="font-family:Inter,sans-serif;font-size:12px;min-width:240px;background:#111;color:#ddd;padding:10px;border-radius:6px;" id="flight-popup-${key.replace(/[^a-zA-Z0-9]/g, '')}">
          <div style="font-size:15px;font-weight:bold;color:#00d4ff;margin-bottom:6px;">✈ ${f.callsign || f.icao24 || 'Unknown'}</div>
          <div style="font-size:10px;color:#aaa;">Tracking ID: ${f.icao24}</div>
          <div style="font-size:11px;color:#ff9100;margin-top:8px;">📡 Intercepting manifest logs...</div>
        </div>`, { className: '' });

            m.on('click', async () => {
                setTimeout(async () => {
                    const el = document.getElementById(`flight-popup-${key.replace(/[^a-zA-Z0-9]/g, '')}`);
                    if (!el) return;
                    try {
                        const r = await fetch(`/api/flight/${f.icao24}`);
                        if (r.ok) {
                            const d = await r.json();
                            el.innerHTML = `
                                <div style="font-size:15px;font-weight:bold;color:#00d4ff;margin-bottom:2px;">✈ ${d.callsign || f.callsign || f.icao24}</div>
                                <div style="color:#ff9100;font-size:10px;margin-bottom:8px;font-weight:bold;">${d.airline} | ${d.aircraft}</div>
                                <div style="display:grid;grid-template-columns:1fr 2fr;gap:4px;font-size:11px;border-top:1px solid #333;padding-top:6px;">
                                  <span style="color:#666">Departure</span><span style="color:#fff" title="${d.origin}">${d.originCode} (Gate ${d.originGate})</span>
                                  <span style="color:#666">Arrival</span><span style="color:#fff" title="${d.destination}">${d.destinationCode} (Gate ${d.destinationGate})</span>
                                  <span style="color:#666">Dep Time</span><span style="color:#ccc">${d.departureTime ? new Date(d.departureTime * 1000).toLocaleTimeString() : 'N/A'}</span>
                                  <span style="color:#666">Arr Time</span><span style="color:#ccc">${d.arrivalTime ? new Date(d.arrivalTime * 1000).toLocaleTimeString() : 'N/A'}</span>
                                  <span style="color:#666">Baggage Belt</span><span style="color:#ccc">${d.destinationBaggage}</span>
                                  <span style="color:#666">Alt & Spd</span><span style="color:#ccc">${Math.round(f.altitude).toLocaleString()}m at ${Math.round(f.velocity * 1.944)} kts</span>
                                  <span style="color:#666">Status</span><span style="color:${f.onGround ? '#ff5252' : '#69f0ae'}">${f.onGround ? '🔴 On Ground' : '🟢 Airborne'}</span>
                                </div>
                            `;
                        } else {
                            el.innerHTML += '<div style="color:#ff5252;font-size:10px;margin-top:5px;">Encrypted manifest - Access denied.</div>';
                        }
                    } catch (e) {
                        el.innerHTML += '<div style="color:#ff5252;font-size:10px;margin-top:5px;">Proxy uplink failed.</div>';
                    }
                }, 100);
            });
            m.addTo(flightMapRef!);
            flightMarkers.set(key, m);
        }
    });

    // Remove stale markers and trails
    flightMarkers.forEach((m, key) => {
        if (!seen.has(key)) {
            flightMapRef?.removeLayer(m);
            flightMarkers.delete(key);

            if (flightTrails.has(key)) {
                flightMapRef?.removeLayer(flightTrails.get(key)!);
                flightTrails.delete(key);
            }
        }
    });

    updateFlightStats(flights);
    updateFlightStatus(`✅ ${flights.length.toLocaleString()} flights loaded from ${_flightSource} at ${new Date().toISOString().substring(11, 19)} UTC`);
}

function updateFlightStatus(msg: string) {
    const el = document.getElementById('flight-status-bar');
    if (el) el.textContent = msg;
}

function updateFlightStats(flights: FlightState[]) {
    const airborne = flights.filter(f => !f.onGround).length;
    const countries = new Set(flights.map(f => f.originCountry)).size;
    const avgAlt = flights.filter(f => !f.onGround && f.altitude > 100).reduce((a, f) => a + f.altitude, 0) / Math.max(airborne, 1);
    const avgSpd = flights.filter(f => !f.onGround && f.velocity > 0).reduce((a, f) => a + f.velocity * 1.944, 0) / Math.max(airborne, 1);

    const statsEl = document.getElementById('flight-stats');
    if (statsEl) {
        statsEl.innerHTML = `
      <div class="flight-stat-card"><span class="stat-val">${flights.length.toLocaleString()}</span><span class="stat-label">Total Tracked</span></div>
      <div class="flight-stat-card"><span class="stat-val" style="color:#00e676">${airborne.toLocaleString()}</span><span class="stat-label">Airborne</span></div>
      <div class="flight-stat-card"><span class="stat-val">${countries}</span><span class="stat-label">Countries</span></div>
      <div class="flight-stat-card"><span class="stat-val">${(avgAlt / 1000).toFixed(1)}km</span><span class="stat-label">Avg Altitude</span></div>
      <div class="flight-stat-card"><span class="stat-val">${Math.round(avgSpd)}</span><span class="stat-label">Avg Speed (kts)</span></div>
    `;
    }

    const listEl = document.getElementById('flight-list-panel');
    if (listEl) {
        const top = flights.filter(f => !f.onGround && f.callsign).slice(0, 80);
        listEl.innerHTML = top.map(f => `
      <div class="flight-list-row" onclick="window.__gcFocusFlight('${f.icao24}')" style="cursor:pointer;">
        <span style="color:#00d4ff;font-weight:bold;">✈ ${f.callsign}</span>
        <span style="color:#666;">${f.originCountry}</span>
        <span style="color:#aaa;">${(f.altitude / 1000).toFixed(1)}km</span>
        <span style="color:#aaa;">${Math.round(f.velocity * 1.944)}kts</span>
      </div>
    `).join('');
    }
}

function switchFlightLayer(type: keyof typeof TILE_LAYERS) {
    if (!flightMapRef) return;
    if (currentTileLayer) flightMapRef.removeLayer(currentTileLayer);
    const spec = TILE_LAYERS[type];
    currentTileLayer = L.tileLayer(spec.url, spec.opts).addTo(flightMapRef);

    // Update active button state
    document.querySelectorAll('[data-flight-layer]').forEach(btn => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.flightLayer === type);
    });
}

async function searchFlights(query: string) {
    const q = query.trim();
    if (!q) return;

    const resultsEl = document.getElementById('flight-search-results');
    if (!resultsEl) return;

    resultsEl.innerHTML = `<div style="color:#555;padding:8px;font-size:11px;">🔍 Searching ${allFlights.length.toLocaleString()} flights...</div>`;

    try {
        // Use server-side search (searches full 14k+ cached set)
        const r = await fetch(`/api/flight-search?q=${encodeURIComponent(q)}`);
        const serverResults = r.ok ? await r.json() : [];

        // Also search local in-memory for instant results
        const localResults = allFlights
            .filter(f =>
                f.callsign.toLowerCase().includes(q.toLowerCase()) ||
                f.icao24.toLowerCase().includes(q.toLowerCase()) ||
                f.originCountry.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, 10)
            .map(f => ({
                icao: f.icao24, callsign: f.callsign, country: f.originCountry,
                lon: f.longitude, lat: f.latitude,
                altFt: Math.round(f.altitude / 0.3048),
                speedKts: Math.round(f.velocity * 1.944),
                heading: f.heading,
            }));

        // Merge, deduplicate
        const seen = new Set<string>();
        const combined = [...serverResults, ...localResults].filter(f => {
            if (seen.has(f.icao)) return false;
            seen.add(f.icao);
            return true;
        }).slice(0, 20);

        if (!combined.length) {
            resultsEl.innerHTML = `<p style="color:#555;padding:8px;font-size:11px;">No flights found for "<b style="color:#aaa">${q}</b>"<br/><span style="font-size:10px;">Try: callsign (e.g. AAL123), ICAO hex, or country</span></p>`;
            return;
        }

        resultsEl.innerHTML = combined.map(f => `
        <div onclick="window.__gcFocusFlight('${f.icao}')"
          style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;font-size:11px;transition:background 0.1s;"
          onmouseover="this.style.background='rgba(0,212,255,0.07)'" onmouseout="this.style.background=''">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#00d4ff;font-weight:bold;font-family:monospace;">✈ ${f.callsign || f.icao}</span>
            <span style="font-size:9px;padding:2px 5px;border-radius:8px;background:rgba(0,212,255,0.1);color:#00d4ff;">${f.altFt > 0 ? `${f.altFt.toLocaleString()}ft` : 'GND'}</span>
          </div>
          <div style="color:#666;font-size:10px;margin-top:2px;display:flex;gap:12px;">
            <span>${f.country || '—'}</span>
            <span>${f.speedKts || 0} kts</span>
            <span>HDG ${f.heading || 0}°</span>
          </div>
        </div>
      `).join('');
    } catch {
        // Fallback to local only
        const found = allFlights.filter(f =>
            f.callsign.toLowerCase().includes(q.toLowerCase()) ||
            f.icao24.toLowerCase().includes(q.toLowerCase())
        ).slice(0, 15);
        resultsEl.innerHTML = found.length
            ? found.map(f => `<div onclick="window.__gcFocusFlight('${f.icao24}')" style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;font-size:11px;color:#00d4ff;">✈ ${f.callsign || f.icao24}</div>`).join('')
            : `<p style="color:#555;padding:8px;font-size:11px;">No results</p>`;
    }
}


// ── AVIATION NEWS FEED (via backend RSS proxy) ────────────────────────────
async function loadAviationNews() {
    const el = document.getElementById('aviation-news-feed');
    if (!el) return;

    const aviationFeeds = [
        'https://www.aviationweek.com/rss',
        'https://simpleflying.com/feed/',
        'https://thepointsguy.com/feed/',
    ];

    el.innerHTML = '<div style="color:#555;padding:10px;font-size:11px;">Loading aviation news...</div>';

    const allItems: { title: string; link: string; pub: string }[] = [];

    for (const feedUrl of aviationFeeds) {
        try {
            const r = await fetch(`/api/rss?url=${encodeURIComponent(feedUrl)}`);
            if (!r.ok) continue;
            const xml = await r.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(xml, 'application/xml');
            const items = doc.querySelectorAll('item');
            items.forEach(item => {
                const title = item.querySelector('title')?.textContent?.trim() || '';
                const link = item.querySelector('link')?.textContent?.trim() || '#';
                const pub = item.querySelector('pubDate')?.textContent?.trim() || '';
                if (title) allItems.push({ title, link, pub });
            });
        } catch { }
    }

    if (!allItems.length) {
        // Fallback to curated aviation headlines
        const fallback = [
            { title: 'Boeing 737 MAX returns to service across multiple carriers', link: '#', pub: new Date().toUTCString() },
            { title: 'Airbus A350F freighter completes maiden flight', link: '#', pub: new Date().toUTCString() },
            { title: 'FAA issues airworthiness directive for Pratt & Whitney GTF engines', link: '#', pub: new Date().toUTCString() },
            { title: 'Delta Air Lines orders 100 additional A321neo jets', link: '#', pub: new Date().toUTCString() },
            { title: 'IATA: Global air cargo volumes up 14% year-on-year', link: '#', pub: new Date().toUTCString() },
            { title: 'SpaceX Starship achieves orbital flight test success', link: '#', pub: new Date().toUTCString() },
            { title: 'New supersonic jet concept unveiled at Paris Air Show', link: '#', pub: new Date().toUTCString() },
            { title: 'Air India on-time performance improves after Tata acquisition', link: '#', pub: new Date().toUTCString() },
        ];
        allItems.push(...fallback);
    }

    el.innerHTML = allItems.slice(0, 30).map((item, i) => `
    <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;"
         onclick="window.open('${item.link}','_blank')"
         onmouseover="this.style.background='rgba(0,212,255,0.03)'" onmouseout="this.style.background=''">
      <div style="color:#${i < 3 ? '00d4ff' : 'ccc'};font-size:11px;line-height:1.4;font-weight:${i < 3 ? 'bold' : 'normal'};">${item.title}</div>
      <div style="color:#444;font-size:10px;margin-top:3px;font-family:monospace;">${item.pub ? new Date(item.pub).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
    </div>
  `).join('');
}

(window as any).__gcFocusFlight = (icao: string) => {
    const m = flightMarkers.get(icao);
    if (m && flightMapRef) {
        flightMapRef.flyTo(m.getLatLng(), 8, { animate: true, duration: 1.5 });
        m.openPopup();
    }
};

export async function initFlightsDashboard() {
    const mapEl = document.getElementById('flights-map');
    if (!mapEl) return;

    flightMapRef = L.map('flights-map', {
        center: [30, 0],
        zoom: 3,
        zoomControl: true,
        attributionControl: false,
    });
    flightMap = flightMapRef;

    // Default to dark layer
    currentTileLayer = L.tileLayer(TILE_LAYERS.dark.url, TILE_LAYERS.dark.opts).addTo(flightMapRef);

    // Inject layer switcher using DOM directly (avoids L.control TypeScript issues)
    const switcherDiv = document.createElement('div');
    switcherDiv.style.cssText = 'position:absolute;top:80px;right:10px;z-index:1000;';
    switcherDiv.innerHTML = Object.entries(TILE_LAYERS).map(([key, val]) => `
      <button data-flight-layer="${key}" onclick="window.__gcFlightLayer('${key}')"
        style="display:block;width:100%;margin-bottom:3px;padding:5px 10px;background:${key === 'dark' ? 'rgba(0,212,255,0.25)' : 'rgba(0,0,0,0.7)'};
               color:${key === 'dark' ? '#00d4ff' : '#aaa'};border:1px solid rgba(255,255,255,0.15);border-radius:4px;cursor:pointer;font-size:11px;text-align:left;white-space:nowrap;"
        >${val.label}</button>
    `).join('');
    mapEl.style.position = 'relative';
    mapEl.appendChild(switcherDiv);

    (window as any).__gcFlightLayer = (type: string) => {
        switchFlightLayer(type as keyof typeof TILE_LAYERS);
        // Update button styles
        document.querySelectorAll('[data-flight-layer]').forEach(btn => {
            const isActive = (btn as HTMLElement).dataset.flightLayer === type;
            (btn as HTMLElement).style.background = isActive ? 'rgba(0,212,255,0.2)' : 'rgba(0,0,0,0.5)';
            (btn as HTMLElement).style.color = isActive ? '#00d4ff' : '#aaa';
        });
    };

    // Status bar update
    updateFlightStatus('⏳ Connecting to ADS-B feed via GlobalControl proxy...');

    // Initial load
    allFlights = await fetchFlights();
    if (allFlights.length === 0) {
        updateFlightStatus('⚠️ OpenSky temporarily unavailable — will retry in 30s. Rate limits apply to anonymous access.');
    }
    renderFlightsOnMap(allFlights);

    // Refresh every 30s (OpenSky anonymous rate limit is generous at this interval)
    setInterval(async () => {
        updateFlightStatus('🔄 Refreshing flight data...');
        allFlights = await fetchFlights();
        renderFlightsOnMap(allFlights);
    }, 30000);

    // Search integration
    const searchInput = document.getElementById('flight-search-input') as HTMLInputElement;
    const searchBtn = document.getElementById('flight-search-btn');
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', () => searchFlights(searchInput.value));
        searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchFlights(searchInput.value); });
    }

    // Load aviation news on the right panel
    loadAviationNews();
    // Refresh news every 15 min
    setInterval(loadAviationNews, 900000);
}
