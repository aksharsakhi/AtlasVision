// ============================================
// Health Dashboard — Global Health Intelligence
// WHO outbreaks, disease surveillance, pharma news, air quality
// ============================================
import * as L from 'leaflet';

export let healthMap: L.Map | null = null;
let healthTileLayer: L.TileLayer | null = null;

const TILE_LAYERS = {
    dark: { label: '🌑 Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
    satellite: { label: '🛰️ Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    terrain: { label: '🏔️ Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
};

interface OutbreakEvent {
    name: string;
    country: string;
    lat: number;
    lon: number;
    cases: number;
    severity: 'critical' | 'high' | 'moderate' | 'watch';
    type: string;
}

const OUTBREAKS: OutbreakEvent[] = [
    { name: 'Mpox Clade Ib', country: 'Congo DRC', lat: -4.3, lon: 22.5, cases: 18420, severity: 'critical', type: 'Viral' },
    { name: 'Cholera', country: 'Sudan', lat: 15.5, lon: 32.5, cases: 11200, severity: 'critical', type: 'Bacterial' },
    { name: 'Dengue Fever', country: 'Brazil', lat: -15.7, lon: -47.9, cases: 892000, severity: 'high', type: 'Vector-borne' },
    { name: 'HMPV Outbreak', country: 'China', lat: 34.0, lon: 108.0, cases: 45000, severity: 'high', type: 'Viral' },
    { name: 'Ebola (Ongoing)', country: 'Uganda', lat: 1.4, lon: 32.3, cases: 128, severity: 'critical', type: 'Viral Hemorrhagic' },
    { name: 'H5N1 Avian Flu', country: 'USA (Cattle)', lat: 39.0, lon: -100.0, cases: 65, severity: 'high', type: 'Zoonotic' },
    { name: 'Marburg Virus', country: 'Rwanda', lat: -1.9, lon: 29.8, cases: 46, severity: 'critical', type: 'Viral Hemorrhagic' },
    { name: 'Yellow Fever', country: 'Nigeria', lat: 9.0, lon: 8.6, cases: 3200, severity: 'high', type: 'Vector-borne' },
    { name: 'Typhoid Fever', country: 'Pakistan', lat: 30.4, lon: 69.3, cases: 85000, severity: 'moderate', type: 'Bacterial' },
    { name: 'Influenza A', country: 'Global', lat: 0, lon: 0, cases: 2100000, severity: 'watch', type: 'Respiratory' },
    { name: 'Drug-Resistant TB', country: 'India', lat: 20.5, lon: 78.9, cases: 129000, severity: 'high', type: 'Bacterial' },
    { name: 'Chagas Disease', country: 'Bolivia', lat: -16.5, lon: -68.1, cases: 7800, severity: 'moderate', type: 'Parasitic' },
];

const HEALTH_STATS = [
    { label: 'Global Life Expectancy', value: '73.4 yrs', trend: '+0.3', color: '#00e676' },
    { label: 'WHO Alert Level', value: 'WATCH', trend: '', color: '#ffd740' },
    { label: 'Active Outbreaks', value: '12', trend: '+2 this month', color: '#ff9100' },
    { label: 'Global Vaccination Rate', value: '64.7%', trend: '+1.2%', color: '#00d4ff' },
    { label: 'Healthcare Workers Shortage', value: '18M', trend: 'Global deficit', color: '#ff5252' },
    { label: 'AMR Deaths/yr', value: '1.27M', trend: 'Antimicrobial Resistance', color: '#ff1744' },
];

function getSeverityColor(severity: string): string {
    switch (severity) {
        case 'critical': return '#ff1744';
        case 'high': return '#ff9100';
        case 'moderate': return '#ffd740';
        default: return '#00d4ff';
    }
}

function initOutbreakMap() {
    if (!healthMap) return;
    OUTBREAKS.forEach(o => {
        if (o.lat === 0 && o.lon === 0) return;
        const color = getSeverityColor(o.severity);
        const radius = Math.min(30, 6 + Math.log10(o.cases + 1) * 4);
        L.circleMarker([o.lat, o.lon], {
            radius, color, fillColor: color, fillOpacity: 0.4, weight: 2,
        }).addTo(healthMap!).bindPopup(`
      <div style="font-family:Inter,sans-serif;min-width:180px;background:#111;color:#ddd;padding:10px;border-radius:6px;">
        <div style="font-size:14px;font-weight:bold;color:${color};margin-bottom:6px;">${o.name}</div>
        <div style="font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <span style="color:#666">Country</span><span>${o.country}</span>
          <span style="color:#666">Type</span><span>${o.type}</span>
          <span style="color:#666">Cases</span><span style="color:${color}">${o.cases.toLocaleString()}</span>
          <span style="color:#666">Alert</span><span style="color:${color};text-transform:uppercase;font-weight:bold;">${o.severity}</span>
        </div>
      </div>`);
    });
}

function renderOutbreakList() {
    const el = document.getElementById('health-outbreaks-list');
    if (!el) return;
    el.innerHTML = OUTBREAKS.map(o => {
        const color = getSeverityColor(o.severity);
        return `
      <div style="padding:8px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;"
           onclick="window.__gcHealthFocus(${o.lat},${o.lon})"
           onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#ddd;font-size:11px;font-weight:bold;">${o.name}</span>
          <span style="font-size:9px;padding:2px 5px;border-radius:8px;background:rgba(0,0,0,0.4);color:${color};text-transform:uppercase;">${o.severity}</span>
        </div>
        <div style="color:#555;font-size:10px;margin-top:2px;">${o.country} | ${o.type} | ${o.cases.toLocaleString()} cases</div>
      </div>
    `;
    }).join('');
}

function renderHealthStats() {
    const el = document.getElementById('health-global-stats');
    if (!el) return;
    el.innerHTML = HEALTH_STATS.map(s => `
    <div style="padding:10px;border:1px solid rgba(255,255,255,0.06);border-radius:6px;background:rgba(0,0,0,0.3);">
      <div style="font-size:18px;font-weight:bold;color:${s.color};">${s.value}</div>
      <div style="font-size:10px;color:#777;margin-top:2px;">${s.label}</div>
      ${s.trend ? `<div style="font-size:9px;color:#555;margin-top:1px;">${s.trend}</div>` : ''}
    </div>
  `).join('');
}

function renderAMRChart() {
    const el = document.getElementById('health-amr-chart');
    if (!el) return;
    const bugs = [
        { name: 'E. coli (drug-resistant)', pct: 82, color: '#ff1744' },
        { name: 'Klebsiella pneumoniae', pct: 74, color: '#ff5252' },
        { name: 'MRSA', pct: 65, color: '#ff9100' },
        { name: 'Acinetobacter', pct: 78, color: '#ff6d00' },
        { name: 'Pseudomonas aerug.', pct: 61, color: '#ffd740' },
        { name: 'MDR Tuberculosis', pct: 55, color: '#ffa000' },
    ];
    el.innerHTML = bugs.map(b => `
    <div style="margin-bottom:6px;font-size:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span style="color:#aaa;">${b.name}</span>
        <span style="color:${b.color};font-weight:bold;">${b.pct}%</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
        <div style="width:${b.pct}%;height:100%;background:${b.color};border-radius:3px;"></div>
      </div>
    </div>
  `).join('');
}

async function loadHealthNews() {
    const el = document.getElementById('health-news-feed');
    if (!el) return;
    el.innerHTML = '<div style="color:#555;padding:10px;font-size:11px;">Loading health intel...</div>';

    const feeds = [
        'https://www.who.int/rss-feeds/news-english.xml',
        'https://feeds.feedburner.com/sciencehealth',
        'https://www.statnews.com/feed/',
    ];

    const items: { title: string; link: string; pub: string }[] = [];
    for (const url of feeds) {
        try {
            const r = await fetch(`/api/rss?url=${encodeURIComponent(url)}`);
            if (!r.ok) continue;
            const doc = new DOMParser().parseFromString(await r.text(), 'application/xml');
            doc.querySelectorAll('item').forEach(item => {
                const title = item.querySelector('title')?.textContent?.trim() || '';
                const link = item.querySelector('link')?.textContent?.trim() || '#';
                const pub = item.querySelector('pubDate')?.textContent?.trim() || '';
                if (title) items.push({ title, link, pub });
            });
        } catch { }
    }

    if (!items.length) {
        [
            { title: 'WHO declares Mpox Clade Ib a Public Health Emergency of International Concern', link: '#', pub: '' },
            { title: 'H5N1 bird flu: CDC urges monitoring after dairy worker infections in US', link: '#', pub: '' },
            { title: 'China HMPV spike: WHO says no unusual pattern, monitoring continues', link: '#', pub: '' },
            { title: 'Global cholera outbreak: 50 countries affected, 7,000 deaths in Q1', link: '#', pub: '' },
            { title: 'New antibiotic against drug-resistant gonorrhea approved by FDA', link: '#', pub: '' },
            { title: 'GLP-1 drugs: Ozempic shows cardiovascular benefits beyond weight loss', link: '#', pub: '' },
            { title: 'Malaria vaccine rollout reaches 28 African nations with 78% efficacy', link: '#', pub: '' },
            { title: 'WHO: Antimicrobial resistance on track to kill 10M annually by 2050', link: '#', pub: '' },
        ].forEach(i => items.push(i));
    }

    el.innerHTML = items.slice(0, 25).map((item, i) => `
    <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;"
         onclick="window.open('${item.link}','_blank')"
         onmouseover="this.style.background='rgba(0,200,83,0.04)'" onmouseout="this.style.background=''">
      <div style="color:${i < 3 ? '#00e676' : '#ccc'};font-size:11px;line-height:1.4;font-weight:${i < 3 ? 'bold' : 'normal'};">${item.title}</div>
      ${item.pub ? `<div style="color:#444;font-size:10px;font-family:monospace;margin-top:2px;">${new Date(item.pub).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>` : ''}
    </div>
  `).join('');
}

function renderVaccinationProgress() {
    const el = document.getElementById('health-vaccination-bars');
    if (!el) return;
    const vaccines = [
        { name: 'COVID-19 (2+ doses)', pct: 64, color: '#00d4ff' },
        { name: 'Influenza (Seasonal)', pct: 52, color: '#40c4ff' },
        { name: 'Measles (MCV2)', pct: 83, color: '#00e676' },
        { name: 'Polio (3 dose IPV)', pct: 86, color: '#69f0ae' },
        { name: 'HPV (Adolescent)', pct: 44, color: '#7b61ff' },
        { name: 'Mpox (Targeted)', pct: 28, color: '#ffd740' },
    ];
    el.innerHTML = vaccines.map(v => `
    <div style="margin-bottom:7px;font-size:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span style="color:#aaa">${v.name}</span>
        <span style="color:${v.color};font-weight:bold;">${v.pct}%</span>
      </div>
      <div style="height:7px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;">
        <div style="width:${v.pct}%;height:100%;background:${v.color};border-radius:4px;transition:width 1s;"></div>
      </div>
    </div>
  `).join('');
}

(window as any).__gcHealthFocus = (lat: number, lon: number) => {
    if (healthMap && lat !== 0) healthMap.flyTo([lat, lon], 5, { animate: true, duration: 1.5 });
};

export function initHealthDashboard() {
    const mapEl = document.getElementById('health-map');
    if (!mapEl) return;

    healthMap = L.map('health-map', {
        center: [15, 20], zoom: 2, zoomControl: true, attributionControl: false,
    });

    healthTileLayer = L.tileLayer(TILE_LAYERS.dark.url, { maxZoom: 19 }).addTo(healthMap);

    // Layer switcher
    const sw = document.createElement('div');
    sw.style.cssText = 'position:absolute;top:80px;right:10px;z-index:1100;';
    sw.innerHTML = Object.entries(TILE_LAYERS).map(([key, val]) => `
    <button data-health-layer="${key}" onclick="window.__gcHealthLayer('${key}')"
      style="display:block;width:100%;margin-bottom:3px;padding:5px 10px;
             background:${key === 'dark' ? 'rgba(0,200,83,0.2)' : 'rgba(0,0,0,0.7)'};
             color:${key === 'dark' ? '#00e676' : '#aaa'};border:1px solid rgba(255,255,255,0.15);
             border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;">${val.label}</button>
  `).join('');
    mapEl.style.position = 'relative';
    mapEl.appendChild(sw);

    (window as any).__gcHealthLayer = (type: string) => {
        if (!healthMap || !healthTileLayer) return;
        healthMap.removeLayer(healthTileLayer);
        healthTileLayer = L.tileLayer(TILE_LAYERS[type as keyof typeof TILE_LAYERS].url, { maxZoom: 19 }).addTo(healthMap);
        document.querySelectorAll('[data-health-layer]').forEach(btn => {
            const el = btn as HTMLElement;
            const a = el.dataset.healthLayer === type;
            el.style.background = a ? 'rgba(0,200,83,0.2)' : 'rgba(0,0,0,0.7)';
            el.style.color = a ? '#00e676' : '#aaa';
        });
    };

    initOutbreakMap();
    renderOutbreakList();
    renderHealthStats();
    renderAMRChart();
    renderVaccinationProgress();
    loadHealthNews();
    setInterval(loadHealthNews, 900000);
}
