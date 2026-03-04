// ============================================
// Launch Calendar — Upcoming Rocket Launches
// Uses Launch Library 2 (thespacedevs.com, free)
// ============================================
export interface Launch {
    id: string;
    name: string;
    status: string;
    net: string; // No Earlier Than
    provider: string;
    rocket: string;
    pad: string;
    location: string;
    image: string;
    url: string;
}

async function fetchLaunches(): Promise<Launch[]> {
    try {
        const r = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=15&mode=list');
        if (!r.ok) throw new Error(`Launch API ${r.status}`);
        const data = await r.json();
        return (data.results || []).map((l: any) => ({
            id: l.id,
            name: l.name,
            status: l.status?.name || 'Unknown',
            net: l.net,
            provider: l.launch_service_provider?.name || 'Unknown',
            rocket: l.rocket?.configuration?.name || 'Unknown',
            pad: l.pad?.name || 'Unknown',
            location: l.pad?.location?.name || 'Unknown',
            image: l.image || '',
            url: l.url || '',
        }));
    } catch {
        return [];
    }
}

function getCountdown(net: string): string {
    const diff = new Date(net).getTime() - Date.now();
    if (diff < 0) return 'Launched';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `T-${d}d ${h}h`;
    if (h > 0) return `T-${h}h ${m}m`;
    return `T-${m}m`;
}

function renderLaunches(launches: Launch[]) {
    const container = document.getElementById('launch-list');
    if (!container) return;

    const el = document.getElementById('launch-count');
    if (el) el.textContent = launches.length.toString();

    container.innerHTML = launches.map((l, i) => {
        const countdown = getCountdown(l.net);
        const statusColor = l.status === 'Go for Launch' ? '#00e676' :
            l.status === 'TBD' ? '#ffd740' : '#999';
        return `
      <div class="launch-item" style="animation-delay:${i * 30}ms">
        <div class="launch-header">
          <span class="launch-name">${l.name}</span>
          <span class="launch-countdown" style="color:${countdown.startsWith('T-0') || countdown.startsWith('T-1') ? '#ff5252' : '#00d4ff'}">${countdown}</span>
        </div>
        <div class="launch-meta">
          <span>🚀 ${l.rocket}</span>
          <span>🏢 ${l.provider}</span>
        </div>
        <div class="launch-meta">
          <span>📍 ${l.location}</span>
          <span class="launch-status" style="color:${statusColor}">${l.status}</span>
        </div>
      </div>
    `;
    }).join('');
}

export async function initLaunchCalendar() {
    const launches = await fetchLaunches();
    renderLaunches(launches);
    setInterval(async () => renderLaunches(await fetchLaunches()), 300000);
}
