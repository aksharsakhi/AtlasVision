// ============================================
// SIGINT & Cyber Dashboard — Merged Intelligence + Cyber
// Live Signals, Threat Map, CVE feed, Cyber News RSS
// ============================================
import * as L from 'leaflet';
import { queryLocation } from '../engines/query-engine';

export let intelCyberMap: L.Map | null = null;
let intelCyberTileLayer: L.TileLayer | null = null;

const TILE_LAYERS = {
    dark: { label: '🌑 Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
    satellite: { label: '🛰️ Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    terrain: { label: '🏔️ Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
};

const APT_ACTORS = [
    { name: 'APT28 (Fancy Bear — RUS)', coords: [55.75, 37.61], color: '#ff1744' },
    { name: 'Lazarus Group (PRK)', coords: [39.03, 125.75], color: '#ff9100' },
    { name: 'Sandworm (GRU/RUS)', coords: [59.93, 30.31], color: '#ff1744' },
    { name: 'Volt Typhoon (CHN)', coords: [39.90, 116.40], color: '#ff9100' },
    { name: 'Equation Group (NSA)', coords: [38.89, -77.03], color: '#00e676' },
    { name: 'APT41 (CHN)', coords: [31.22, 121.46], color: '#ff9100' },
    { name: 'Charming Kitten (IRN)', coords: [35.68, 51.42], color: '#ffd740' },
    { name: 'Scattered Spider (INT)', coords: [51.50, -0.12], color: '#e040fb' },
    { name: 'BlackCat/ALPHV (INT)', coords: [50.06, 19.93], color: '#e040fb' },
];

const TARGETS = [
    { name: 'SWIFT Gateway (BE)', coords: [50.85, 4.35] },
    { name: 'DoD Network (US)', coords: [38.90, -77.03] },
    { name: 'TSMC Fab (TW)', coords: [25.03, 121.56] },
    { name: 'Nuclear Plant (IN)', coords: [19.07, 72.87] },
    { name: 'MOD Network (UK)', coords: [51.50, -0.12] },
    { name: 'Telecom Core (KR)', coords: [37.56, 126.97] },
    { name: 'Power Grid (UA)', coords: [50.45, 30.52] },
    { name: 'Satellite Ops (FR)', coords: [48.85, 2.35] },
    { name: 'Industrial SCADA (DE)', coords: [52.52, 13.40] },
];

const CVE_FEED = [
    { cve: 'CVE-2025-21333', desc: 'Windows Hyper-V Heap Overflow RCE', cvss: 9.8, wild: true },
    { cve: 'CVE-2025-0282', desc: 'Ivanti Connect Secure Stack Overflow', cvss: 9.0, wild: true },
    { cve: 'CVE-2024-55591', desc: 'Fortinet FortiOS Auth Bypass', cvss: 9.6, wild: true },
    { cve: 'CVE-2024-49113', desc: 'Windows LDAP RCE Zero-Click', cvss: 9.8, wild: true },
    { cve: 'CVE-2024-38112', desc: 'Windows MSHTML Platform Spoofing', cvss: 7.5, wild: true },
    { cve: 'CVE-2024-21413', desc: 'Microsoft Outlook RCE via MAPI', cvss: 9.8, wild: false },
    { cve: 'CVE-2024-3400', desc: 'PAN-OS GlobalProtect Command Injection', cvss: 10.0, wild: true },
    { cve: 'CVE-2023-46805', desc: 'Ivanti Policy Bypass Auth (Pulse)', cvss: 8.2, wild: true },
];

// ─── Intel Query Engine Integration ─────────────────────────────────────────
function initQueryPanel() {
    const input = document.getElementById('icyber-query-input') as HTMLInputElement;
    const btn = document.getElementById('icyber-query-btn');
    const output = document.getElementById('icyber-query-output');
    if (!input || !btn || !output) return;

    const exec = () => {
        const q = input.value.trim();
        if (!q) return;
        const result = queryLocation(q);
        if (!result) {
            output.innerHTML = `<div style="color:#ff5252;padding:10px;font-size:12px;">❌ Location not found: "${q}"<br/><span style="color:#555">Try: Mumbai, LAC, Strait of Malacca, South China Sea...</span></div>`;
            return;
        }
        const events = result.detected_events || [];
        output.innerHTML = `
      <div style="padding:10px;font-size:11px;">
        <div style="color:#00d4ff;font-size:14px;font-weight:bold;margin-bottom:8px;">📍 ${result.location}</div>
        <div style="color:#aaa;margin-bottom:6px;line-height:1.5;">${result.summary || ''}</div>
        <div style="color:#666;margin-bottom:4px;font-size:10px;">Risk: <span style="color:#ff9100;font-weight:bold;">${result.risk_category} (${result.risk_score}/100)</span></div>
        ${events.map((e: any) => `
          <div style="border-left:2px solid #ff9100;padding-left:8px;margin-bottom:4px;color:#ddd;font-size:10px;">${e.type}: ${e.description}</div>
        `).join('')}
      </div>`;
    };
    btn.addEventListener('click', exec);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') exec(); });
}

// ─── Cyber News RSS Feed ─────────────────────────────────────────────────────
async function loadCyberNews() {
    const el = document.getElementById('icyber-news-feed');
    if (!el) return;
    el.innerHTML = '<div style="color:#555;padding:10px;font-size:11px;">Loading cyber feeds...</div>';

    const feeds = [
        'https://feeds.feedburner.com/TheHackersNews',
        'https://www.bleepingcomputer.com/feed/',
        'https://krebsonsecurity.com/feed/',
        'https://threatpost.com/feed/',
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

    // Fallback headlines
    if (!items.length) {
        [
            { title: 'Salt Typhoon compromised 9 US telcos in ongoing espionage campaign', link: '#', pub: '' },
            { title: 'CISA Emergency Directive: Patch Ivanti CVE-2025-0282 immediately', link: '#', pub: '' },
            { title: 'LockBit 4.0 ransomware group resurfaces with new infrastructure', link: '#', pub: '' },
            { title: 'NSA advisory: North Korean IT workers infiltrating Fortune 500 firms', link: '#', pub: '' },
            { title: 'ALPHV/BlackCat: $22M Change Healthcare ransom paid — data still leaked', link: '#', pub: '' },
            { title: 'Zero-click iOS kernel exploit chains fetching $2.5M on gray market', link: '#', pub: '' },
            { title: 'FBI disrupts PlugX malware C2 infrastructure used by Chinese APTs', link: '#', pub: '' },
        ].forEach(i => items.push(i));
    }

    el.innerHTML = items.slice(0, 30).map((item, i) => `
    <div style="padding:10px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;"
         onclick="window.open('${item.link}','_blank')"
         onmouseover="this.style.background='rgba(123,97,255,0.06)'" onmouseout="this.style.background=''">
      <div style="color:${i < 3 ? '#e040fb' : '#ccc'};font-size:11px;line-height:1.4;font-weight:${i < 3 ? 'bold' : 'normal'};">${item.title}</div>
      ${item.pub ? `<div style="color:#444;font-size:10px;font-family:monospace;margin-top:2px;">${new Date(item.pub).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
    </div>
  `).join('');
}

// ─── SIGINT Signals Feed ─────────────────────────────────────────────────────
function initSigintFeed() {
    const el = document.getElementById('icyber-sigint-feed');
    if (!el) return;
    const bands = ['HF', 'VHF', 'UHF', 'SHF', 'EHF', 'L-Band', 'X-Band', 'Ka-Band'];
    const enc = ['AES-256-GCM', 'RSA-4096', 'UNKNOWN_CIPHER', 'ChaCha20', 'UNENCRYPTED'];
    const orgs = ['GRU-Signals', 'PLA-SIGINT', 'NSA-TAO', 'GCHQ-JTRIG', 'UNKNOWN'];

    let html = '';
    const gen = () => {
        const lat = (Math.random() * 140 - 70).toFixed(3);
        const lon = (Math.random() * 360 - 180).toFixed(3);
        const freq = (80 + Math.random() * 1000).toFixed(2);
        const sig = (-80 + Math.random() * 40).toFixed(1);
        const isAnomaly = Math.random() > 0.7;
        html = `
      <div style="padding:6px;border-left:2px solid ${isAnomaly ? '#ff1744' : '#7b61ff'};margin-bottom:5px;background:rgba(0,0,0,0.3);font-size:10px;font-family:monospace;">
        <span style="color:${isAnomaly ? '#ff1744' : '#7b61ff'};font-weight:bold;">${isAnomaly ? '⚡ ANOMALY' : '📡 INTERCEPT'}</span>
        <span style="color:#555;float:right;">${new Date().toISOString().substring(11, 19)}Z</span><br/>
        <span style="color:#aaa;">Pos: ${lat}N ${lon}E | ${bands[Math.floor(Math.random() * bands.length)]} | ${freq} MHz</span><br/>
        <span style="color:#777;">Sig: ${sig} dBm | Enc: ${enc[Math.floor(Math.random() * enc.length)]} | Src: ${orgs[Math.floor(Math.random() * orgs.length)]}</span>
      </div>
    ` + html.split('</div>').slice(0, 20).join('</div>') + (html ? '</div>' : '');
        el.innerHTML = `<div>${html}</div>`;
    };
    gen();
    setInterval(gen, 3200);
}

// ─── Global Risk Heatmap (colored markers) ───────────────────────────────────
function initRiskHeatmap() {
    const riskZones = [
        { name: 'Eastern Ukraine', lat: 49.0, lon: 37.5, risk: 10 },
        { name: 'Gaza / Israel', lat: 31.3, lon: 34.4, risk: 10 },
        { name: 'South China Sea', lat: 14.0, lon: 114.0, risk: 8 },
        { name: 'Red Sea / Yemen', lat: 14.0, lon: 42.0, risk: 9 },
        { name: 'Korean Peninsula', lat: 38.0, lon: 127.0, risk: 7 },
        { name: 'Taiwan Strait', lat: 24.5, lon: 120.5, risk: 8 },
        { name: 'Sahel Region', lat: 15.0, lon: 0.0, risk: 7 },
        { name: 'Myanmar', lat: 19.0, lon: 96.0, risk: 6 },
        { name: 'Iran-Iraq Border', lat: 33.0, lon: 45.0, risk: 6 },
        { name: 'Kashmir (LAC)', lat: 34.0, lon: 76.0, risk: 7 },
        { name: 'Ethiopia (Tigray)', lat: 14.0, lon: 39.0, risk: 6 },
        { name: 'Sudan Civil War', lat: 15.0, lon: 30.0, risk: 8 },
    ];

    const riskEl = document.getElementById('icyber-risk-heatmap');
    if (riskEl) {
        riskEl.innerHTML = riskZones.map(z => {
            const pct = z.risk * 10;
            const clr = z.risk >= 9 ? '#ff1744' : z.risk >= 7 ? '#ff9100' : '#ffd740';
            return `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:10px;">
          <span style="color:#aaa;width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${z.name}</span>
          <div style="flex:1;height:8px;background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${clr};border-radius:4px;"></div>
          </div>
          <span style="color:${clr};font-weight:bold;width:20px;">${z.risk}</span>
        </div>
      `;
        }).join('');
    }

    if (!intelCyberMap) return;
    riskZones.forEach(z => {
        const clr = z.risk >= 9 ? '#ff1744' : z.risk >= 7 ? '#ff9100' : '#ffd740';
        L.circleMarker([z.lat, z.lon], {
            radius: 6 + z.risk, color: clr, fillColor: clr, fillOpacity: 0.3, weight: 2,
        }).addTo(intelCyberMap!).bindPopup(`<b style="color:${clr}">${z.name}</b><br/>Risk: ${z.risk}/10`);
    });
}

// ─── Active Intrusion Visualization ─────────────────────────────────────────
function initIntrusionViz() {
    const el = document.getElementById('icyber-intrusions-feed');
    if (!el) return;

    let html = '';
    const gen = () => {
        const actor = APT_ACTORS[Math.floor(Math.random() * APT_ACTORS.length)];
        const target = TARGETS[Math.floor(Math.random() * TARGETS.length)];
        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const methods = ['SQL Injection', 'Spear Phishing', 'Supply Chain', 'Zero-Day Exploit', 'Credential Stuffing', 'MITM'];
        const method = methods[Math.floor(Math.random() * methods.length)];

        // Draw on map
        if (intelCyberMap) {
            const line = L.polyline([actor.coords as [number, number], [target.coords[0], target.coords[1]] as [number, number]], {
                color: actor.color, weight: 1, opacity: 0.7, dashArray: '4,3'
            }).addTo(intelCyberMap);
            const pulse = L.circleMarker([target.coords[0], target.coords[1]], {
                radius: 8, color: actor.color, fillColor: actor.color, fillOpacity: 0.5, weight: 0
            }).addTo(intelCyberMap);
            setTimeout(() => { intelCyberMap?.removeLayer(line); intelCyberMap?.removeLayer(pulse); }, 4000);
        }

        html = `
      <div style="padding:6px;border-left:2px solid ${actor.color};margin-bottom:5px;background:rgba(0,0,0,0.4);font-size:10px;">
        <div style="color:${actor.color};font-weight:bold;">[INTRUSION] ${new Date().toISOString().substring(11, 19)}Z</div>
        <div style="color:#ccc;">Actor: ${actor.name}</div>
        <div style="color:#ccc;">Target: ${target.name} | IP: ${ip}</div>
        <div style="color:#888;">Method: ${method}</div>
      </div>
    ` + html.split('</div>').slice(0, 30).join('</div>') + (html ? '</div>' : '');
        el.innerHTML = `<div>${html}</div>`;
    };
    gen();
    setInterval(gen, 4500);
}

// ─── CVE Feed ────────────────────────────────────────────────────────────────
function initCVEFeed() {
    const el = document.getElementById('icyber-cve-feed');
    if (!el) return;
    el.innerHTML = CVE_FEED.map(c => {
        const clr = c.cvss >= 9 ? '#ff1744' : c.cvss >= 7 ? '#ff9100' : '#ffd740';
        return `
      <div style="margin-bottom:8px;border:1px solid rgba(255,255,255,0.05);padding:8px;background:rgba(0,0,0,0.35);border-radius:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:${clr};font-weight:bold;font-family:monospace;">${c.cve}</span>
          <span style="font-size:9px;padding:2px 6px;border-radius:10px;background:rgba(0,0,0,0.4);color:${clr};">CVSS ${c.cvss}</span>
        </div>
        <div style="color:#aaa;font-size:10px;margin-top:3px;">${c.desc}</div>
        <div style="color:${c.wild ? '#ff1744' : '#555'};font-size:9px;margin-top:2px;">${c.wild ? '⚡ EXPLOITED IN WILD' : '📋 Not yet exploited'}</div>
      </div>
    `;
    }).join('');
}

export function initIntelCyberBoard() {
    // Initialize the merged map
    const mapEl = document.getElementById('icyber-map');
    if (!mapEl) return;

    intelCyberMap = L.map('icyber-map', {
        center: [25, 30], zoom: 2, zoomControl: true, attributionControl: false,
    });

    intelCyberTileLayer = L.tileLayer(TILE_LAYERS.dark.url, { maxZoom: 19 }).addTo(intelCyberMap);

    // Layer switcher
    const sw = document.createElement('div');
    sw.style.cssText = 'position:absolute;top:80px;right:10px;z-index:1100;';
    sw.innerHTML = Object.entries(TILE_LAYERS).map(([key, val]) => `
    <button data-icyber-layer="${key}" onclick="window.__gcICyberLayer('${key}')"
      style="display:block;width:100%;margin-bottom:3px;padding:5px 10px;
             background:${key === 'dark' ? 'rgba(123,97,255,0.25)' : 'rgba(0,0,0,0.7)'};
             color:${key === 'dark' ? '#e040fb' : '#aaa'};border:1px solid rgba(255,255,255,0.15);
             border-radius:4px;cursor:pointer;font-size:11px;white-space:nowrap;">${val.label}</button>
  `).join('');
    mapEl.style.position = 'relative';
    mapEl.appendChild(sw);

    (window as any).__gcICyberLayer = (type: string) => {
        if (!intelCyberMap || !intelCyberTileLayer) return;
        intelCyberMap.removeLayer(intelCyberTileLayer);
        const spec = TILE_LAYERS[type as keyof typeof TILE_LAYERS];
        intelCyberTileLayer = L.tileLayer(spec.url, { maxZoom: 19 }).addTo(intelCyberMap);
        document.querySelectorAll('[data-icyber-layer]').forEach(btn => {
            const el = btn as HTMLElement;
            const a = el.dataset.icyberLayer === type;
            el.style.background = a ? 'rgba(123,97,255,0.25)' : 'rgba(0,0,0,0.7)';
            el.style.color = a ? '#e040fb' : '#aaa';
        });
    };

    // Plot APT actor nodes on map
    APT_ACTORS.forEach(a => {
        L.circleMarker(a.coords as [number, number], {
            radius: 5, color: a.color, fillColor: a.color, fillOpacity: 0.7, weight: 2,
        }).addTo(intelCyberMap!).bindPopup(`<b style="color:${a.color}">🔴 ${a.name}</b><br/>Active Threat Actor`);
    });

    initRiskHeatmap();
    initIntrusionViz();
    initSigintFeed();
    initCVEFeed();
    initQueryPanel();
    loadCyberNews();
    setInterval(loadCyberNews, 900000);
}
