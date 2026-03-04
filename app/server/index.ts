// ============================================
// GlobalControl API Server
// CORS proxy for RSS feeds, AIS data, & intelligence
// ============================================
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// RSS Feed Proxy — bypasses CORS restrictions
app.get('/api/rss', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GlobalControl/2.0 (Intelligence Aggregator)',
                'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
            },
            signal: AbortSignal.timeout(20000), // Increased timeout
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
        }

        const text = await response.text();
        res.type('application/xml').send(text);
    } catch (err: any) {
        if (err.name === 'TimeoutError') {
            console.log(`[INFO] RSS proxy timeout for ${url}`);
        } else {
            console.error(`[WARN] RSS proxy fetch failed for ${url}:`, err.message);
        }
        res.status(502).json({ error: 'Failed to fetch feed' });
    }
});

// Generic CORS Proxy — for any API that blocks browser requests
app.get('/api/proxy', async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'GlobalControl/2.0',
                'Accept': '*/*',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Upstream ${response.status}` });
        }

        const contentType = response.headers.get('content-type') || 'application/json';
        const text = await response.text();
        res.type(contentType).send(text);
    } catch (err: any) {
        res.status(502).json({ error: 'Proxy failed' });
    }
});

let cachedFlights: any = null;
let lastFlightFetch = 0;

// ─── ADS-B Flight Tracking Proxy ─────────────────────────────────────────
// Tries multiple sources: FR24 → adsbExchange v2 → OpenSky
// Returns unified format: { states: [[icao24, callsign, country, lon, lat, baro_alt, on_ground, velocity, heading], ...] }
app.get('/api/flights', async (_req, res) => {
    // Normalize ADSB Exchange format (adsb.one / adsb.lol) to OpenSky-like format
    function normalizeADSBEx(data: any): any[] {
        if (!data?.ac) return [];
        return data.ac
            .filter((a: any) => a.lat != null && a.lon != null)
            .map((a: any) => [
                (a.hex || '').toLowerCase(),          // 0: icao24
                (a.flight || a.r || '').trim(),        // 1: callsign
                (a.dbFlags !== undefined ? 'Global' : 'Unknown'), // 2: country
                null, null,                             // 3,4: reserved
                a.lon ?? null,                          // 5: longitude
                a.lat ?? null,                          // 6: latitude
                (a.alt_baro && a.alt_baro !== 'ground') ? a.alt_baro * 0.3048 : 0, // 7: altitude m
                a.alt_baro === 'ground',                // 8: on_ground
                (a.gs ?? 0) * 0.514444,                // 9: velocity m/s
                a.track ?? 0,                           // 10: heading
            ]);
    }

    // Normalize FR24 feed to OpenSky states array
    function normalizeFR24(data: any): any[] {
        const states: any[] = [];
        for (const key in data) {
            if (key === 'full_count' || key === 'version' || key === 'stats') continue;
            const f = data[key];
            if (!Array.isArray(f) || f.length < 17) continue;

            states.push([
                key,                          // 0: Use FR24 tracking key as ID (for detail endpoint)
                (f[16] || f[13] || '').trim(),// 1: callsign
                'Global',                     // 2: originCountry
                null, null,                   // 3,4: time/lastContact
                f[2],                         // 5: lon
                f[1],                         // 6: lat
                (f[4] || 0) * 0.3048,         // 7: alt_baro (m)
                f[14] === 1,                  // 8: on_ground
                (f[5] || 0) * 0.514444,       // 9: velocity (m/s)
                f[3] || 0,                    // 10: true_track
            ]);
        }
        return states;
    }

    if (Date.now() - lastFlightFetch < 30000 && cachedFlights) {
        return res.json(cachedFlights);
    }

    const sources = [
        {
            name: 'FR24',
            url: 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=90,-90,-180,180',
            format: 'fr24',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'Accept': 'application/json' } as Record<string, string>
        },
        {
            name: 'adsb.lol',
            url: 'https://api.adsb.lol/v2/lat/0/lon/0/dist/250',
            format: 'adsbex',
            headers: { 'User-Agent': 'GlobalControl/3.0', 'Accept': 'application/json' } as Record<string, string>
        },
        {
            name: 'opensky',
            url: 'https://opensky-network.org/api/states/all',
            format: 'opensky',
            headers: { 'User-Agent': 'GlobalControl/3.0', 'Accept': 'application/json' } as Record<string, string>
        },
    ];

    for (const src of sources) {
        try {
            const resp = await fetch(src.url, {
                headers: src.headers,
                signal: AbortSignal.timeout(18000),
            });
            if (!resp.ok) {
                console.log(`[Flights] ${src.name} returned ${resp.status}, trying next...`);
                continue;
            }
            const data = await resp.json();

            let states: any[] = [];
            if (src.format === 'fr24') states = normalizeFR24(data);
            else if (src.format === 'adsbex') states = normalizeADSBEx(data);
            else states = data.states || [];

            if (!states.length) {
                console.log(`[Flights] ${src.name} returned empty data, trying next...`);
                continue;
            }
            console.log(`[Flights] ✅ ${src.name}: ${states.length} aircraft`);
            cachedFlights = { states, source: src.name };
            lastFlightFetch = Date.now();
            return res.json(cachedFlights);
        } catch (err: any) {
            console.log(`[Flights] ${src.name} failed: ${err.message}`);
        }
    }

    console.log('[Flights] All sources exhausted, returning empty');
    res.json({ states: [], source: 'unavailable' });
});

// ─── Detailed Flight Information Endpoint ───────────────────────────────
app.get('/api/flight/:id', async (req, res) => {
    const flightId = req.params.id;
    try {
        const response = await fetch(`https://data-live.flightradar24.com/clickhandler/?version=1.5&flight=${flightId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) return res.status(404).json({ error: 'Not found' });

        const data = await response.json();
        res.json({
            callsign: data.identification?.callsign || 'N/A',
            airline: data.airline?.name || 'Unknown Airline',
            aircraft: data.aircraft?.model?.text || 'Unknown Aircraft',
            origin: data.airport?.origin?.name || 'Unknown',
            originCode: data.airport?.origin?.code?.iata || '',
            originGate: data.airport?.origin?.info?.gate || 'TBD',
            destination: data.airport?.destination?.name || 'Unknown',
            destinationCode: data.airport?.destination?.code?.iata || '',
            destinationGate: data.airport?.destination?.info?.gate || 'TBD',
            destinationBaggage: data.airport?.destination?.info?.baggage || 'TBD',
            departureTime: data.time?.real?.departure || data.time?.scheduled?.departure,
            arrivalTime: data.time?.estimated?.arrival || data.time?.scheduled?.arrival,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch flight details' });
    }
});

// ─── AIS Ship Data ──────────────────────────────────────────────────────────
app.get('/api/ships', async (_req, res) => {
    res.json({ ships: [], source: 'simulation' });
});

// Health check with system stats
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: '2.0',
        uptime: process.uptime(),
        engines: [
            'correlation-engine',
            'predictive-engine',
            'escalation-engine',
            'stability-engine',
            'india-strategic',
            'query-engine',
        ],
        timestamp: new Date().toISOString(),
    });
});

app.listen(PORT, () => {
    console.log(`🌍 GlobalControl API Server v2.0 running on http://localhost:${PORT}`);
    console.log(`   📡 Endpoints: /api/rss, /api/proxy, /api/ships, /api/health`);
});
