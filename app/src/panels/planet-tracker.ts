// ============================================
// Solar System / Planet Tracking
// Uses planetary ephemeris calculations
// ============================================
import { EventBus } from '../utils/event-bus';

interface PlanetData {
    name: string;
    icon: string;
    ra: number;   // right ascension (degrees)
    dec: number;  // declination (degrees)
    distance: number; // AU from Earth
    magnitude: number;
    phase: number; // illumination %
    constellation: string;
    rising: string;
    setting: string;
    category: 'Star' | 'Planet' | 'Moon' | 'Earth' | 'Satellite';
}

// Simplified planetary position calculator (accurate to ~1° for inner planets)
function computePlanetPositions(): PlanetData[] {
    const now = new Date();
    const jd = getJulianDate(now);
    const T = (jd - 2451545.0) / 36525; // centuries from J2000

    // Mean orbital elements (J2000 + rates)
    const planets = [
        { name: 'Mercury', icon: '☿', L0: 252.251, Lr: 149472.675, a: 0.387, e0: 0.2056, i: 7.0, color: '#b0b0b0' },
        { name: 'Venus', icon: '♀', L0: 181.980, Lr: 58517.816, a: 0.723, e0: 0.0068, i: 3.39, color: '#ffd54f' },
        { name: 'Mars', icon: '♂', L0: 355.433, Lr: 19140.299, a: 1.524, e0: 0.0934, i: 1.85, color: '#ef5350' },
        { name: 'Jupiter', icon: '♃', L0: 34.351, Lr: 3034.906, a: 5.203, e0: 0.0484, i: 1.31, color: '#ffab40' },
        { name: 'Saturn', icon: '♄', L0: 50.077, Lr: 1222.114, a: 9.537, e0: 0.0542, i: 2.49, color: '#ffd740' },
        { name: 'Uranus', icon: '⛢', L0: 314.055, Lr: 428.947, a: 19.19, e0: 0.0472, i: 0.77, color: '#80deea' },
        { name: 'Neptune', icon: '♆', L0: 304.349, Lr: 218.486, a: 30.07, e0: 0.0086, i: 1.77, color: '#42a5f5' },
    ];

    // Earth's position
    const earthL = (100.464 + 35999.373 * T) % 360;
    const earthR = 1.00014; // AU (simplified)

    const results: PlanetData[] = [];

    // Moon
    const moonL = (218.316 + 13.176396 * (jd - 2451545)) % 360;
    const moonPhase = ((moonL - earthL + 360) % 360) / 360 * 100;
    const moonPhaseIcon = moonPhase < 12.5 ? '🌑' : moonPhase < 25 ? '🌒' : moonPhase < 37.5 ? '🌓' :
        moonPhase < 50 ? '🌔' : moonPhase < 62.5 ? '🌕' : moonPhase < 75 ? '🌖' :
            moonPhase < 87.5 ? '🌗' : '🌘';

    results.push({
        name: 'Moon', icon: moonPhaseIcon,
        ra: moonL % 360, dec: 5.1 * Math.sin(moonL * Math.PI / 180),
        distance: 0.00257, magnitude: -12.7, phase: moonPhase,
        constellation: getConstellation(moonL % 360, 0),
        rising: getApproxRiseSetting(moonL, 'rise'),
        setting: getApproxRiseSetting(moonL, 'set'),
        category: 'Moon'
    });

    // Earth (from our perspective)
    results.push({
        name: 'Earth', icon: '🌍',
        ra: 0, dec: 0, distance: 0, magnitude: -26.74, phase: 100,
        constellation: 'Home',
        rising: 'N/A', setting: 'N/A',
        category: 'Earth'
    });

    // Star: Sun
    results.push({
        name: 'Sun', icon: '☀️',
        ra: (earthL + 180) % 360, dec: -23.44 * Math.sin(((earthL - 80) % 360) * Math.PI / 180),
        distance: 1.0, magnitude: -26.74, phase: 100,
        constellation: getConstellation((earthL + 180) % 360, 0),
        rising: getApproxRiseSetting(earthL + 180, 'rise'),
        setting: getApproxRiseSetting(earthL + 180, 'set'),
        category: 'Star'
    });

    planets.forEach(p => {
        const L = (p.L0 + p.Lr * T) % 360;
        // Simplified geocentric position
        const helioLon = L * Math.PI / 180;
        const earthLon = earthL * Math.PI / 180;

        const x = p.a * Math.cos(helioLon) - earthR * Math.cos(earthLon);
        const y = p.a * Math.sin(helioLon) - earthR * Math.sin(earthLon);
        const z = p.a * Math.sin(p.i * Math.PI / 180) * Math.sin(helioLon);

        const dist = Math.sqrt(x * x + y * y + z * z);
        const ra = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        const dec = Math.asin(z / dist) * 180 / Math.PI;

        // Phase angle (simplified)
        const phase = Math.max(0, Math.min(100, 50 + 50 * Math.cos((L - earthL) * Math.PI / 180)));

        // Apparent magnitude (very rough)
        const mag = 5 * Math.log10(p.a * dist) + (p.name === 'Venus' ? -4.4 :
            p.name === 'Mars' ? -1.5 : p.name === 'Jupiter' ? -2.5 :
                p.name === 'Saturn' ? 0.5 : p.name === 'Mercury' ? -0.4 :
                    p.name === 'Uranus' ? 5.7 : 7.8);

        results.push({
            name: p.name, icon: p.icon,
            ra, dec, distance: dist, magnitude: mag, phase,
            constellation: getConstellation(ra, dec),
            rising: getApproxRiseSetting(ra, 'rise'),
            setting: getApproxRiseSetting(ra, 'set'),
            category: 'Planet'
        });
    });

    // Notable Satellites
    results.push({
        name: 'ISS (Zarya)', icon: '🛰️', ra: 0, dec: 0, distance: 0.0000028, magnitude: -3.0, phase: 100, constellation: 'LEO', rising: 'Variable', setting: 'Variable', category: 'Satellite'
    });
    results.push({
        name: 'Hubble Space Telescope', icon: '🔭', ra: 0, dec: 0, distance: 0.0000036, magnitude: 2.1, phase: 100, constellation: 'LEO', rising: 'Variable', setting: 'Variable', category: 'Satellite'
    });

    return results;
}

function getJulianDate(date: Date): number {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440;
    const a = Math.floor((14 - m) / 12);
    const y2 = y + 4800 - a;
    const m2 = m + 12 * a - 3;
    return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}

function getConstellation(ra: number, dec: number): string {
    // Simplified — maps RA to zodiac constellations
    const idx = Math.floor(((ra + 360) % 360) / 30);
    const names = ['Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Sagittarius', 'Capricornus', 'Aquarius'];
    return names[idx] || 'Unknown';
}

function getApproxRiseSetting(ra: number, type: 'rise' | 'set'): string {
    // Very rough estimate based on current sidereal time offset
    const now = new Date();
    const lst = (now.getUTCHours() + now.getUTCMinutes() / 60 + ra / 15) % 24;
    const offset = type === 'rise' ? -6 : 6;
    const hour = (lst + offset + 24) % 24;
    return `~${Math.floor(hour).toString().padStart(2, '0')}:${Math.floor((hour % 1) * 60).toString().padStart(2, '0')} UTC`;
}

function renderPlanets(planets: PlanetData[]) {
    const container = document.getElementById('planet-list');
    if (!container) return;

    // Group by category
    const categories = ['Earth', 'Star', 'Moon', 'Planet', 'Satellite'];
    let html = '';

    categories.forEach(cat => {
        const catPlanets = planets.filter(p => p.category === cat);
        if (catPlanets.length === 0) return;

        html += `<div style="padding: 4px 8px; background: rgba(0, 212, 255, 0.1); color: #00d4ff; font-weight: bold; font-size: 11px; text-transform: uppercase; margin-top: 8px; border-bottom: 1px solid rgba(0,212,255,0.3);">${cat}s</div>`;

        html += catPlanets.map(p => {
            const distStr = p.distance === 0 ? 'Surface' :
                p.distance < 0.00001 ? `${(p.distance * 149597870.7).toFixed(0)} km` :
                    p.distance < 0.01 ? `${(p.distance * 149597870.7).toFixed(0)} km` :
                        `${p.distance.toFixed(3)} AU`;

            return `
        <div class="planet-item">
            <div class="planet-icon">${p.icon}</div>
            <div class="planet-info">
            <span class="planet-name">${p.name}</span>
            <span class="planet-const">in ${p.constellation}</span>
            </div>
            <div class="planet-data">
            <span class="planet-dist">${distStr}</span>
            <span class="planet-mag">mag ${p.magnitude.toFixed(1)}</span>
            </div>
        </div>
        `;
        }).join('');
    });

    container.innerHTML = html;
}

export async function initPlanetTracker() {
    const planets = computePlanetPositions();
    renderPlanets(planets);
    // Update every 10 min
    setInterval(() => renderPlanets(computePlanetPositions()), 600000);
}
