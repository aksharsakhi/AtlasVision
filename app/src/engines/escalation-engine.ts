// ============================================
// Escalation Timeline Engine
// Detects event sequences, builds escalation chains,
// identifies pattern repetition, summarizes risk evolution
// ============================================
import { EventBus } from '../utils/event-bus';
import type { CorrelatedAnomaly } from './correlation-engine';

export interface EscalationEvent {
    timestamp: number;
    type: string;
    severity: number;
    description: string;
    location: { lat: number; lon: number };
    signalSources: string[];
}

export interface EscalationTimeline {
    locationName: string;
    location: { lat: number; lon: number };
    events: EscalationEvent[];
    escalationLevel: 'stable' | 'building' | 'escalating' | 'critical';
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    patternDetected: string | null;
    riskEvolution: string;
    overallRisk: number; // 0-100
}

// In-memory event log
const eventLog: EscalationEvent[] = [];
const MAX_LOG_SIZE = 5000;
const LOG_RETENTION_MS = 72 * 60 * 60 * 1000; // 72 hours

export function logEvent(event: EscalationEvent) {
    eventLog.push(event);

    // Trim old events
    const cutoff = Date.now() - LOG_RETENTION_MS;
    while (eventLog.length > 0 && eventLog[0].timestamp < cutoff) {
        eventLog.shift();
    }
    while (eventLog.length > MAX_LOG_SIZE) {
        eventLog.shift();
    }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Build escalation timeline for a specific location
export function buildTimeline(
    lat: number,
    lon: number,
    radiusKm: number = 500,
    locationName: string = 'Unknown'
): EscalationTimeline {
    // Get events near the location
    const nearbyEvents = eventLog.filter(e =>
        haversine(lat, lon, e.location.lat, e.location.lon) <= radiusKm
    ).sort((a, b) => a.timestamp - b.timestamp);

    if (nearbyEvents.length === 0) {
        return {
            locationName,
            location: { lat, lon },
            events: [],
            escalationLevel: 'stable',
            trendDirection: 'stable',
            patternDetected: null,
            riskEvolution: 'No events detected in this area.',
            overallRisk: 0,
        };
    }

    // Analyze severity trend
    const recentCutoff = Date.now() - 6 * 60 * 60 * 1000; // last 6 hours
    const olderCutoff = Date.now() - 24 * 60 * 60 * 1000;

    const recentEvents = nearbyEvents.filter(e => e.timestamp > recentCutoff);
    const olderEvents = nearbyEvents.filter(e => e.timestamp > olderCutoff && e.timestamp <= recentCutoff);

    const recentAvgSeverity = recentEvents.length > 0
        ? recentEvents.reduce((s, e) => s + e.severity, 0) / recentEvents.length : 0;
    const olderAvgSeverity = olderEvents.length > 0
        ? olderEvents.reduce((s, e) => s + e.severity, 0) / olderEvents.length : 0;

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAvgSeverity > olderAvgSeverity + 10) trendDirection = 'increasing';
    else if (recentAvgSeverity < olderAvgSeverity - 10) trendDirection = 'decreasing';

    const maxSeverity = Math.max(...nearbyEvents.map(e => e.severity));
    let escalationLevel: EscalationTimeline['escalationLevel'] = 'stable';
    if (maxSeverity >= 80 && trendDirection === 'increasing') escalationLevel = 'critical';
    else if (maxSeverity >= 60 || trendDirection === 'increasing') escalationLevel = 'escalating';
    else if (recentEvents.length > 3) escalationLevel = 'building';

    // Pattern detection
    let patternDetected: string | null = null;
    const typeSequence = nearbyEvents.map(e => e.type);
    const uniqueTypes = [...new Set(typeSequence)];

    // Check for repeating patterns
    if (typeSequence.length >= 4) {
        for (let len = 2; len <= Math.floor(typeSequence.length / 2); len++) {
            const pattern = typeSequence.slice(0, len).join(',');
            const nextPart = typeSequence.slice(len, len * 2).join(',');
            if (pattern === nextPart) {
                patternDetected = `Repeating pattern: ${typeSequence.slice(0, len).join(' → ')}`;
                break;
            }
        }
    }

    if (!patternDetected && uniqueTypes.length >= 3) {
        patternDetected = `Multi-domain event chain: ${uniqueTypes.join(' → ')}`;
    }

    // Risk evolution summary
    const overallRisk = Math.min(100, Math.round(
        recentAvgSeverity * 0.4 +
        maxSeverity * 0.3 +
        Math.min(30, nearbyEvents.length * 3)
    ));

    const timeParts: string[] = [];
    if (olderEvents.length > 0) {
        timeParts.push(`${olderEvents.length} events in the past 24h (avg severity: ${olderAvgSeverity.toFixed(0)})`);
    }
    if (recentEvents.length > 0) {
        timeParts.push(`${recentEvents.length} events in the last 6h (avg severity: ${recentAvgSeverity.toFixed(0)})`);
    }
    timeParts.push(`Trend: ${trendDirection}. Peak severity: ${maxSeverity}.`);

    return {
        locationName,
        location: { lat, lon },
        events: nearbyEvents.slice(-50), // last 50 events
        escalationLevel,
        trendDirection,
        patternDetected,
        riskEvolution: timeParts.join(' '),
        overallRisk,
    };
}

// Auto-log anomalies from the correlation engine
export function initEscalationEngine() {
    const bus = EventBus.getInstance();

    bus.on('correlation:update', (anomalies: CorrelatedAnomaly[]) => {
        anomalies.forEach(a => {
            logEvent({
                timestamp: a.timestamp,
                type: a.eventType,
                severity: a.riskScore,
                description: a.justification,
                location: a.location,
                signalSources: a.signalSources,
            });
        });
    });
}
