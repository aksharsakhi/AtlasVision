// ============================================
// Near-Earth Object (Asteroid/Comet) Tracking
// Uses NASA SBDB API (free, no key for basic)
// ============================================
import { EventBus } from '../utils/event-bus';

export interface NearEarthObject {
    id: string;
    name: string;
    nasaUrl: string;
    estimatedDiameter: { min: number; max: number }; // meters
    isHazardous: boolean;
    closeApproachDate: string;
    relativeVelocity: number; // km/s
    missDistance: number; // km
    orbitingBody: string;
}

const NEO_API = 'https://api.nasa.gov/neo/rest/v1/feed';
const API_KEY = 'DEMO_KEY'; // NASA DEMO_KEY works for basic usage

async function fetchNEOs(): Promise<NearEarthObject[]> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const end = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        const url = `${NEO_API}?start_date=${today}&end_date=${end}&api_key=${API_KEY}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`NASA API ${r.status}`);
        const data = await r.json();

        const neos: NearEarthObject[] = [];
        Object.values(data.near_earth_objects || {}).forEach((dayList: any) => {
            (dayList as any[]).forEach(neo => {
                const approach = neo.close_approach_data?.[0];
                neos.push({
                    id: neo.id,
                    name: neo.name,
                    nasaUrl: neo.nasa_jpl_url,
                    estimatedDiameter: {
                        min: neo.estimated_diameter?.meters?.estimated_diameter_min || 0,
                        max: neo.estimated_diameter?.meters?.estimated_diameter_max || 0,
                    },
                    isHazardous: neo.is_potentially_hazardous_asteroid,
                    closeApproachDate: approach?.close_approach_date_full || '',
                    relativeVelocity: parseFloat(approach?.relative_velocity?.kilometers_per_second || '0'),
                    missDistance: parseFloat(approach?.miss_distance?.kilometers || '0'),
                    orbitingBody: approach?.orbiting_body || 'Earth',
                });
            });
        });

        return neos.sort((a, b) => a.missDistance - b.missDistance);
    } catch (err) {
        console.warn('NASA NEO API failed:', err);
        return [];
    }
}

function renderNEOs(neos: NearEarthObject[]) {
    const container = document.getElementById('neo-list');
    if (!container) return;

    const el = document.getElementById('neo-count');
    if (el) el.textContent = neos.length.toString();

    container.innerHTML = neos.slice(0, 30).map(neo => {
        const sizeStr = `${neo.estimatedDiameter.min.toFixed(0)}-${neo.estimatedDiameter.max.toFixed(0)}m`;
        const distStr = neo.missDistance < 1000000
            ? `${(neo.missDistance / 1000).toFixed(0)}K km`
            : `${(neo.missDistance / 1000000).toFixed(1)}M km`;
        const hazardClass = neo.isHazardous ? 'neo-hazard' : 'neo-safe';

        return `
      <div class="neo-item ${hazardClass}" onclick="window.open('${neo.nasaUrl}','_blank')">
        <div class="neo-header">
          <span class="neo-name">${neo.isHazardous ? '⚠️' : '☄️'} ${neo.name}</span>
          <span class="neo-dist">${distStr}</span>
        </div>
        <div class="neo-meta">
          <span>📏 ${sizeStr}</span>
          <span>🚀 ${neo.relativeVelocity.toFixed(1)} km/s</span>
          <span>📅 ${neo.closeApproachDate.split(' ')[0] || 'TBD'}</span>
        </div>
      </div>
    `;
    }).join('');

    EventBus.getInstance().emit('data:neos', { count: neos.length, neos });
}

export async function initNEOTracker() {
    const neos = await fetchNEOs();
    renderNEOs(neos);
    setInterval(async () => renderNEOs(await fetchNEOs()), 3600000); // hourly
}
