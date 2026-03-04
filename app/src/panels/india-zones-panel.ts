// India Strategic Zones Panel — displays all zones with status
import { INDIA_ZONES } from '../engines/india-strategic';

export function initIndiaZonesPanel() {
    const container = document.getElementById('india-zones-list');
    if (!container) return;

    container.innerHTML = INDIA_ZONES.map(zone => {
        const pColor = zone.priority === 'critical' ? '#ff1744' :
            zone.priority === 'high' ? '#ff9800' : '#ffeb3b';
        return `
      <div class="iz-item">
        <div class="iz-header">
          <span class="iz-name">${zone.name}</span>
          <span class="iz-priority" style="color:${pColor}">${zone.priority.toUpperCase()}</span>
        </div>
        <p class="iz-desc">${zone.description}</p>
        <div class="iz-bounds">
          ${zone.bounds[0].toFixed(1)}°N — ${zone.bounds[1].toFixed(1)}°N, ${zone.bounds[2].toFixed(1)}°E — ${zone.bounds[3].toFixed(1)}°E
        </div>
      </div>
    `;
    }).join('');

    // Risk heatmap
    const heatmap = document.getElementById('risk-heatmap');
    if (heatmap) {
        const locations = [
            { name: 'South China Sea', risk: 72, trend: '↑' },
            { name: 'Ukraine', risk: 85, trend: '→' },
            { name: 'LAC (India-China)', risk: 45, trend: '↑' },
            { name: 'LOC (Kashmir)', risk: 52, trend: '→' },
            { name: 'Strait of Hormuz', risk: 58, trend: '↓' },
            { name: 'Taiwan Strait', risk: 65, trend: '↑' },
            { name: 'Red Sea (Houthi)', risk: 78, trend: '→' },
            { name: 'Korean Peninsula', risk: 40, trend: '→' },
        ];
        heatmap.innerHTML = locations.map(l => {
            const color = l.risk >= 75 ? '#ff1744' : l.risk >= 50 ? '#ff9800' : l.risk >= 30 ? '#ffeb3b' : '#69f0ae';
            return `
        <div class="hm-row">
          <span class="hm-name">${l.name}</span>
          <div class="hm-bar-bg"><div class="hm-bar" style="width:${l.risk}%;background:${color};"></div></div>
          <span class="hm-val" style="color:${color}">${l.risk} ${l.trend}</span>
        </div>
      `;
        }).join('');
    }
}
