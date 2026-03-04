// ============================================
// Satellite Pass Prediction Panel
// When will a satellite pass over a user's location?
// ============================================
import { findSatByName, predictPasses, getSatRecords } from '../layers/satellites';

export function initPassPredictor() {
    const input = document.getElementById('pass-sat-input') as HTMLInputElement;
    const latInput = document.getElementById('pass-lat') as HTMLInputElement;
    const lonInput = document.getElementById('pass-lon') as HTMLInputElement;
    const btn = document.getElementById('pass-predict-btn');
    const output = document.getElementById('pass-results');

    if (!input || !btn || !output) return;

    // Default to approximate center (user can change)
    if (latInput) latInput.value = '28.6';
    if (lonInput) lonInput.value = '77.2';

    btn.addEventListener('click', () => {
        const query = input.value.trim();
        const lat = parseFloat(latInput?.value || '28.6');
        const lon = parseFloat(lonInput?.value || '77.2');

        if (!query) {
            output.innerHTML = '<p class="text-muted text-xs">Enter a satellite name (e.g., ISS, STARLINK)</p>';
            return;
        }

        const matches = findSatByName(query);
        if (matches.length === 0) {
            output.innerHTML = `<p class="text-muted text-xs">No satellite found matching "${query}"</p>`;
            return;
        }

        const sat = matches[0]; // Best match
        const passes = predictPasses(sat.satrec, lat, lon, 48);

        if (passes.length === 0) {
            output.innerHTML = `
        <p class="text-xs"><strong style="color:#00d4ff">🛰️ ${sat.name}</strong></p>
        <p class="text-muted text-xs">No visible passes over (${lat}°, ${lon}°) in the next 48 hours.</p>
      `;
            return;
        }

        output.innerHTML = `
      <p class="text-xs" style="margin-bottom:8px;">
        <strong style="color:#00d4ff">🛰️ ${sat.name}</strong> — ${passes.length} passes over (${lat}°, ${lon}°)
      </p>
      <div class="pass-table">
        <div class="pass-header">
          <span>Rise</span><span>Peak</span><span>Set</span><span>Max El</span>
        </div>
        ${passes.map(p => `
          <div class="pass-row ${p.peakElevation > 45 ? 'pass-high' : ''}">
            <span>${formatTime(p.riseTime)}</span>
            <span>${formatTime(p.peakTime)}</span>
            <span>${formatTime(p.setTime)}</span>
            <span>${p.peakElevation.toFixed(1)}°</span>
          </div>
        `).join('')}
      </div>
    `;
    });
}

function formatTime(d: Date): string {
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}
