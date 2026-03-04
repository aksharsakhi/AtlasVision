// ============================================
// India Strategic Intelligence Mode
// Geo-fenced high-sensitivity monitoring
// ============================================

export interface IndiaZone {
    name: string;
    id: string;
    priority: 'critical' | 'high' | 'elevated';
    // Bounding box: [minLat, maxLat, minLon, maxLon]
    bounds: [number, number, number, number];
    description: string;
}

export interface IndiaZoneHit {
    zone: string;
    priority: string;
    description: string;
}

export const INDIA_ZONES: IndiaZone[] = [
    {
        name: 'Indian Coastline — Western',
        id: 'coast-west',
        priority: 'high',
        bounds: [8.0, 23.5, 66.0, 74.0],
        description: 'Western Indian coastline (Gujarat to Kerala) — 200km maritime zone',
    },
    {
        name: 'Indian Coastline — Eastern',
        id: 'coast-east',
        priority: 'high',
        bounds: [8.0, 22.0, 78.0, 88.0],
        description: 'Eastern Indian coastline (Tamil Nadu to Odisha) — 200km maritime zone',
    },
    {
        name: 'Line of Actual Control (LAC)',
        id: 'lac',
        priority: 'critical',
        bounds: [27.0, 37.0, 76.0, 97.0],
        description: 'India-China border — Ladakh to Arunachal Pradesh',
    },
    {
        name: 'Line of Control (LOC)',
        id: 'loc',
        priority: 'critical',
        bounds: [32.5, 37.0, 73.0, 78.0],
        description: 'India-Pakistan border — Kashmir region',
    },
    {
        name: 'Andaman & Nicobar Islands',
        id: 'andaman',
        priority: 'elevated',
        bounds: [6.0, 14.0, 91.0, 95.0],
        description: 'Andaman & Nicobar archipelago — strategic naval position',
    },
    {
        name: 'Arabian Sea',
        id: 'arabian-sea',
        priority: 'high',
        bounds: [5.0, 25.0, 50.0, 72.0],
        description: 'Arabian Sea — key maritime trade and naval operations zone',
    },
    {
        name: 'Bay of Bengal',
        id: 'bay-bengal',
        priority: 'high',
        bounds: [5.0, 22.0, 78.0, 98.0],
        description: 'Bay of Bengal — SLOC and naval exercise zone',
    },
    {
        name: 'Strait of Malacca Approach',
        id: 'malacca-approach',
        priority: 'elevated',
        bounds: [0.0, 8.0, 95.0, 105.0],
        description: 'Strait of Malacca approach — critical global chokepoint',
    },
    {
        name: 'Siachen Glacier',
        id: 'siachen',
        priority: 'critical',
        bounds: [35.0, 36.5, 76.5, 77.5],
        description: 'Siachen Glacier — highest battlefield in the world',
    },
    {
        name: 'Indian Ocean IOR',
        id: 'ior',
        priority: 'elevated',
        bounds: [-10.0, 25.0, 40.0, 100.0],
        description: 'Indian Ocean Region — strategic maritime domain',
    },
];

// Military aircraft callsign patterns (Indian + foreign near India)
const MILITARY_PATTERNS = [
    /^(IAF|SQN|IFC)/i,           // Indian Air Force
    /^(IN|INS)/i,                // Indian Navy
    /^(BSF|ICG)/i,               // Border Security / Coast Guard
    /^(DRAGON|PLA|CCA)/i,        // Chinese military
    /^(PAF|SHAHEEN)/i,           // Pakistan Air Force
    /^(RCH|REACH|DUKE|FORTE)/i,  // US military
    /^(NATO)/i,                   // NATO
    /^(RAF|ASCOT)/i,             // UK RAF
];

export function isInIndiaZone(lat: number, lon: number): IndiaZoneHit | null {
    for (const zone of INDIA_ZONES) {
        const [minLat, maxLat, minLon, maxLon] = zone.bounds;
        if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
            return {
                zone: zone.name,
                priority: zone.priority,
                description: zone.description,
            };
        }
    }
    return null;
}

export function isMilitaryCallsign(callsign: string): boolean {
    return MILITARY_PATTERNS.some(p => p.test(callsign));
}

export function classifyIndiaRelevance(entity: {
    type: string;
    lat: number;
    lon: number;
    name?: string;
    callsign?: string;
}): {
    inZone: boolean;
    zoneName: string;
    priority: string;
    isMilitary: boolean;
    relevanceScore: number;
} {
    const hit = isInIndiaZone(entity.lat, entity.lon);
    const isMil = entity.callsign ? isMilitaryCallsign(entity.callsign) : false;

    let relevanceScore = 0;
    if (hit) {
        relevanceScore += hit.priority === 'critical' ? 40 : hit.priority === 'high' ? 25 : 15;
    }
    if (isMil) relevanceScore += 30;
    if (entity.type === 'ship') relevanceScore += 10; // maritime focus
    if (entity.type === 'satellite') relevanceScore += 5;

    return {
        inZone: !!hit,
        zoneName: hit?.zone || '',
        priority: hit?.priority || '',
        isMilitary: isMil,
        relevanceScore: Math.min(100, relevanceScore),
    };
}

// Get entities within India strategic zones
export function filterIndiaEntities(
    flights: any[],
    ships: any[],
    satellites: any[],
): {
    flights: any[];
    ships: any[];
    satellites: any[];
    alerts: { entity: any; zone: IndiaZoneHit; isMilitary: boolean }[];
} {
    const alerts: { entity: any; zone: IndiaZoneHit; isMilitary: boolean }[] = [];

    const filteredFlights = flights.filter(f => {
        if (!f.latitude || !f.longitude) return false;
        const hit = isInIndiaZone(f.latitude, f.longitude);
        if (hit) {
            const isMil = isMilitaryCallsign(f.callsign || '');
            if (isMil || hit.priority === 'critical') {
                alerts.push({ entity: f, zone: hit, isMilitary: isMil });
            }
            return true;
        }
        return false;
    });

    const filteredShips = ships.filter(s => {
        if (!s.lat || !s.lon) return false;
        const hit = isInIndiaZone(s.lat, s.lon);
        if (hit) {
            const isNaval = /^(WARSHIP|HMS|INS|USS|FFG|DDG)/i.test(s.name || '');
            if (isNaval || hit.priority === 'critical') {
                alerts.push({ entity: s, zone: hit, isMilitary: isNaval });
            }
            return true;
        }
        return false;
    });

    const filteredSats = satellites.filter(s => {
        if (!s.lat || !s.lon) return false;
        return isInIndiaZone(s.lat, s.lon) !== null;
    });

    return { flights: filteredFlights, ships: filteredShips, satellites: filteredSats, alerts };
}
