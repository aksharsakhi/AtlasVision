// ============================================
// Map Engine — Leaflet (FREE, no tokens needed)
// Supports flat map + satellite imagery
// ============================================
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let mapInstance: L.Map | null = null;
let layerGroups: Record<string, L.LayerGroup> = {};

const TILE_LAYERS = {
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        maxZoom: 18,
    }),
    terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap',
        maxZoom: 17,
    }),
};

export function initMap(): L.Map {
    const container = document.getElementById('map-container');
    if (!container) throw new Error('Map container not found');

    const map = L.map(container, {
        center: [20, 30],
        zoom: 3,
        zoomControl: false,
        preferCanvas: true, // Better performance for many markers
        worldCopyJump: true,
    });

    // Add dark tiles by default
    TILE_LAYERS.dark.addTo(map);

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Create layer groups for each data type
    layerGroups = {
        flights: L.layerGroup().addTo(map),
        ships: L.layerGroup().addTo(map),
        satellites: L.layerGroup().addTo(map),
        earthquakes: L.layerGroup().addTo(map),
        orbits: L.layerGroup().addTo(map),
        asteroids: L.layerGroup(),
        india: L.layerGroup(),
    };

    mapInstance = map;

    // Set up tile layer switcher
    setupTileSwitcher(map);

    return map;
}

function setupTileSwitcher(map: L.Map) {
    const btns = document.querySelectorAll('.tile-switch-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tile = (btn as HTMLElement).dataset.tile;
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Remove all tile layers
            Object.values(TILE_LAYERS).forEach(t => map.removeLayer(t));

            // Add selected
            if (tile && TILE_LAYERS[tile as keyof typeof TILE_LAYERS]) {
                TILE_LAYERS[tile as keyof typeof TILE_LAYERS].addTo(map);
            }
        });
    });
}

export function getMap(): L.Map | null {
    return mapInstance;
}

export function getLayerGroup(name: string): L.LayerGroup | null {
    return layerGroups[name] || null;
}

export function flyTo(lat: number, lon: number, zoom: number = 5) {
    mapInstance?.flyTo([lat, lon], zoom, { duration: 1.5 });
}

// Region presets
const REGIONS: Record<string, { lat: number; lon: number; zoom: number }> = {
    global: { lat: 20, lon: 30, zoom: 3 },
    americas: { lat: 15, lon: -80, zoom: 4 },
    europe: { lat: 50, lon: 15, zoom: 5 },
    mena: { lat: 28, lon: 45, zoom: 5 },
    asia: { lat: 30, lon: 105, zoom: 4 },
    africa: { lat: 5, lon: 20, zoom: 4 },
    india: { lat: 22, lon: 78, zoom: 5 },
};

export function initRegionPresets() {
    const buttons = document.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const region = btn.dataset.region;
            if (!region || !REGIONS[region]) return;
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const { lat, lon, zoom } = REGIONS[region];
            flyTo(lat, lon, zoom);
        });
    });
}
