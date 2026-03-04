import * as L from 'leaflet';

export let cyberMap: L.Map | null = null;

export function initCyberBoard() {
    const newsList = document.getElementById('cyber-news-list');
    const threatsList = document.getElementById('cyber-threats-list-v2');
    const exploitsList = document.getElementById('cyber-exploits-list');
    const mapEl = document.getElementById('cyber-map');

    // 1. Initialize Cyber Map
    if (mapEl) {
        cyberMap = L.map('cyber-map', {
            center: [30, 0],
            zoom: 2,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(cyberMap);

        // Initial Threat Nodes
        const serverNodes = [
            { name: 'US-EAST', coords: [37.77, -122.41] },
            { name: 'US-WEST', coords: [38.90, -77.03] },
            { name: 'EU-CENTRAL', coords: [50.11, 8.68] },
            { name: 'AP-NORTHEAST', coords: [35.67, 139.65] },
            { name: 'AP-SOUTHEAST', coords: [1.35, 103.81] },
            { name: 'ME-SOUTH', coords: [25.20, 55.27] }
        ];

        serverNodes.forEach(n => {
            L.circleMarker([n.coords[0], n.coords[1]], {
                radius: 4,
                color: '#00d4ff',
                fillColor: '#00d4ff',
                fillOpacity: 0.6
            }).addTo(cyberMap!).bindPopup(n.name);
        });
    }

    // 2. Active Intrusions Simulation
    if (threatsList) {
        const actors = [
            { name: 'APT28 (Fancy Bear)', coords: [55.75, 37.61] },
            { name: 'Lazarus Group', coords: [39.03, 125.75] },
            { name: 'Sandworm', coords: [59.93, 30.31] },
            { name: 'Volt Typhoon', coords: [39.90, 116.40] },
            { name: 'Equation Group', coords: [39.10, -76.77] },
            { name: 'DarkSide', coords: [47.01, 28.86] },
            { name: 'Anonymous', coords: [0, 0] }
        ];

        const targets = [
            { name: 'SWIFT Gateway (EU)', coords: [50.85, 4.35] },
            { name: 'DoD Contractor (US)', coords: [38.90, -77.03] },
            { name: 'TSMC Infra (TW)', coords: [25.03, 121.56] },
            { name: 'Nuclear Corp (IN)', coords: [19.07, 72.87] },
            { name: 'Ministry of Def (UK)', coords: [51.50, -0.12] },
            { name: 'Telecom Backbone (KR)', coords: [37.56, 126.97] }
        ];

        let tHtml = '';
        const generateIntrusion = () => {
            const actor = actors[Math.floor(Math.random() * actors.length)];
            const target = targets[Math.floor(Math.random() * targets.length)];
            const ips = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

            if (cyberMap && actor.coords[0] !== 0) {
                const line = L.polyline([[actor.coords[0], actor.coords[1]], [target.coords[0], target.coords[1]]], {
                    color: '#ff1744', weight: 1.5, opacity: 0.7, dashArray: '4,4'
                }).addTo(cyberMap);

                const targetPulse = L.circleMarker([target.coords[0], target.coords[1]], {
                    radius: 10, color: '#ff1744', fillColor: '#ff1744', fillOpacity: 0.8, weight: 0
                }).addTo(cyberMap);

                setTimeout(() => {
                    if (cyberMap) {
                        cyberMap.removeLayer(line);
                        cyberMap.removeLayer(targetPulse);
                    }
                }, 3000);
            }

            return `
          <div style="border-left: 2px solid #ff1744; padding-left: 8px; margin-bottom: 8px; font-size: 10px; background: rgba(0,0,0,0.3); padding: 6px;">
             <div style="color: #ff1744; font-weight: bold; margin-bottom:4px;">[INTRUSION ATTEMPT] — ${new Date().toISOString().substring(11, 19)}Z</div>
             <div style="color: #ccc;">Vector: <span style="color:#00e676">${ips}</span></div>
             <div style="color: #ccc;">Attribution: ${actor.name}</div>
             <div style="color: #ccc;">Target: ${target.name}</div>
          </div>
          `;
        };

        for (let i = 0; i < 5; i++) {
            tHtml += generateIntrusion();
        }
        threatsList.innerHTML = `<div style="display:flex; flex-direction:column; gap:4px;">${tHtml}</div>`;

        setInterval(() => {
            tHtml = generateIntrusion() + tHtml.split('</div></div>').slice(0, 16).join('</div></div>') + (tHtml.endsWith('</div></div>') ? '' : '</div></div>');
            threatsList.innerHTML = `<div style="display:flex; flex-direction:column; gap:4px;">${tHtml}</div>`;
        }, 4500);
    }

    // 3. Known Exploits (Simulated Feed)
    if (exploitsList) {
        const exploits = [
            { cve: 'CVE-2024-21415', desc: 'Windows Kernel Privilege Escalation', risk: 'CRITICAL' },
            { cve: 'CVE-2024-19283', desc: 'V8 Type Confusion in Chrome', risk: 'HIGH' },
            { cve: 'CVE-2023-44487', desc: 'HTTP/2 Rapid Reset DDOS', risk: 'CRITICAL' },
            { cve: 'CVE-2024-38012', desc: 'Exchange Server RCE Zero-Click', risk: 'CRITICAL' },
            { cve: 'CVE-2024-21111', desc: 'Oracle WebLogic Auth Bypass', risk: 'HIGH' },
            { cve: 'CVE-2023-4863', desc: 'libwebp Heap Buffer Overflow', risk: 'HIGH' }
        ];

        let expHtml = '';
        exploits.forEach(exp => {
            const color = exp.risk === 'CRITICAL' ? '#ff1744' : '#ff9100';
            expHtml += `
            <div style="margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); padding: 8px; background: rgba(0,0,0,0.4);">
                <div style="color: ${color}; font-weight:bold;">${exp.cve} [${exp.risk}]</div>
                <div style="color: #aaa;">${exp.desc}</div>
                <div style="color: #666; margin-top:2px;">Status: EXPLOITED IN WILD</div>
            </div>
          `;
        });
        exploitsList.innerHTML = expHtml;
    }

    // 4. Dark Web / Cyber News
    if (newsList) {
        const news = [
            '[INTEL] 2.4TB of defense contractor data dumped on BreachForums.',
            '[ALERT] TrickBot operator arrested in multinational sting operation.',
            '[DARK WEB] Zero-day exploit for iOS 17.4 listed for $2.5M.',
            '[NEWS] CISA issues emergency directive on Ivanti VPN vulnerabilities.',
            '[CHATTER] Hacktivist collective calls for massive DDOS on SWIFT infrastructure.',
            '[INTEL] LockBit ransomware claims breach of major US hospital network.',
            '[ALERT] N-day vulnerability actively exploited in unpatched firewalls globally.',
            '[NEWS] Major crypto exchange halted: $40M drained in hot wallet exploit.'
        ];

        let nHtml = '';
        news.forEach((n, idx) => {
            nHtml += `
            <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: monospace; font-size: 11px;">
                <span style="color:#7b61ff;">[${new Date(Date.now() - idx * 3600000).toISOString().substring(11, 16)}]</span> 
                <span style="color:#d4d4d4;">${n}</span>
            </div>
          `;
        });
        newsList.innerHTML = nHtml;

        setInterval(() => {
            const randomNews = news[Math.floor(Math.random() * news.length)];
            const newEntry = `
            <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: monospace; font-size: 11px; background: rgba(123,97,255,0.1);">
                <span style="color:#7b61ff;">[${new Date().toISOString().substring(11, 16)}]</span> 
                <span style="color:#fff; font-weight:bold;">${randomNews}</span>
            </div>
        `;
            newsList.innerHTML = newEntry + newsList.innerHTML;
            // Limit string size so it doesn't grow forever
            if (newsList.innerHTML.length > 5000) newsList.innerHTML = newsList.innerHTML.substring(0, 5000);
        }, 15000);
    }
}
