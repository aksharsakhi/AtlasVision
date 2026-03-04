// ============================================
// Predictive Movement Engine
// Uses trajectory history to predict future positions
// and identify convergence events
// ============================================
import { TrajectoryStore, type TrackedEntity, type TrajectoryPoint } from './trajectory-store';

export interface PredictedPosition {
    entityId: string;
    entityName: string;
    entityType: string;
    currentLat: number;
    currentLon: number;
    predictedLat: number;
    predictedLon: number;
    predictedAlt?: number;
    hoursAhead: number;
    confidence: number; // 0–100
}

export interface ConvergenceEvent {
    id: string;
    location: { lat: number; lon: number };
    entities: { id: string; name: string; type: string }[];
    timeHoursAhead: number;
    radiusKm: number;
    riskScore: number;
    description: string;
}

export interface RiskZone {
    id: string;
    centerLat: number;
    centerLon: number;
    radiusKm: number;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    riskScore: number;
    reason: string;
    timeframe: string;
}

// Linear extrapolation of movement
function predictPosition(entity: TrackedEntity, hoursAhead: number): PredictedPosition | null {
    const traj = entity.trajectory;
    if (traj.length < 2) return null;

    const last = traj[traj.length - 1];
    const prev = traj[traj.length - 2];
    const dt = (last.timestamp - prev.timestamp) / 3600000; // hours
    if (dt <= 0) return null;

    const dLat = (last.lat - prev.lat) / dt * hoursAhead;
    const dLon = (last.lon - prev.lon) / dt * hoursAhead;
    const dAlt = last.alt && prev.alt ? (last.alt - prev.alt) / dt * hoursAhead : 0;

    // Confidence decreases with prediction distance
    const pointCount = Math.min(traj.length, 10);
    const confidence = Math.max(5, Math.round(90 - hoursAhead * 3 - (10 - pointCount) * 5));

    return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        currentLat: last.lat,
        currentLon: last.lon,
        predictedLat: last.lat + dLat,
        predictedLon: last.lon + dLon,
        predictedAlt: last.alt ? last.alt + dAlt : undefined,
        hoursAhead,
        confidence,
    };
}

// Multi-point weighted prediction (uses more history)
function predictPositionWeighted(entity: TrackedEntity, hoursAhead: number): PredictedPosition | null {
    const traj = entity.trajectory;
    if (traj.length < 3) return predictPosition(entity, hoursAhead);

    // Use last N points with exponential weighting
    const n = Math.min(traj.length, 10);
    const recent = traj.slice(-n);

    let weightedDLat = 0, weightedDLon = 0, totalWeight = 0;

    for (let i = 1; i < recent.length; i++) {
        const dt = (recent[i].timestamp - recent[i - 1].timestamp) / 3600000;
        if (dt <= 0) continue;
        const weight = Math.pow(1.5, i); // more recent = higher weight
        weightedDLat += (recent[i].lat - recent[i - 1].lat) / dt * weight;
        weightedDLon += (recent[i].lon - recent[i - 1].lon) / dt * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) return null;

    const avgDLat = weightedDLat / totalWeight * hoursAhead;
    const avgDLon = weightedDLon / totalWeight * hoursAhead;
    const last = traj[traj.length - 1];

    const pointCount = Math.min(traj.length, 10);
    const confidence = Math.max(5, Math.round(85 - hoursAhead * 2.5 - (10 - pointCount) * 3));

    return {
        entityId: entity.id,
        entityName: entity.name,
        entityType: entity.type,
        currentLat: last.lat,
        currentLon: last.lon,
        predictedLat: last.lat + avgDLat,
        predictedLon: last.lon + avgDLon,
        hoursAhead,
        confidence,
    };
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

// Detect convergence events
export function detectConvergences(hoursAhead: number = 12): ConvergenceEvent[] {
    const entities = TrajectoryStore.getAllEntities().filter(e => e.trajectory.length >= 2);
    const predictions = entities
        .map(e => predictPositionWeighted(e, hoursAhead))
        .filter((p): p is PredictedPosition => p !== null);

    const convergences: ConvergenceEvent[] = [];
    const CONVERGENCE_RADIUS = 100; // km

    // Check all pairs (limited to top entities by trajectory length)
    const topPreds = predictions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 200);

    for (let i = 0; i < topPreds.length; i++) {
        for (let j = i + 1; j < topPreds.length; j++) {
            const a = topPreds[i], b = topPreds[j];
            if (a.entityType === b.entityType) continue; // Cross-domain only

            const dist = haversine(a.predictedLat, a.predictedLon, b.predictedLat, b.predictedLon);
            if (dist < CONVERGENCE_RADIUS) {
                const midLat = (a.predictedLat + b.predictedLat) / 2;
                const midLon = (a.predictedLon + b.predictedLon) / 2;
                const riskScore = Math.round((a.confidence + b.confidence) / 2 * 0.7 + 20);

                convergences.push({
                    id: `CONV-${a.entityId}-${b.entityId}`,
                    location: { lat: midLat, lon: midLon },
                    entities: [
                        { id: a.entityId, name: a.entityName, type: a.entityType },
                        { id: b.entityId, name: b.entityName, type: b.entityType },
                    ],
                    timeHoursAhead: hoursAhead,
                    radiusKm: dist,
                    riskScore,
                    description: `Predicted convergence of ${a.entityType} "${a.entityName}" and ${b.entityType} "${b.entityName}" within ${dist.toFixed(0)}km in ~${hoursAhead}h`,
                });
            }
        }
    }

    return convergences.sort((a, b) => b.riskScore - a.riskScore).slice(0, 20);
}

// Forecast risk zones 12-24 hours ahead
export function forecastRiskZones(): RiskZone[] {
    const zones12 = detectConvergences(12);
    const zones24 = detectConvergences(24);

    const riskZones: RiskZone[] = [];

    [...zones12, ...zones24].forEach((conv, i) => {
        const riskLevel = conv.riskScore >= 80 ? 'Critical' :
            conv.riskScore >= 60 ? 'High' :
                conv.riskScore >= 35 ? 'Medium' : 'Low';

        riskZones.push({
            id: `RZ-${i}`,
            centerLat: conv.location.lat,
            centerLon: conv.location.lon,
            radiusKm: Math.max(conv.radiusKm, 50),
            riskLevel,
            riskScore: conv.riskScore,
            reason: conv.description,
            timeframe: `${conv.timeHoursAhead}h ahead`,
        });
    });

    return riskZones;
}

// Get all predictions for an entity
export function getPredictions(entityId: string): PredictedPosition[] {
    const entity = TrajectoryStore.getEntity(entityId);
    if (!entity) return [];

    return [6, 12, 18, 24].map(h => predictPositionWeighted(entity, h)).filter((p): p is PredictedPosition => p !== null);
}
