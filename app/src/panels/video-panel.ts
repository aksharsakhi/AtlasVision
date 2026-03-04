// ============================================
// Live Video Panel — YouTube Live Streams
// Real live streams from major news channels
// ============================================

const LIVE_STREAMS = [
    {
        name: 'Bloomberg TV',
        embedId: 'dp8PhLsUcFE',
        icon: '📈',
    },
    {
        name: 'CBS News',
        embedId: 'Q8pZ2C1yD48',
        icon: '🇺🇸',
    },
    {
        name: 'ABC Australia',
        embedId: 'W1ilCyKVycc',
        icon: '🇦🇺',
    },
    {
        name: 'Al Jazeera',
        embedId: 'gCNeDWCI0vo',
        icon: '🇶🇦',
    },
    {
        name: 'Earth from Space',
        embedId: 'xRPjKQtRXR8',
        icon: '🌍',
    },
    {
        name: 'CNA',
        embedId: 'XWq5kBlakcQ',
        icon: '🇸🇬',
    }
];

export function initVideoPanel() {
    const grid = document.getElementById('video-grid');
    if (!grid) return;

    grid.innerHTML = LIVE_STREAMS.map(stream => `
    <div class="video-card">
      <iframe
        src="https://www.youtube.com/embed/${stream.embedId}?autoplay=0&mute=1&controls=1&modestbranding=1&rel=0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>
      <div class="video-label">
        <span class="live-dot"></span>
        <span>${stream.icon} ${stream.name}</span>
      </div>
    </div>
  `).join('');

    // Toggle buttons
    const toggleBtns = document.querySelectorAll('.video-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const layout = (btn as HTMLElement).dataset.layout;
            if (layout === 'single') {
                grid.style.gridTemplateColumns = '1fr';
                // Show only first
                const cards = grid.querySelectorAll('.video-card');
                cards.forEach((c, i) => {
                    (c as HTMLElement).style.display = i === 0 ? 'block' : 'none';
                });
            } else {
                grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
                const cards = grid.querySelectorAll('.video-card');
                cards.forEach(c => {
                    (c as HTMLElement).style.display = 'block';
                });
            }
        });
    });
}
