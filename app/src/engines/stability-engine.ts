// ============================================
// Stability Index Engine
// Computes stability metrics for any location
// ============================================
import { TrajectoryStore } from './trajectory-store';
import { buildTimeline } from './escalation-engine';
import { getAnomalies } from './correlation-engine';

export interface StabilityReport {
    locationName: string;
    location: { lat: number; lon: number };
    activityDensityScore: number;    // 0–100
    militaryActivityScore: number;   // 0–100
    movementVolatilityScore: number; // 0–100
    overallStabilityIndex: number;   // 0–100 (higher = more stable)
    classification: 'Stable' | 'Moderate' | 'Unstable' | 'Critical';
    breakdown: string[];
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

export function computeStability(
    lat: number,
    lon: number,
    radiusKm: number = 500,
    locationName: string = 'Query Zone'
): StabilityReport {
    const breakdown: string[] = [];

    // 1. Activity Density Score
    const nearbyEntities = TrajectoryStore.getEntitiesNear(lat, lon, radiusKm);
    const entityCount = nearbyEntities.length;
    const activityDensityScore = Math.min(100, entityCount * 2); // More entities = higher density
    breakdown.push(`${entityCount} tracked entities within ${radiusKm}km`);

    // 2. Military Activity Score
    const MILITARY_PATTERNS = /^(IAF|SQN|IFC|IN|INS|BSF|ICG|DRAGON|PLA|PAF|RCH|REACH|DUKE|FORTE|NATO|RAF|ASCOT|USS|HMS|WARSHIP)/i;
    const militaryEntities = nearbyEntities.filter(e => MILITARY_PATTERNS.test(e.name));
    const militaryActivityScore = Math.min(100, militaryEntities.length * 15);
    breakdown.push(`${militaryEntities.length} military-pattern entities detected`);

    // 3. Movement Volatility Score
    let totalVolatility = 0;
    let volatilityCount = 0;

    nearbyEntities.forEach(entity => {
        if (entity.trajectory.length < 3) return;
        const t = entity.trajectory;

        // Calculate heading changes (more changes = more volatile)
        let headingChanges = 0;
        for (let i = 2; i < t.length; i++) {
            const h1 = Math.atan2(t[i - 1].lon - t[i - 2].lon, t[i - 1].lat - t[i - 2].lat);
            const h2 = Math.atan2(t[i].lon - t[i - 1].lon, t[i].lat - t[i - 1].lat);
            let diff = Math.abs(h2 - h1);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            if (diff > 0.3) headingChanges++; // Significant course change
        }

        totalVolatility += headingChanges;
        volatilityCount++;
    });

    const avgVolatility = volatilityCount > 0 ? totalVolatility / volatilityCount : 0;
    const movementVolatilityScore = Math.min(100, Math.round(avgVolatility * 20));
    breakdown.push(`Average heading volatility: ${avgVolatility.toFixed(1)} changes per entity`);

    // 4. Factor in anomalies from correlation engine
    const anomalies = getAnomalies().filter(a =>
        haversine(lat, lon, a.location.lat, a.location.lon) <= radiusKm
    );
    const anomalyBonus = Math.min(30, anomalies.length * 10);
    breakdown.push(`${anomalies.length} correlated anomalies nearby`);

    // 5. Factor in escalation timeline
    const timeline = buildTimeline(lat, lon, radiusKm, locationName);
    const escalationBonus = timeline.escalationLevel === 'critical' ? 30 :
        timeline.escalationLevel === 'escalating' ? 20 :
            timeline.escalationLevel === 'building' ? 10 : 0;

    // Overall Stability Index (higher = more stable, i.e., lower threat)
    const instabilityScore = Math.min(100, Math.round(
        activityDensityScore * 0.2 +
        militaryActivityScore * 0.35 +
        movementVolatilityScore * 0.15 +
        anomalyBonus +
        escalationBonus
    ));

    const overallStabilityIndex = 100 - instabilityScore;

    const classification = overallStabilityIndex >= 75 ? 'Stable' :
        overallStabilityIndex >= 50 ? 'Moderate' :
            overallStabilityIndex >= 25 ? 'Unstable' : 'Critical';

    breakdown.push(`Escalation state: ${timeline.escalationLevel}`);
    breakdown.push(`Stability Index: ${overallStabilityIndex}/100 (${classification})`);

    return {
        locationName,
        location: { lat, lon },
        activityDensityScore,
        militaryActivityScore,
        movementVolatilityScore,
        overallStabilityIndex,
        classification,
        breakdown,
    };
}
