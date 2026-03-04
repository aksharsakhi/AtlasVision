// ============================================
// APOD — NASA Astronomy Picture of the Day
// ============================================
export async function initAPOD() {
    const container = document.getElementById('apod-container');
    if (!container) return;

    try {
        const r = await fetch('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY');
        if (!r.ok) return;
        const data = await r.json();

        container.innerHTML = `
      <div class="apod-card">
        ${data.media_type === 'image'
                ? `<img src="${data.url}" class="apod-img" loading="lazy" alt="${data.title}" />`
                : `<iframe src="${data.url}" class="apod-video" allowfullscreen></iframe>`
            }
        <div class="apod-info">
          <h4 class="apod-title">${data.title}</h4>
          <p class="apod-date">${data.date}</p>
          <p class="apod-explanation">${data.explanation.substring(0, 200)}...</p>
        </div>
      </div>
    `;
    } catch {
        container.innerHTML = '<p class="text-muted text-xs">Failed to load APOD</p>';
    }
}
