// ============================================
// AtlasVision API Server v3.0
// CORS proxy for TLEs, RSS feeds, ADS-B, Ship AIS
// ============================================
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── RSS Feed Proxy ──────────────────────────────────────────────────────────
app.get('/api/rss', async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: 'Missing url' });
    try {
        const r = await fetch(url, {
            headers: { 'User-Agent': 'AtlasVision/4.0', 'Accept': 'application/rss+xml, text/xml, */*' },
            signal: AbortSignal.timeout(20000),
        });
        if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
        res.type('application/xml').send(await r.text());
    } catch (err: any) {
        res.status(502).json({ error: 'Feed fetch failed' });
    }
});

// ─── Generic CORS Proxy ──────────────────────────────────────────────────────
app.get('/api/proxy', async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: 'Missing url' });
    try {
        const r = await fetch(url, {
            headers: { 'User-Agent': 'AtlasVision/4.0', 'Accept': '*/*' },
            signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) return res.status(r.status).json({ error: `Upstream ${r.status}` });
        res.type(r.headers.get('content-type') || 'text/plain').send(await r.text());
    } catch {
        res.status(502).json({ error: 'Proxy failed' });
    }
});

// ─── CelesTrak TLE Proxy (fixes browser CORS for satellites) ─────────────────
const tleCache = new Map<string, { data: string; ts: number }>();

app.get('/api/tle', async (req, res) => {
    const group = (req.query.group as string) || 'active';

    const cached = tleCache.get(group);
    // TLEs valid for 6 hours
    if (cached && Date.now() - cached.ts < 6 * 3600 * 1000) {
        return res.type('text/plain').send(cached.data);
    }

    const urls = [
        `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,
        `https://celestrak.com/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,
    ];

    for (const url of urls) {
        try {
            const r = await fetch(url, {
                headers: { 'User-Agent': 'AtlasVision/4.0 Satellite Tracker' },
                signal: AbortSignal.timeout(25000),
            });
            if (!r.ok) continue;
            const text = await r.text();
            if (text.trim().length < 100) continue;
            tleCache.set(group, { data: text, ts: Date.now() });
            const count = Math.floor(text.trim().split('\n').length / 3);
            console.log(`[TLE] ✅ ${group}: ${count} satellites`);
            return res.type('text/plain').send(text);
        } catch (err: any) {
            console.warn(`[TLE] ${url} failed: ${err.message}`);
        }
    }
    res.status(502).json({ error: 'TLE fetch failed from all sources' });
});

// ─── ADS-B Flight Tracking — Multi-Source Parallel Aggregation ───────────────
let cachedFlights: any = null;
let lastFlightFetch = 0;

function normalizeADSBEx(data: any): any[] {
    if (!data?.ac) return [];
    return data.ac
        .filter((a: any) => a.lat != null && a.lon != null)
        .map((a: any) => [
            (a.hex || '').toLowerCase(),
            (a.flight || a.r || '').trim(),
            a.r || 'Global',
            null, null,
            a.lon ?? null,
            a.lat ?? null,
            (a.alt_baro && a.alt_baro !== 'ground') ? Number(a.alt_baro) * 0.3048 : 0,
            a.alt_baro === 'ground',
            (a.gs ?? 0) * 0.514444,
            a.track ?? 0,
        ]);
}

function normalizeFR24(data: any): any[] {
    const states: any[] = [];
    for (const key in data) {
        if (['full_count', 'version', 'stats'].includes(key)) continue;
        const f = data[key];
        if (!Array.isArray(f) || f.length < 17) continue;
        states.push([
            key,
            (f[16] || f[13] || '').trim(),
            'Global', null, null,
            f[2], f[1],
            (f[4] || 0) * 0.3048,
            f[14] === 1,
            (f[5] || 0) * 0.514444,
            f[3] || 0,
        ]);
    }
    return states;
}

app.get('/api/flights', async (_req, res) => {
    // Serve cache if fresh (15s)
    if (Date.now() - lastFlightFetch < 15000 && cachedFlights) {
        return res.json(cachedFlights);
    }

    let allStates: any[] = [];

    // 1) Try FR24 (best coverage ~15k-20k flights)
    try {
        const fr24Resp = await fetch(
            'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=90,-90,-180,180&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1',
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Referer': 'https://www.flightradar24.com/',
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(12000),
            }
        );
        if (fr24Resp.ok) {
            const data = await fr24Resp.json();
            const fr24States = normalizeFR24(data);
            if (fr24States.length > 200) {
                allStates = fr24States;
                console.log(`[Flights] ✅ FR24: ${fr24States.length} aircraft`);
            }
        }
    } catch (err: any) {
        console.warn('[Flights] FR24 failed:', err.message);
    }

    // 2) Parallel ADS-B Exchange nodes to fill gaps
    const adsbNodes = [
        'https://api.adsb.lol/v2/lat/0/lon/0/dist/20000',
        'https://opendata.adsb.fi/api/v2/lat/0/lon/0/dist/20000',
        'https://api.adsb.one/v2/lat/0/lon/0/dist/20000',
    ];

    if (allStates.length < 5000) {
        const results = await Promise.allSettled(
            adsbNodes.map(url =>
                fetch(url, {
                    headers: { 'User-Agent': 'AtlasVision/4.0' },
                    signal: AbortSignal.timeout(15000),
                }).then(r => r.ok ? r.json() : null).catch(() => null)
            )
        );

        const seen = new Set<string>(allStates.map(s => s[0]));
        for (const result of results) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const states = normalizeADSBEx(result.value);
            let added = 0;
            for (const s of states) {
                if (!seen.has(s[0])) { seen.add(s[0]); allStates.push(s); added++; }
            }
            if (added) console.log(`[Flights] ADS-B node added ${added} unique aircraft`);
        }
    }

    // 3) OpenSky last resort
    if (allStates.length < 500) {
        try {
            const r = await fetch('https://opensky-network.org/api/states/all', {
                signal: AbortSignal.timeout(15000),
            });
            if (r.ok) {
                const data = await r.json();
                allStates = data.states || [];
                console.log(`[Flights] ✅ OpenSky fallback: ${allStates.length} aircraft`);
            }
        } catch (err: any) {
            console.warn('[Flights] OpenSky failed:', err.message);
        }
    }

    console.log(`[Flights] 🌍 Total unique aircraft tracked: ${allStates.length}`);
    cachedFlights = { states: allStates, source: 'multi', total: allStates.length };
    lastFlightFetch = Date.now();
    res.json(cachedFlights);
});

// ─── Flight Search by callsign/ICAO ─────────────────────────────────────────
app.get('/api/flight-search', (req, res) => {
    const q = (req.query.q as string || '').toUpperCase().trim();
    if (!q || !cachedFlights?.states?.length) return res.json([]);

    const results = (cachedFlights.states as any[][])
        .filter(s => (s[1] || '').toUpperCase().includes(q) || (s[0] || '').toUpperCase().includes(q))
        .slice(0, 15)
        .map(s => ({
            icao: s[0], callsign: s[1] || 'N/A', country: s[2] || '',
            lon: s[5], lat: s[6],
            altFt: Math.round((s[7] || 0) / 0.3048),
            speedKts: Math.round((s[9] || 0) / 0.514444),
            heading: s[10] || 0,
        }));
    res.json(results);
});

// ─── Detailed Flight Info ─────────────────────────────────────────────────────
app.get('/api/flight/:id', async (req, res) => {
    const flightId = req.params.id;
    try {
        const r = await fetch(`https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=${flightId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.flightradar24.com/' },
            signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) return res.status(404).json({ error: 'Not found' });
        const d = await r.json();
        res.json({
            callsign: d.identification?.callsign || flightId,
            flightNumber: d.identification?.number?.default || '',
            airline: d.airline?.name || 'Unknown Airline',
            aircraft: d.aircraft?.model?.text || 'Unknown',
            registration: d.aircraft?.registration || '',
            origin: d.airport?.origin?.name || 'Unknown',
            originCode: d.airport?.origin?.code?.iata || '',
            originGate: d.airport?.origin?.info?.gate || '—',
            destination: d.airport?.destination?.name || 'Unknown',
            destinationCode: d.airport?.destination?.code?.iata || '',
            destinationGate: d.airport?.destination?.info?.gate || '—',
            destinationBaggage: d.airport?.destination?.info?.baggage || '—',
            departureScheduled: d.time?.scheduled?.departure,
            departureReal: d.time?.real?.departure,
            arrivalScheduled: d.time?.scheduled?.arrival,
            arrivalEstimated: d.time?.estimated?.arrival,
            status: d.status?.text || '',
        });
    } catch {
        res.status(500).json({ error: 'Failed to fetch flight details' });
    }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok', version: '3.0', app: 'AtlasVision',
        uptime: process.uptime(),
        flightsCached: cachedFlights?.total || 0,
        tleCacheGroups: Array.from(tleCache.keys()),
        timestamp: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`🌍 AtlasVision API Server v3.0 running on http://localhost:${PORT}`);
    console.log(`   /api/rss  /api/proxy  /api/tle  /api/flights  /api/flight-search  /api/flight/:id`);
});
