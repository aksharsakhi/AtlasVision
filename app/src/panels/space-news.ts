// ============================================
// Space News Panel — Spaceflight News API (free)
// ============================================
import { EventBus } from '../utils/event-bus';

interface SpaceArticle {
    id: number;
    title: string;
    url: string;
    imageUrl: string;
    newsSite: string;
    summary: string;
    publishedAt: string;
}

const SPACE_NEWS_API = 'https://api.spaceflightnewsapi.net/v4/articles/?limit=30';

async function fetchSpaceNews(): Promise<SpaceArticle[]> {
    try {
        const r = await fetch(SPACE_NEWS_API);
        if (!r.ok) throw new Error(`Space news ${r.status}`);
        const data = await r.json();
        return (data.results || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            url: a.url,
            imageUrl: a.image_url,
            newsSite: a.news_site,
            summary: a.summary,
            publishedAt: a.published_at,
        }));
    } catch {
        return [];
    }
}

function renderSpaceNews(articles: SpaceArticle[]) {
    const container = document.getElementById('space-news-list');
    if (!container) return;

    const el = document.getElementById('space-news-count');
    if (el) el.textContent = articles.length.toString();

    container.innerHTML = articles.map((a, i) => {
        const timeAgo = getTimeAgo(new Date(a.publishedAt).getTime());
        return `
      <a href="${a.url}" target="_blank" rel="noopener" class="space-news-item" style="animation-delay:${i * 30}ms">
        ${a.imageUrl ? `<img src="${a.imageUrl}" class="sn-thumb" loading="lazy" alt="">` : ''}
        <div class="sn-content">
          <h4 class="sn-title">${a.title}</h4>
          <div class="sn-meta">
            <span class="sn-source">🚀 ${a.newsSite}</span>
            <span class="sn-time">${timeAgo}</span>
          </div>
        </div>
      </a>
    `;
    }).join('');
}

function getTimeAgo(ts: number): string {
    const d = Date.now() - ts;
    const h = Math.floor(d / 3600000);
    if (h < 1) return `${Math.floor(d / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export async function initSpaceNews() {
    const articles = await fetchSpaceNews();
    renderSpaceNews(articles);
    setInterval(async () => renderSpaceNews(await fetchSpaceNews()), 600000);
}
