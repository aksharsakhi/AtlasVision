// ============================================
// Intelligence Console — Query Interface
// "What is happening near X?" → structured response
// ============================================
import { queryLocation, type IntelligenceResponse } from '../engines/query-engine';
import * as L from 'leaflet';

export let intelMap: L.Map | null = null;

export function initIntelConsole() {
  const input = document.getElementById('intel-query-input') as HTMLInputElement;
  const btn = document.getElementById('intel-query-btn') as HTMLButtonElement;
  const output = document.getElementById('intel-query-output') as HTMLDivElement;
  const sigintFeed = document.getElementById('intel-sigint-feed');

  if (!input || !btn || !output) return;

  function executeQuery() {
    const query = input.value.trim();
    if (!query) return;

    const result = queryLocation(query);
    if (!result) {
      output.innerHTML = `<div class="query-error">
        <p>❌ Could not resolve location: "${query}"</p>
        <p class="text-xs text-muted">Try: Mumbai, LAC, Strait of Malacca, South China Sea, etc.</p>
      </div>`;
      return;
    }

    renderResult(result, output);
  }

  btn.addEventListener('click', executeQuery);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeQuery();
  });

  // SIGINT Simulation
  if (sigintFeed) {
    const bands = ['VHF', 'UHF', 'SHF', 'EHF'];
    const encryption = ['AES-256', 'RSA-4096', 'UNKNOWN_A', 'PROPRIETARY', 'UNENCRYPTED'];

    let sigintHtml = '';
    const genSigint = () => {
      const latFloat = (Math.random() * 180 - 90);
      const lonFloat = (Math.random() * 360 - 180);
      const lat = latFloat.toFixed(4);
      const lon = lonFloat.toFixed(4);
      const freq = (100 + Math.random() * 900).toFixed(2);
      const b = bands[Math.floor(Math.random() * bands.length)];
      const e = encryption[Math.floor(Math.random() * encryption.length)];
      const color = e === 'UNENCRYPTED' ? '#ff9100' : '#00e676';
      const hex = Array.from({ length: 4 }).map(() => Math.floor(Math.random() * 65535).toString(16).padStart(4, '0').toUpperCase()).join('-');

      // Draw SIGINT line on map to a random listening station
      if (intelMap) {
        const lis = [
          [51.5, -0.1], [35.6, 139.6], [39.0, -77.0], [-23.7, 133.7], [13.0, 80.2]
        ];
        const station = lis[Math.floor(Math.random() * lis.length)];

        const line = L.polyline([[latFloat, lonFloat], [station[0], station[1]]], {
          color: color, weight: 1, dashArray: '4,4', opacity: 0.6
        }).addTo(intelMap);

        const marker = L.circleMarker([latFloat, lonFloat], {
          radius: 4, color: color, fillColor: color, fillOpacity: 0.8
        }).addTo(intelMap);

        setTimeout(() => {
          if (intelMap) {
            intelMap.removeLayer(line);
            intelMap.removeLayer(marker);
          }
        }, 1500);
      }

      return `
            <div style="border-bottom: 1px dotted rgba(255,255,255,0.1); padding-bottom: 4px; margin-bottom: 4px;">
               <div style="display:flex; justify-content:space-between; color:#00d4ff;">
                 <span>[${new Date().toISOString().substring(11, 23)}Z] FREQ: ${freq}MHz ${b}</span>
                 <span style="color:${color};">[${e}]</span>
               </div>
               <div style="color:#777;">ORIGIN: ${lat}°N, ${lon}°E</div>
               <div style="color:#555;">PAYLOAD: ${hex}... <span style="color:#ff1744;">[INTERCEPTED]</span></div>
            </div>
            `;
    };

    for (let i = 0; i < 6; i++) sigintHtml += genSigint();
    sigintFeed.innerHTML = sigintHtml;

    setInterval(() => {
      sigintHtml = genSigint() + sigintHtml.split('</div>').slice(0, 24).join('</div>') + '</div>';
      sigintFeed.innerHTML = sigintHtml;
    }, 800);
  }

  // Initialize Map
  const mapEl = document.getElementById('intel-map');
  if (mapEl) {
    intelMap = L.map('intel-map', {
      center: [20, 77], // Center on India roughly
      zoom: 3,
      zoomControl: false,
      attributionControl: false
    });

    // Dark theme map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(intelMap);

    // Add some sample markers for intelligence hotspots
    const intelSpots = [
      { lat: 10.0, lon: 110.0, name: 'South China Sea Patrol' },
      { lat: 34.0, lon: 77.0, name: 'LAC Forward Post' },
      { lat: 26.0, lon: 55.0, name: 'Strait of Hormuz' },
      { lat: 48.0, lon: 38.0, name: 'Eastern Ukraine' }
    ];

    intelSpots.forEach(spot => {
      L.circleMarker([spot.lat, spot.lon], {
        radius: 6,
        color: '#ff1744',
        fillColor: '#ff1744',
        fillOpacity: 0.5
      }).addTo(intelMap!).bindPopup(spot.name);
    });

    // Generate Risk Heatmap Overlay
    const heatmapZones = [
      { c: [48, 38], r: 35, spread: 8 },  // Ukraine
      { c: [31, 34], r: 30, spread: 5 },  // Israel/Gaza
      { c: [16, 114], r: 25, spread: 10 }, // South China Sea
      { c: [15, 42], r: 22, spread: 6 },  // Red Sea
      { c: [38, 127], r: 20, spread: 4 }  // Korea
    ];

    heatmapZones.forEach(zone => {
      // Draw concentric low-opacity circles to simulate heat
      for (let i = 0; i < 4; i++) {
        L.circleMarker([zone.c[0], zone.c[1]], {
          radius: zone.r - (i * (zone.r / 4)),
          color: 'transparent',
          fillColor: '#ff1744',
          fillOpacity: 0.15 + (i * 0.05),
          weight: 0
        }).addTo(intelMap!);
      }
    });
  }
}

function renderResult(r: IntelligenceResponse, container: HTMLElement) {
  const riskColor = r.risk_score >= 80 ? '#ff1744' :
    r.risk_score >= 60 ? '#ff5252' :
      r.risk_score >= 35 ? '#ffab40' : '#69f0ae';

  const stbColor = r.stability_index >= 75 ? '#69f0ae' :
    r.stability_index >= 50 ? '#ffab40' :
      r.stability_index >= 25 ? '#ff5252' : '#ff1744';

  container.innerHTML = `
    <div class="query-result">
      <div class="qr-header">
        <h4>📍 ${r.location}</h4>
        ${r.india_zone ? `<span class="india-badge">🇮🇳 ${r.india_zone}</span>` : ''}
      </div>

      <p class="qr-summary">${r.summary}</p>

      <div class="qr-scores">
        <div class="qr-score-card">
          <span class="qr-score-value" style="color: ${riskColor}">${r.risk_score}</span>
          <span class="qr-score-label">Risk Score</span>
        </div>
        <div class="qr-score-card">
          <span class="qr-score-value">${r.confidence_score}</span>
          <span class="qr-score-label">Confidence</span>
        </div>
        <div class="qr-score-card">
          <span class="qr-score-value" style="color: ${stbColor}">${r.stability_index}</span>
          <span class="qr-score-label">Stability</span>
        </div>
        <div class="qr-score-card">
          <span class="qr-score-value">${r.risk_category}</span>
          <span class="qr-score-label">Category</span>
        </div>
      </div>

      <div class="qr-entities">
        <span>✈️ ${r.entity_count.flights} flights</span>
        <span>🚢 ${r.entity_count.ships} ships</span>
        <span>🛰️ ${r.entity_count.satellites} satellites</span>
      </div>

      <div class="qr-section">
        <h5>📊 Escalation</h5>
        <div class="qr-escalation">
          <span class="esc-level esc-${r.escalation_timeline.level}">${r.escalation_timeline.level.toUpperCase()}</span>
          <span class="esc-trend">Trend: ${r.escalation_timeline.trend}</span>
        </div>
        ${r.escalation_timeline.pattern ? `<p class="qr-pattern">🔁 ${r.escalation_timeline.pattern}</p>` : ''}
        <p class="text-xs text-muted">${r.escalation_timeline.evolution || 'No events recorded.'}</p>
      </div>

      ${r.detected_events.length > 0 ? `
        <div class="qr-section">
          <h5>🚨 Detected Events (${r.detected_events.length})</h5>
          ${r.detected_events.slice(0, 5).map(e => `
            <div class="qr-event">
              <span class="qr-event-type">${e.type}</span>
              <span class="qr-event-sev" style="color: ${e.severity >= 60 ? '#ff5252' : '#ffab40'}">${e.severity}</span>
              <p class="text-xs">${e.description.substring(0, 100)}...</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${r.predicted_events.length > 0 ? `
        <div class="qr-section">
          <h5>🔮 Predicted Events</h5>
          ${r.predicted_events.map(e => `
            <div class="qr-event">
              <span class="qr-event-type">${e.type}</span>
              <span class="qr-event-sev">${e.timeframe}</span>
              <p class="text-xs">${e.description.substring(0, 100)}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="qr-attention">
        <strong>⚡ Recommendation:</strong> ${r.recommended_attention}
      </div>

      <details class="qr-json-toggle">
        <summary>View Raw JSON</summary>
        <pre class="qr-json">${JSON.stringify(r, null, 2)}</pre>
      </details>
    </div>
  `;
}
