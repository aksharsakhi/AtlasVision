// ============================================
// Threat Classification Keywords
// Inspired by WorldMonitor + Pentagon Pizza
// ============================================

export type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface KeywordSet {
    level: ThreatLevel;
    keywords: string[];
}

const THREAT_KEYWORDS: KeywordSet[] = [
    {
        level: 'critical',
        keywords: [
            'nuclear strike', 'nuclear attack', 'nuclear war', 'nuclear weapon',
            'DEFCON', 'invasion', 'declaration of war', 'martial law',
            'genocide', 'chemical attack', 'biological weapon', 'mass casualty',
            'world war', 'occupation', 'coup d\'état', 'ICBM', 'ballistic missile launch',
            'state of emergency', 'terrorist attack', 'mass shooting',
        ],
    },
    {
        level: 'high',
        keywords: [
            'war', 'airstrike', 'air strike', 'bombing', 'missile', 'rocket attack',
            'artillery', 'troops deployed', 'military operation', 'offensive',
            'drone strike', 'drone attack', 'ceasefire violation', 'assassination',
            'armed conflict', 'escalation', 'casualties', 'killed', 'deaths',
            'explosion', 'terror', 'hostage', 'siege', 'combat',
            'sanctions', 'embargo', 'blockade', 'nuclear', 'weapons',
            'cyber attack', 'cyberattack', 'ransomware', 'hack',
            'earthquake', 'tsunami', 'eruption',
        ],
    },
    {
        level: 'medium',
        keywords: [
            'protest', 'protests', 'riot', 'unrest', 'demonstration',
            'tension', 'tensions', 'crisis', 'conflict', 'clash',
            'military', 'troops', 'naval', 'fighter jet', 'warship',
            'deployment', 'NATO', 'exercises', 'drill', 'maneuvers',
            'refugee', 'displaced', 'migration', 'humanitarian',
            'inflation', 'recession', 'crash', 'collapse', 'default',
            'wildfire', 'hurricane', 'typhoon', 'flood', 'drought',
            'pandemic', 'outbreak', 'epidemic', 'virus',
        ],
    },
    {
        level: 'low',
        keywords: [
            'election', 'vote', 'treaty', 'agreement', 'summit',
            'negotiation', 'diplomacy', 'peace talks', 'ceasefire',
            'trade', 'tariff', 'regulation', 'policy', 'legislation',
            'climate', 'environment', 'energy', 'oil', 'gas',
            'intelligence', 'surveillance', 'espionage',
        ],
    },
];

export function classifyThreat(text: string): ThreatLevel {
    const lower = text.toLowerCase();

    for (const set of THREAT_KEYWORDS) {
        for (const keyword of set.keywords) {
            if (lower.includes(keyword.toLowerCase())) {
                return set.level;
            }
        }
    }

    return 'info';
}

export function getThreatScore(items: { severity: ThreatLevel }[]): number {
    let score = 0;
    const weights: Record<ThreatLevel, number> = {
        critical: 25,
        high: 15,
        medium: 8,
        low: 3,
        info: 1,
    };

    items.forEach(item => {
        score += weights[item.severity];
    });

    // Normalize to 0-100
    return Math.min(100, Math.round(score / Math.max(1, items.length) * 10));
}
