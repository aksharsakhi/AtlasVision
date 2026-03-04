// ============================================
// Conversational Intelligence Query Engine
// "What is happening near X?" → structured JSON
// ============================================
import { computeStability } from './stability-engine';
import { buildTimeline } from './escalation-engine';
import { getAnomalies } from './correlation-engine';
import { detectConvergences, forecastRiskZones } from './predictive-engine';
import { isInIndiaZone } from './india-strategic';
import { TrajectoryStore } from './trajectory-store';

// Known location geocoding (no external API dependency)
const KNOWN_LOCATIONS: Record<string, { lat: number; lon: number }> = {
    'mumbai': { lat: 19.076, lon: 72.877 },
    'delhi': { lat: 28.614, lon: 77.209 },
    'new delhi': { lat: 28.614, lon: 77.209 },
    'chennai': { lat: 13.083, lon: 80.270 },
    'kolkata': { lat: 22.573, lon: 88.364 },
    'bangalore': { lat: 12.972, lon: 77.594 },
    'bengaluru': { lat: 12.972, lon: 77.594 },
    'hyderabad': { lat: 17.385, lon: 78.487 },
    'pune': { lat: 18.520, lon: 73.856 },
    'ahmedabad': { lat: 23.023, lon: 72.571 },
    'kochi': { lat: 9.931, lon: 76.267 },
    'goa': { lat: 15.300, lon: 74.124 },
    'visakhapatnam': { lat: 17.686, lon: 83.218 },
    'jaipur': { lat: 26.913, lon: 75.787 },
    'srinagar': { lat: 34.084, lon: 74.797 },
    'leh': { lat: 34.153, lon: 77.577 },
    'ladakh': { lat: 34.153, lon: 77.577 },
    'andaman': { lat: 11.667, lon: 92.767 },
    'port blair': { lat: 11.667, lon: 92.767 },
    'siachen': { lat: 35.5, lon: 77.0 },
    'kashmir': { lat: 34.084, lon: 74.797 },
    'loc': { lat: 34.5, lon: 75.5 },
    'lac': { lat: 33.0, lon: 79.0 },
    'galwan': { lat: 34.75, lon: 78.18 },
    'doklam': { lat: 27.35, lon: 89.05 },
    'arunachal': { lat: 28.218, lon: 94.727 },
    // International
    'washington': { lat: 38.907, lon: -77.037 },
    'new york': { lat: 40.713, lon: -74.006 },
    'london': { lat: 51.507, lon: -0.128 },
    'paris': { lat: 48.857, lon: 2.352 },
    'berlin': { lat: 52.520, lon: 13.405 },
    'moscow': { lat: 55.756, lon: 37.617 },
    'beijing': { lat: 39.904, lon: 116.407 },
    'tokyo': { lat: 35.676, lon: 139.650 },
    'jerusalem': { lat: 31.769, lon: 35.216 },
    'tehran': { lat: 35.689, lon: 51.389 },
    'islamabad': { lat: 33.693, lon: 73.069 },
    'kabul': { lat: 34.533, lon: 69.172 },
    'taiwan': { lat: 23.698, lon: 120.960 },
    'taipei': { lat: 25.033, lon: 121.565 },
    'ukraine': { lat: 48.379, lon: 31.165 },
    'kyiv': { lat: 50.450, lon: 30.524 },
    'strait of hormuz': { lat: 26.567, lon: 56.250 },
    'strait of malacca': { lat: 2.5, lon: 101.0 },
    'south china sea': { lat: 15.0, lon: 115.0 },
    'arabian sea': { lat: 15.0, lon: 65.0 },
    'bay of bengal': { lat: 14.0, lon: 87.0 },
    'indian ocean': { lat: 5.0, lon: 75.0 },
    'persian gulf': { lat: 26.0, lon: 52.0 },
    'red sea': { lat: 20.0, lon: 38.5 },
    'mediterranean': { lat: 35.0, lon: 18.0 },
    'pentagon': { lat: 38.872, lon: -77.056 },
    'suez canal': { lat: 30.457, lon: 32.349 },
    'panama canal': { lat: 9.080, lon: -79.681 },
};

export interface IntelligenceResponse {
    location: string;
    coordinates: { lat: number; lon: number };
    summary: string;
    risk_score: number;
    confidence_score: number;
    risk_category: string;
    stability_index: number;
    india_zone: string | null;
    detected_events: {
        type: string;
        description: string;
        severity: number;
        timestamp: string;
    }[];
    predicted_events: {
        type: string;
        description: string;
        timeframe: string;
        confidence: number;
    }[];
    escalation_timeline: {
        level: string;
        trend: string;
        pattern: string | null;
        evolution: string;
    };
    entity_count: {
        flights: number;
        ships: number;
        satellites: number;
        total: number;
    };
    recommended_attention: string;
}

function resolveLocation(query: string): { name: string; lat: number; lon: number } | null {
    const lower = query.toLowerCase().trim();

    // Check known locations
    for (const [name, coords] of Object.entries(KNOWN_LOCATIONS)) {
        if (lower.includes(name)) {
            return { name: name.charAt(0).toUpperCase() + name.slice(1), ...coords };
        }
    }

    // Try to extract coordinates like "20.5, 85.3"
    const coordMatch = lower.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (coordMatch) {
        return {
            name: `${coordMatch[1]}, ${coordMatch[2]}`,
            lat: parseFloat(coordMatch[1]),
            lon: parseFloat(coordMatch[2]),
        };
    }

    return null;
}

export function queryLocation(query: string): IntelligenceResponse | null {
    const location = resolveLocation(query);
    if (!location) return null;

    const RADIUS = 500; // km

    // Get stability report
    const stability = computeStability(location.lat, location.lon, RADIUS, location.name);

    // Get escalation timeline
    const timeline = buildTimeline(location.lat, location.lon, RADIUS, location.name);

    // Get nearby anomalies
    const anomalies = getAnomalies().filter(a => {
        const dlat = a.location.lat - location.lat;
        const dlon = a.location.lon - location.lon;
        return Math.sqrt(dlat * dlat + dlon * dlon) * 111 < RADIUS;
    });

    // Get nearby tracked entities
    const nearbyEntities = TrajectoryStore.getEntitiesNear(location.lat, location.lon, RADIUS);
    const flightCount = nearbyEntities.filter(e => e.type === 'flight').length;
    const shipCount = nearbyEntities.filter(e => e.type === 'ship').length;
    const satCount = nearbyEntities.filter(e => e.type === 'satellite').length;

    // Get convergence predictions
    const convergences = detectConvergences(12).filter(c => {
        const dlat = c.location.lat - location.lat;
        const dlon = c.location.lon - location.lon;
        return Math.sqrt(dlat * dlat + dlon * dlon) * 111 < RADIUS;
    });

    // India zone check
    const indiaZone = isInIndiaZone(location.lat, location.lon);

    // Build risk assessment
    const riskScore = Math.round(
        (100 - stability.overallStabilityIndex) * 0.4 +
        timeline.overallRisk * 0.3 +
        Math.min(100, anomalies.length * 20) * 0.3
    );

    const confidenceScore = Math.min(100, Math.round(
        nearbyEntities.length * 2 +
        anomalies.length * 10 +
        timeline.events.length * 5
    ));

    const riskCategory = riskScore >= 80 ? 'Critical' :
        riskScore >= 60 ? 'High' :
            riskScore >= 35 ? 'Medium' : 'Low';

    // Summary
    const summaryParts: string[] = [];
    summaryParts.push(`${location.name}: ${nearbyEntities.length} entities tracked within ${RADIUS}km.`);
    if (anomalies.length > 0) {
        summaryParts.push(`${anomalies.length} correlated anomalies detected.`);
    }
    if (indiaZone) {
        summaryParts.push(`India Strategic Zone: ${indiaZone.zone} (${indiaZone.priority} priority).`);
    }
    summaryParts.push(`Stability: ${stability.classification}. Escalation: ${timeline.escalationLevel}.`);

    // Recommended attention
    let attention = 'Normal monitoring sufficient.';
    if (riskScore >= 80) attention = 'IMMEDIATE attention required. Activate rapid response protocols.';
    else if (riskScore >= 60) attention = 'Elevated monitoring recommended. Assign dedicated analyst.';
    else if (riskScore >= 35) attention = 'Periodic monitoring. Review in next cycle.';

    return {
        location: location.name,
        coordinates: { lat: location.lat, lon: location.lon },
        summary: summaryParts.join(' '),
        risk_score: riskScore,
        confidence_score: confidenceScore,
        risk_category: riskCategory,
        stability_index: stability.overallStabilityIndex,
        india_zone: indiaZone?.zone || null,
        detected_events: anomalies.slice(0, 10).map(a => ({
            type: a.eventType,
            description: a.justification,
            severity: a.riskScore,
            timestamp: new Date(a.timestamp).toISOString(),
        })),
        predicted_events: convergences.slice(0, 5).map(c => ({
            type: 'convergence',
            description: c.description,
            timeframe: `${c.timeHoursAhead}h ahead`,
            confidence: c.riskScore,
        })),
        escalation_timeline: {
            level: timeline.escalationLevel,
            trend: timeline.trendDirection,
            pattern: timeline.patternDetected,
            evolution: timeline.riskEvolution,
        },
        entity_count: {
            flights: flightCount,
            ships: shipCount,
            satellites: satCount,
            total: nearbyEntities.length,
        },
        recommended_attention: attention,
    };
}
