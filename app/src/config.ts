/**
 * GlobalControl Configuration - Industrial Grade
 * Centralized configuration management with environment-based settings
 */

export interface AppConfig {
    api: {
        base: string;
        timeout: number;
        retryAttempts: number;
        retryDelay: number;
    };
    data: {
        updateIntervals: {
            flights: number;
            satellites: number;
            earthquakes: number;
            ships: number;
            news: number;
        };
        cache: {
            enabled: boolean;
            ttl: number;
            maxSize: number;
        };
    };
    map: {
        defaultZoom: number;
        maxZoom: number;
        tileProviders: string[];
        clustering: {
            enabled: boolean;
            radius: number;
            minClusterSize: number;
        };
    };
    security: {
        enableCSP: boolean;
        enableHSTS: boolean;
        enableRateLimiting: boolean;
        maxRequestsPerMinute: number;
    };
    monitoring: {
        enableMetrics: boolean;
        enableLogging: boolean;
        logLevel: 'debug' | 'info' | 'warn' | 'error';
        enableTelemetry: boolean;
    };
    features: {
        enablePredictiveEngine: boolean;
        enableCorrelationEngine: boolean;
        enableEscalationEngine: boolean;
        enableThreatAnalysis: boolean;
        enableRealTimeAlerts: boolean;
        enableHistoricalData: boolean;
    };
}

// Environment-based configuration
const getEnvironment = (): string => {
    if (typeof window !== 'undefined') {
        // Client-side detection
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        }
        if (window.location.hostname.includes('staging')) {
            return 'staging';
        }
        return 'production';
    }
    // Server-side detection
    return process.env.NODE_ENV || 'development';
};

const environment = getEnvironment();

// Add environment property to config interface
interface AppConfigWithEnvironment extends AppConfig {
    environment: string;
}

// Base configuration
const baseConfig: AppConfig = {
    api: {
        base: environment === 'development' ? 'http://localhost:3001' : '/api',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
    },
    data: {
        updateIntervals: {
            flights: 30000,      // 30 seconds
            satellites: 60000,   // 1 minute
            earthquakes: 300000, // 5 minutes
            ships: 60000,        // 1 minute
            news: 120000,        // 2 minutes
        },
        cache: {
            enabled: true,
            ttl: 300000,         // 5 minutes
            maxSize: 1000,
        },
    },
    map: {
        defaultZoom: 2,
        maxZoom: 18,
        tileProviders: [
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        clustering: {
            enabled: true,
            radius: 60,
            minClusterSize: 2,
        },
    },
    security: {
        enableCSP: environment === 'production',
        enableHSTS: environment === 'production',
        enableRateLimiting: environment === 'production',
        maxRequestsPerMinute: 100,
    },
    monitoring: {
        enableMetrics: true,
        enableLogging: environment !== 'production',
        logLevel: environment === 'development' ? 'debug' : 'info',
        enableTelemetry: environment === 'production',
    },
    features: {
        enablePredictiveEngine: true,
        enableCorrelationEngine: true,
        enableEscalationEngine: true,
        enableThreatAnalysis: true,
        enableRealTimeAlerts: true,
        enableHistoricalData: true,
    },
};

// Environment-specific overrides
const environmentOverrides: Record<string, Partial<AppConfig>> = {
    development: {
        api: {
            base: 'http://localhost:3001',
            timeout: 60000,
            retryAttempts: 5,
            retryDelay: 1000,
        },
        monitoring: {
            enableMetrics: true,
            enableLogging: true,
            logLevel: 'debug',
            enableTelemetry: false,
        },
        features: {
            enablePredictiveEngine: true,
            enableCorrelationEngine: true,
            enableEscalationEngine: true,
            enableThreatAnalysis: true,
            enableRealTimeAlerts: false, // Reduce noise in dev
            enableHistoricalData: true,
        },
    },
    staging: {
        api: {
            base: '/api',
            timeout: 45000,
            retryAttempts: 3,
            retryDelay: 1000,
        },
        monitoring: {
            enableMetrics: true,
            enableLogging: true,
            logLevel: 'info',
            enableTelemetry: true,
        },
    },
    production: {
        api: {
            base: '/api',
            timeout: 20000,
            retryAttempts: 2,
            retryDelay: 1000,
        },
        data: {
            updateIntervals: {
                flights: 60000,      // Less frequent in production
                satellites: 120000,
                earthquakes: 600000,
                ships: 120000,
                news: 300000,
            },
            cache: {
                enabled: true,
                ttl: 600000,         // 10 minutes in production
                maxSize: 2000,
            },
        },
        monitoring: {
            enableMetrics: true,
            enableLogging: false,
            logLevel: 'warn',
            enableTelemetry: true,
        },
    },
};

// Merge configurations
export const config: AppConfig = {
    ...baseConfig,
    ...environmentOverrides[environment as keyof typeof environmentOverrides],
};

// Feature flags utility
export const featureFlags = {
    isFeatureEnabled: (feature: keyof AppConfig['features']): boolean => {
        return config.features[feature];
    },

    enableFeature: (feature: keyof AppConfig['features']): void => {
        config.features[feature] = true;
    },

    disableFeature: (feature: keyof AppConfig['features']): void => {
        config.features[feature] = false;
    },
};

// API endpoints configuration
export const API_ENDPOINTS = {
    // Data sources
    FLIGHTS: '/api/flights',
    SATELLITES: '/api/satellites',
    EARTHQUAKES: '/api/earthquakes',
    SHIPS: '/api/ships',
    NEWS: '/api/news',

    // Engines
    CORRELATION: '/api/correlation',
    PREDICTIVE: '/api/predictive',
    ESCALATION: '/api/escalation',
    THREAT: '/api/threat',

    // External APIs
    OPENSKY: 'https://opensky-network.org/api/states/all',
    CELESTRAK: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
    USGS: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
    NASA_APOD: 'https://api.nasa.gov/planetary/apod',
    SPACE_NEWS: 'https://spaceflightnewsapi.net/api/v2/articles',
    NEO: 'https://api.nasa.gov/neo/rest/v1/feed',
    LAUNCHES: 'https://ll.thespacedevs.com/2.2.0/launch/upcoming',

    // Proxies
    RSS_PROXY: '/api/rss',
    CORS_PROXY: '/api/proxy',
} as const;

// Export environment for debugging
export { environment };