// ============================================
// Threat Engine — Composite Scoring
// Inspired by Pentagon Pizza + WorldMonitor CII
// ============================================
import { EventBus } from '../utils/event-bus';
import { ThreatLevel, getThreatScore } from '../data/threat-keywords';

interface SignalData {
    flightCount: number;
    satelliteCount: number;
    earthquakeCount: number;
    newsCount: number;
    newsItems: { severity: ThreatLevel }[];
    earthquakes: { magnitude: number }[];
}

const signals: SignalData = {
    flightCount: 0,
    satelliteCount: 0,
    earthquakeCount: 0,
    newsCount: 0,
    newsItems: [],
    earthquakes: [],
};

let previousScore = 0;

function computeCompositeScore(): number {
    // News-based threat (40% weight)
    const newsScore = getThreatScore(signals.newsItems);

    // Earthquake severity (20% weight)
    let quakeScore = 0;
    if (signals.earthquakes.length > 0) {
        const maxMag = Math.max(...signals.earthquakes.map(q => q.magnitude));
        quakeScore = Math.min(100, (maxMag - 4) * 25); // M4=0, M5=25, M6=50, M7=75, M8=100
        quakeScore += Math.min(30, signals.earthquakes.length * 3); // volume bonus
        quakeScore = Math.min(100, quakeScore);
    }

    // Flight activity anomaly (20% weight)
    // High flight count is normal (20k-40k), anomaly is very low or very high
    let flightScore = 0;
    if (signals.flightCount > 0) {
        if (signals.flightCount < 5000) flightScore = 60; // unusually low
        else if (signals.flightCount > 50000) flightScore = 40; // unusually high
        else flightScore = 10; // normal
    }

    // Satellite count (10% weight, mostly informational)
    const satScore = signals.satelliteCount > 0 ? 5 : 0;

    // News volume spike (10% weight)
    const volumeScore = Math.min(50, signals.newsCount / 2);

    // Weighted composite
    const composite = Math.round(
        newsScore * 0.4 +
        quakeScore * 0.2 +
        flightScore * 0.2 +
        satScore * 0.1 +
        volumeScore * 0.1
    );

    return Math.min(100, Math.max(0, composite));
}

function getThreatLabel(score: number): { label: string; class: string } {
    if (score >= 80) return { label: 'CRITICAL', class: 'level-critical' };
    if (score >= 65) return { label: 'SEVERE', class: 'level-severe' };
    if (score >= 50) return { label: 'HIGH', class: 'level-high' };
    if (score >= 35) return { label: 'ELEVATED', class: 'level-elevated' };
    if (score >= 20) return { label: 'GUARDED', class: 'level-guarded' };
    return { label: 'LOW', class: 'level-low' };
}

function getTrend(current: number, previous: number): string {
    const delta = current - previous;
    if (delta > 3) return '▲ Escalating';
    if (delta < -3) return '▼ De-escalating';
    return '● Stable';
}

function updateUI() {
    const score = computeCompositeScore();
    const threat = getThreatLabel(score);
    const trend = getTrend(score, previousScore);

    // Update gauge
    const gaugeFill = document.getElementById('gauge-fill');
    if (gaugeFill) {
        const maxDash = 251;
        const offset = maxDash - (score / 100) * maxDash;
        gaugeFill.setAttribute('stroke-dashoffset', offset.toString());
    }

    // Update value
    const gaugeValue = document.getElementById('gauge-value');
    if (gaugeValue) gaugeValue.textContent = score.toString();

    // Update badge
    const badge = document.getElementById('threat-badge');
    if (badge) {
        badge.textContent = threat.label;
        badge.className = `threat-badge ${threat.class}`;
    }

    // Update trend
    const trendEl = document.getElementById('threat-trend');
    if (trendEl) trendEl.textContent = trend;

    previousScore = score;

    // Generate AI brief
    updateAIBrief(score, threat.label);
}

function updateAIBrief(score: number, level: string) {
    const briefEl = document.getElementById('ai-brief');
    if (!briefEl) return;

    // Construct a real brief from actual data
    const parts: string[] = [];

    if (signals.newsItems.length > 0) {
        const critCount = signals.newsItems.filter(n => n.severity === 'critical').length;
        const highCount = signals.newsItems.filter(n => n.severity === 'high').length;

        if (critCount > 0) {
            parts.push(`<strong>${critCount} critical alerts</strong> detected across global news feeds.`);
        }
        if (highCount > 0) {
            parts.push(`${highCount} high-severity events currently being monitored.`);
        }
        parts.push(`Monitoring <strong>${signals.newsItems.length}</strong> news items from 15+ international sources.`);
    }

    if (signals.earthquakes.length > 0) {
        const maxMag = Math.max(...signals.earthquakes.map(q => q.magnitude));
        parts.push(`<strong>${signals.earthquakes.length}</strong> significant earthquakes (M4.5+) in the past 7 days. Strongest: M${maxMag.toFixed(1)}.`);
    }

    if (signals.flightCount > 0) {
        parts.push(`Tracking <strong>${signals.flightCount.toLocaleString()}</strong> aircraft in real-time via the OpenSky Network.`);
    }

    if (signals.satelliteCount > 0) {
        parts.push(`<strong>${signals.satelliteCount.toLocaleString()}</strong> satellites tracked from CelesTrak TLE data, orbits propagated with SGP4.`);
    }

    parts.push(`<em>Global threat level: ${level} (${score}/100). All data sourced from live, real-time APIs.</em>`);

    briefEl.innerHTML = parts.map(p => `<p>${p}</p>`).join('');
}

export function initThreatEngine() {
    const bus = EventBus.getInstance();

    bus.on('data:flights', (data: any) => {
        signals.flightCount = data.count;
        updateUI();
    });

    bus.on('data:satellites', (data: any) => {
        signals.satelliteCount = data.count;
        updateUI();
    });

    bus.on('data:earthquakes', (data: any) => {
        signals.earthquakeCount = data.count;
        signals.earthquakes = data.quakes || [];
        updateUI();
    });

    bus.on('data:news', (data: any) => {
        signals.newsCount = data.count;
        signals.newsItems = data.news || [];
        updateUI();
    });

    // Initial render
    updateUI();
}
