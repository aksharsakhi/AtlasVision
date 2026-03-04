// ============================================
// News Panel — Real RSS Feed Aggregation
// Uses the server proxy at /api/rss to bypass CORS
// ============================================
import { EventBus } from '../utils/event-bus';
import { classifyThreat, ThreatLevel } from '../data/threat-keywords';

// Curated RSS feeds — real, global news sources
const RSS_FEEDS = [
    // --- AMERICAS ---
    { name: 'NYT World', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'general' },
    { name: 'Washington Post', url: 'http://feeds.washingtonpost.com/rss/world', category: 'general' },
    { name: 'CNN', url: 'http://rss.cnn.com/rss/edition_world.rss', category: 'general' },
    { name: 'NBC News', url: 'https://feeds.nbcnews.com/nbcnews/public/world', category: 'general' },
    { name: 'NPR', url: 'https://feeds.npr.org/1004/rss.xml', category: 'general' },
    { name: 'Fox News', url: 'http://feeds.foxnews.com/foxnews/world', category: 'general' },
    { name: 'CBC Canada', url: 'https://www.cbc.ca/cmlink/rss-world', category: 'general' },
    { name: 'Global News CA', url: 'https://globalnews.ca/world/feed/', category: 'general' },
    { name: 'Reuters', url: 'https://cdn.syndication.twimg.com/widgets/timelines/428333', category: 'general' },

    // --- EUROPE ---
    { name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'general' },
    { name: 'DW News Germany', url: 'https://rss.dw.com/rdf/rss-en-all', category: 'general' },
    { name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'general' },
    { name: 'Le Monde (EN)', url: 'https://www.lemonde.fr/en/rss/une.xml', category: 'general' },
    { name: 'EuroNews', url: 'https://www.euronews.com/rss', category: 'general' },
    { name: 'Sky News UK', url: 'https://feeds.skynews.com/feeds/rss/world.xml', category: 'general' },
    { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'general' },
    { name: 'Telegraph UK', url: 'https://www.telegraph.co.uk/world-news/rss.xml', category: 'general' },
    { name: 'RT News (EN)', url: 'https://www.rt.com/rss/', category: 'general' },
    { name: 'TASS Russia', url: 'https://tass.com/rss/v2.xml', category: 'general' },

    // --- ASIA & PACIFIC ---
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'general' },
    { name: 'Times of India', url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', category: 'general' },
    { name: 'The Hindu', url: 'https://www.thehindu.com/news/international/feeder/default.rss', category: 'general' },
    { name: 'NDTV India', url: 'https://feeds.feedburner.com/ndtvnews-world-news', category: 'general' },
    { name: 'SCMP China', url: 'https://www.scmp.com/rss/91/feed', category: 'general' },
    { name: 'CNA Singapore', url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', category: 'general' },
    { name: 'Japan Times', url: 'https://www.japantimes.co.jp/feed/', category: 'general' },
    { name: 'Sydney Morning Herald', url: 'https://www.smh.com.au/rss/world.xml', category: 'general' },
    { name: 'ABC Australia', url: 'https://www.abc.net.au/news/feed/52278/rss.xml', category: 'general' },
    { name: 'Dawn Pakistan', url: 'https://www.dawn.com/feeds/home/', category: 'general' },

    // --- MIDDLE EAST & AFRICA ---
    { name: 'Arab News', url: 'https://www.arabnews.com/rss.xml', category: 'general' },
    { name: 'Jerusalem Post', url: 'https://www.jpost.com/rss/rssfeedsfrontpage.aspx', category: 'general' },
    { name: 'Haaretz', url: 'https://www.haaretz.com/cmlink/1.4761356', category: 'general' },
    { name: 'Mehr News Iran', url: 'https://en.mehrnews.com/rss', category: 'general' },
    { name: 'News24 Africa', url: 'https://feeds.news24.com/articles/news24/World/rss', category: 'general' },

    // --- MILITARY & DEFENSE ---
    { name: 'Defense News', url: 'https://www.defensenews.com/arc/outboundfeeds/rss/category/global/?outputType=xml', category: 'military' },
    { name: 'Defense One', url: 'https://www.defenseone.com/rss/all/', category: 'military' },
    { name: 'The War Zone', url: 'https://www.thedrive.com/the-war-zone/feed', category: 'military' },
    { name: 'Military.com', url: 'https://www.military.com/rss-feeds/news.rss', category: 'military' },
    { name: 'Janes Defense', url: 'https://www.janes.com/search/rss', category: 'military' },
    { name: 'Stars & Stripes', url: 'https://www.stripes.com/news/rss/', category: 'military' },

    // --- ECONOMY & FINANCE ---
    { name: 'WSJ World', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', category: 'economy' },
    { name: 'Financial Times', url: 'https://www.ft.com/?format=rss', category: 'economy' },
    { name: 'CNBC', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', category: 'economy' },
    { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'economy' },
    { name: 'The Economist', url: 'https://www.economist.com/finance-and-economics/rss.xml', category: 'economy' },
    { name: 'MarketWatch', url: 'http://feeds.marketwatch.com/marketwatch/topstories/', category: 'economy' },

    // --- TECH, SPACE & DISASTER ---
    { name: 'NASA Breaking', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'tech' },
    { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
    { name: 'Space.com', url: 'https://www.space.com/feeds/all', category: 'tech' },
    { name: 'Wired News', url: 'https://www.wired.com/feed/rss', category: 'tech' },
    { name: 'USGS Quakes', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom', category: 'disaster' }
];

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    source: string;
    category: string;
    description: string;
    severity: ThreatLevel;
    timestamp: number;
}

function parseRSSXml(xmlText: string, sourceName: string, category: string): NewsItem[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items: NewsItem[] = [];

    // Try RSS 2.0 format
    let entries = doc.querySelectorAll('item');
    if (entries.length === 0) {
        // Try Atom format
        entries = doc.querySelectorAll('entry');
    }

    entries.forEach(entry => {
        const title = entry.querySelector('title')?.textContent?.trim() || '';
        if (!title) return;

        const link = entry.querySelector('link')?.textContent?.trim()
            || entry.querySelector('link')?.getAttribute('href') || '';
        const pubDate = entry.querySelector('pubDate')?.textContent
            || entry.querySelector('published')?.textContent
            || entry.querySelector('updated')?.textContent || '';
        const description = entry.querySelector('description')?.textContent?.trim()
            || entry.querySelector('summary')?.textContent?.trim() || '';

        const timestamp = pubDate ? new Date(pubDate).getTime() : Date.now();
        const severity = classifyThreat(title + ' ' + description);

        items.push({
            title,
            link,
            pubDate,
            source: sourceName,
            category,
            description: stripHtml(description).substring(0, 200),
            severity,
            timestamp,
        });
    });

    return items;
}

function stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function getTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getSeverityClass(severity: ThreatLevel): string {
    const map: Record<ThreatLevel, string> = {
        critical: 'severity-critical',
        high: 'severity-high',
        medium: 'severity-medium',
        low: 'severity-low',
        info: 'severity-info',
    };
    return map[severity];
}

let allNews: NewsItem[] = [];
let currentFilter: string = 'all';
let currentSearchQuery: string = '';

export function getTopNews() {
    return allNews.slice(0, 10);
}

function renderNewsList() {
    const container = document.getElementById('news-list');
    if (!container) return;

    let filtered = allNews;

    // 1. Apply category filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(n => n.category === currentFilter || n.severity === currentFilter);
    }

    // 2. Apply search text filter
    if (currentSearchQuery.trim() !== '') {
        const q = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.source.toLowerCase().includes(q)
        );
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // Show top 100
    const shown = filtered.slice(0, 100);

    container.innerHTML = shown.map((item, i) => `
    <div class="news-item" style="animation-delay: ${i * 0.03}s" data-link="${item.link}">
      <span class="news-severity ${getSeverityClass(item.severity)}">${item.severity.toUpperCase()}</span>
      <div class="news-title">${escapeHtml(item.title)}</div>
      <div class="news-meta">
        <span class="news-source">${escapeHtml(item.source)}</span>
        <span>•</span>
        <span>${getTimeAgo(item.timestamp)}</span>
      </div>
    </div>
  `).join('');

    // Click to open
    container.querySelectorAll('.news-item').forEach(el => {
        el.addEventListener('click', () => {
            const link = (el as HTMLElement).dataset.link;
            if (link) window.open(link, '_blank');
        });
    });
}

function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function fetchFeed(feed: typeof RSS_FEEDS[0]): Promise<NewsItem[]> {
    try {
        // Use our CORS proxy
        const proxyUrl = `/api/rss?url=${encodeURIComponent(feed.url)}`;
        const resp = await fetch(proxyUrl);
        if (!resp.ok) {
            // If proxy fails, try direct (might work for some feeds)
            const directResp = await fetch(feed.url);
            if (!directResp.ok) return [];
            const text = await directResp.text();
            return parseRSSXml(text, feed.name, feed.category);
        }
        const text = await resp.text();
        return parseRSSXml(text, feed.name, feed.category);
    } catch {
        return [];
    }
}

async function fetchAllFeeds() {
    // To avoid rate-limiting our proxy/server and the actual endpoints,
    // we randomly select ~20 feeds per 5-minute ping cycle.
    const shuffled = [...RSS_FEEDS].sort(() => 0.5 - Math.random());
    const subset = shuffled.slice(0, 20);

    const results = await Promise.allSettled(
        subset.map(feed => fetchFeed(feed))
    );

    const newItems: NewsItem[] = [];
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            newItems.push(...result.value);
        }
    });

    // Deduplicate by title similarity
    const seen = new Set<string>();
    allNews = newItems.filter(item => {
        const key = item.title.toLowerCase().substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by recency
    allNews.sort((a, b) => b.timestamp - a.timestamp);

    // Update counter
    const el = document.getElementById('news-count');
    if (el) el.textContent = allNews.length.toString();
    const sig = document.getElementById('sig-news');
    if (sig) sig.textContent = allNews.length.toString();

    EventBus.getInstance().emit('data:news', { count: allNews.length, news: allNews });

    renderNewsList();
}

export function initNewsPanel() {
    // Filter dropdown
    const filterEl = document.getElementById('news-filter') as HTMLSelectElement;
    if (filterEl) {
        filterEl.addEventListener('change', () => {
            currentFilter = filterEl.value;
            renderNewsList();
        });
    }

    // Search input
    const searchEl = document.getElementById('news-search-input') as HTMLInputElement;
    if (searchEl) {
        searchEl.addEventListener('input', () => {
            currentSearchQuery = searchEl.value;
            renderNewsList();
        });
    }

    // Initial fetch
    fetchAllFeeds();

    // Refresh every 5 minutes
    setInterval(fetchAllFeeds, 300000);
}
