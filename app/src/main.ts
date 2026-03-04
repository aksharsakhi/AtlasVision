// ============================================
// GlobalControl v4.0 — Industrial Grade
// Enhanced Performance, Monitoring, Security & Reliability
// ============================================
import './style.css';
import { config, featureFlags, environment } from './config';
import { httpClient } from './utils/http-client';
import { monitoring, startTimer, endTimer, reportError, recordMetric, recordUserAction } from './utils/monitoring';
import { initMap, initRegionPresets, getMap } from './map/map-engine';
import { initFlightLayer } from './layers/flights';
import { initSatelliteLayer } from './layers/satellites';
import { initEarthquakeLayer } from './layers/earthquakes';
import { initShipLayer } from './layers/ships';
import { initISSTracker } from './layers/iss-tracker';
import { initNewsPanel } from './panels/news-panel';
import { initVideoPanel } from './panels/video-panel';
import { initThreatEngine } from './panels/threat-engine';
import { initIntelCyberBoard, intelCyberMap } from './panels/intel-cyber-board';
import { initHealthDashboard, healthMap } from './panels/health-dashboard';
import { initWarBoard, warMap } from './panels/war-board';
import { initFinanceBoard } from './panels/finance-board';
import { initFlightsDashboard, flightMap } from './panels/flights-dashboard';
import { initSatellitesDashboard, satelliteMap } from './panels/satellites-dashboard';
import { initIntelConsole } from './panels/intel-console';
import { initNEOTracker } from './panels/neo-tracker';
import { initPlanetTracker } from './panels/planet-tracker';
import { initSpaceNews } from './panels/space-news';
import { initPassPredictor } from './panels/pass-predictor';
import { initWeatherPanel } from './panels/weather-panel';
import { initLaunchCalendar } from './panels/launch-calendar';
import { initAPOD } from './panels/apod';
import { initClock } from './utils/clock';
import { initLayerToggles } from './utils/layer-toggles';
import { initResizers } from './utils/resizer';
import { initCorrelationEngine } from './engines/correlation-engine';
import { initEscalationEngine } from './engines/escalation-engine';
import { initIndiaZonesPanel } from './panels/india-zones-panel';
import { TrajectoryStore } from './engines/trajectory-store';
import { EventBus } from './utils/event-bus';
import { queryLocation } from './engines/query-engine';
import { initGlobe } from './globe/globe';
import * as L from 'leaflet';

// Performance monitoring
const initTimer = startTimer('globalcontrol_init');

async function main() {
  try {
    console.log('%c🚀 AtlasVision v4.0 — Industrial Grade', 'color: #00d4ff; font-size: 16px; font-weight: bold;');
    console.log('%c🏗️  Enhanced Architecture: Configuration, HTTP Client, Monitoring', 'color: #69f0ae; font-size: 12px;');

    // Initialize monitoring system
    recordMetric('app_start', 1, 'count', { environment: environment });

    const bus = EventBus.getInstance();
    initClock();
    initPageNavigation();
    initResizers();

    // Leaflet Map (FREE)
    const mapTimer = startTimer('map_init');
    const map = initMap();
    endTimer(mapTimer);

    (window as any).__gcMap = map;
    initRegionPresets();
    initLayerToggles();

    // Initialize data layers with error handling
    const layersTimer = startTimer('layers_init');
    try {
      initFlightLayer();
      initShipLayer();
      initSatelliteLayer();
      initEarthquakeLayer();
      initISSTracker();
      recordMetric('layers_initialized', 5, 'count');
    } catch (error) {
      reportError(error as Error, 'error', { component: 'layers' });
    }
    endTimer(layersTimer);

    // Initialize panels
    const panelsTimer = startTimer('panels_init');
    try {
      initNewsPanel();
      initVideoPanel();
      initThreatEngine();
      initIntelConsole();
      recordMetric('panels_initialized', 4, 'count');
    } catch (error) {
      reportError(error as Error, 'error', { component: 'panels' });
    }
    endTimer(panelsTimer);

    // Initialize space features
    if (featureFlags.isFeatureEnabled('enableHistoricalData')) {
      const spaceTimer = startTimer('space_features_init');
      try {
        initNEOTracker();
        initPlanetTracker();
        initSpaceNews();
        initWeatherPanel();
        initLaunchCalendar();
        initAPOD();
        setTimeout(() => initPassPredictor(), 5000);
        recordMetric('space_features_initialized', 6, 'count');
      } catch (error) {
        reportError(error as Error, 'error', { component: 'space_features' });
      }
      endTimer(spaceTimer);
    }

    // Initialize advanced features (war, intel/cyber merged, finance, flights, satellites, health)
    const advancedTimer = startTimer('advanced_features_init');
    try {
      initWarBoard();
      initIntelCyberBoard();
      initHealthDashboard();
      initFinanceBoard();
      initFlightsDashboard();
      initSatellitesDashboard();
      recordMetric('advanced_features_initialized', 6, 'count');
    } catch (error) {
      reportError(error as Error, 'error', { component: 'advanced_features' });
    }
    endTimer(advancedTimer);

    // Initialize engines
    const enginesTimer = startTimer('engines_init');
    try {
      initCorrelationEngine();
      initEscalationEngine();
      initIndiaZonesPanel();
      recordMetric('engines_initialized', 3, 'count');
    } catch (error) {
      reportError(error as Error, 'error', { component: 'engines' });
    }
    endTimer(enginesTimer);

    // Setup data tracking
    setupDataTracking(bus);

    // Setup Geolocation (globe init is lazy — happens on first toggle click)
    setupGeolocation();

    // Setup correlation monitoring
    setupCorrelationMonitoring(bus);

    // Periodic cleanup and monitoring
    setupPeriodicTasks();

    // Initialize deep query with enhanced error handling
    initDeepQuery();

    // Health check
    await performHealthCheck();

    const initDuration = endTimer(initTimer);
    recordMetric('app_init_duration', initDuration?.duration || 0, 'ms');

    console.log('%c✅ AtlasVision v4.0 Operational — %cIndustrial Grade Systems Active', 'color: #00e676; font-size: 13px; font-weight: bold;', 'color: #00d4ff; font-size: 13px;');
    console.log(`📊 Performance: Init completed in ${initDuration?.duration?.toFixed(2) || 'N/A'}ms`);

    // Display health summary
    const health = monitoring.getHealthSummary();
    console.log(`🏥 System Health: ${health.overall} (${health.uptime}ms uptime, ${health.errorsCount} errors, ${health.metricsCount} metrics)`);

  } catch (error) {
    reportError(error as Error, 'error', { component: 'main' });
    console.error('❌ AtlasVision initialization failed:', error);

    // Fallback UI
    showInitializationError(error);
  }
}

function setupDataTracking(bus: EventBus) {
  bus.on('data:flights', (data: any) => {
    recordMetric('data_flights_update', 1, 'count', { count: data.count });

    (data.flights || []).forEach((f: any) => {
      if (f.latitude && f.longitude) {
        TrajectoryStore.addPoint(f.icao24 || f.callsign, 'flight', f.callsign || f.icao24, {
          lat: f.latitude, lon: f.longitude, alt: f.altitude || 0,
          timestamp: Date.now(), velocity: f.velocity || 0, heading: f.heading || 0,
        });
      }
    });
  });

  bus.on('data:satellites', (data: any) => {
    recordMetric('data_satellites_update', 1, 'count', { count: data.count });
  });

  bus.on('data:earthquakes', (data: any) => {
    recordMetric('data_earthquakes_update', 1, 'count', { count: data.count });
  });

  bus.on('data:ships', (data: any) => {
    recordMetric('data_ships_update', 1, 'count', { count: data.count });
  });

  bus.on('data:news', (data: any) => {
    recordMetric('data_news_update', 1, 'count', { count: data.count });
  });
}

function setupCorrelationMonitoring(bus: EventBus) {
  bus.on('correlation:update', (anomalies: any[]) => {
    recordMetric('correlation_anomalies', anomalies.length, 'count');

    const badge = document.getElementById('correlation-badge');
    const corCount = document.getElementById('cor-count');
    const sigAnom = document.getElementById('sig-anomalies');

    if (anomalies.length > 0 && badge) {
      badge.style.display = 'flex';
      if (corCount) corCount.textContent = `${anomalies.length} anomalies`;
    }
    if (sigAnom) sigAnom.textContent = anomalies.length.toString();
  });
}

function setupPeriodicTasks() {
  // Trajectory cleanup
  setInterval(() => {
    const cleanupTimer = startTimer('trajectory_cleanup');
    TrajectoryStore.prune();
    endTimer(cleanupTimer);
  }, 300000); // Every 5 minutes

  // Memory monitoring
  setInterval(() => {
    const memory = monitoring.getMemoryUsage();
    if (memory) {
      recordMetric('memory_usage', memory.percentage, 'percent', {
        used: memory.used.toString(),
        total: memory.total.toString(),
      });

      // Alert on high memory usage
      if (memory.percentage > 80) {
        reportError(new Error(`High memory usage: ${memory.percentage.toFixed(2)}%`), 'warn', {
          memory: memory.percentage,
          used: memory.used,
          total: memory.total,
        });
      }
    }
  }, 60000); // Every minute

  // Performance monitoring
  setInterval(() => {
    const analytics = monitoring.getPerformanceAnalytics();
    recordMetric('avg_load_time', analytics.avgLoadTime, 'ms');

    // Alert on slow operations
    analytics.slowestOperations.forEach(op => {
      if (op.duration > 5000) { // Operations taking more than 5 seconds
        reportError(new Error(`Slow operation: ${op.name} took ${op.duration.toFixed(2)}ms`), 'warn', {
          operation: op.name,
          duration: op.duration,
        });
      }
    });
  }, 300000); // Every 5 minutes
}

async function performHealthCheck() {
  try {
    const healthTimer = startTimer('health_check');

    // Check API connectivity
    await monitoring.runHealthCheck('api_connectivity', async () => {
      try {
        const response = await httpClient.get('/api/health');
        return response.status === 200;
      } catch {
        return false;
      }
    });

    // Check data sources
    await monitoring.runHealthCheck('data_sources', async () => {
      try {
        // Test flight data
        await httpClient.getFlights({ timeout: 10000 });
        // Test satellite data
        await httpClient.getSatellites({ timeout: 10000 });
        return true;
      } catch {
        return false;
      }
    });

    endTimer(healthTimer);
    recordMetric('health_check_passed', 1, 'count');
  } catch (error) {
    reportError(error as Error, 'warn', { component: 'health_check' });
  }
}

function initDeepQuery() {
  const input = document.getElementById('deep-query-input') as HTMLInputElement;
  const btn = document.getElementById('deep-query-btn');
  const output = document.getElementById('deep-query-output');
  if (!input || !btn || !output) return;

  function execute() {
    const queryTimer = startTimer('deep_query');

    try {
      const q = input.value.trim();
      if (!q) return;

      recordUserAction('deep_query', { query: q });

      const result = queryLocation(q);
      if (!result) {
        if (output) {
          output.innerHTML = '<p class="text-muted text-xs">Location not recognized. Try: Mumbai, LAC, South China Sea, Taiwan...</p>';
        }
        endTimer(queryTimer);
        return;
      }

      if (output) {
        output.innerHTML = `
          <div class="deep-result">
            <h3>📍 ${result.location}</h3>
            ${result.coordinates ? `<span class="coords">(${result.coordinates.lat.toFixed(4)}, ${result.coordinates.lon.toFixed(4)})</span>` : ''}
            <p class="qr-summary">${result.summary}</p>
            <div class="qr-scores">
              <div class="qr-score-card"><span class="qr-score-value" style="color:${result.risk_score >= 60 ? '#ff5252' : '#69f0ae'}">${result.risk_score}</span><span class="qr-score-label">Risk</span></div>
              <div class="qr-score-card"><span class="qr-score-value">${result.confidence_score}</span><span class="qr-score-label">Confidence</span></div>
              <div class="qr-score-card"><span class="qr-score-value" style="color:${result.stability_index >= 50 ? '#69f0ae' : '#ff5252'}">${result.stability_index}</span><span class="qr-score-label">Stability</span></div>
              <div class="qr-score-card"><span class="qr-score-value">${result.risk_category}</span><span class="qr-score-label">Category</span></div>
            </div>
            <div class="qr-entities"><span>✈️ ${result.entity_count.flights}</span><span>🚢 ${result.entity_count.ships}</span><span>🛰️ ${result.entity_count.satellites}</span></div>
            <div class="qr-section"><h5>Escalation</h5><span class="esc-level esc-${result.escalation_timeline.level}">${result.escalation_timeline.level.toUpperCase()}</span> <span class="esc-trend">Trend: ${result.escalation_timeline.trend}</span></div>
            <div class="qr-attention"><strong>⚡</strong> ${result.recommended_attention}</div>
            <details class="qr-json-toggle"><summary>Raw JSON</summary><pre class="qr-json">${JSON.stringify(result, null, 2)}</pre></details>
          </div>
        `;

        recordMetric('deep_query_success', 1, 'count', {
          location: result.location,
          risk_score: result.risk_score.toString(),
          confidence: result.confidence_score.toString(),
        });
      }

    } catch (error) {
      reportError(error as Error, 'error', { component: 'deep_query', query: input.value });
      if (output) {
        output.innerHTML = '<p class="text-error">Query failed. Please try again.</p>';
      }
    } finally {
      endTimer(queryTimer);
    }
  }

  btn.addEventListener('click', execute);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') execute();
  });
}

function showInitializationError(error: any) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #000; color: #e8e8e8; text-align: center; padding: 20px;">
        <h1 style="color: #ff5252; margin-bottom: 10px;">System Initialization Failed</h1>
        <p style="margin-bottom: 20px; color: #999;">${error.message || 'An unexpected error occurred during system initialization.'}</p>
        <div style="display: flex; gap: 10px;">
          <button onclick="location.reload()" style="padding: 10px 20px; background: #00d4ff; color: #000; border: none; border-radius: 4px; cursor: pointer;">Retry</button>
          <button onclick="console.log('Error details:', ${JSON.stringify(error)})" style="padding: 10px 20px; background: #333; color: #e8e8e8; border: 1px solid #555; border-radius: 4px; cursor: pointer;">Debug</button>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Please check the browser console for detailed error information.</p>
      </div>
    `;
  }
}

// Page navigation function
function initPageNavigation() {
  const tabs = document.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>;
  const pages = document.querySelectorAll('.page') as NodeListOf<HTMLDivElement>;

  // Normal Dashboard Pages
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const pg = tab.dataset.page;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      pages.forEach(p => p.classList.toggle('active', p.id === `page-${pg}`));

      setTimeout(() => {
        if (pg === 'dashboard') getMap()?.invalidateSize();
        // 'space' tab shows 'page-satellites' (merged Space & Satellites)
        if (pg === 'space') {
          pages.forEach(p => p.classList.toggle('active', p.id === 'page-satellites'));
        }
        if (pg === 'intel-cyber' && intelCyberMap) intelCyberMap.invalidateSize();
        if (pg === 'war' && warMap) warMap.invalidateSize();
        if (pg === 'flights' && flightMap) flightMap.invalidateSize();
        if ((pg === 'satellites' || pg === 'space') && satelliteMap) satelliteMap.invalidateSize();
        if (pg === 'health' && healthMap) healthMap.invalidateSize();
      }, 100);
    });
  });

  // Global 3D Globe Overlay Toggle — lazy init (Cesium only loads on first click)
  const globeBtn = document.getElementById('btn-global-globe-toggle');
  const globeOverlay = document.getElementById('page-globe');

  if (globeBtn && globeOverlay) {
    let globeVisible = false;
    let globeInitialized = false;

    const updateGlobePosition = () => {
      if (!globeVisible) return;
      const activePage = document.querySelector('.page.active');
      if (!activePage) return;

      const targetMapContainer = (
        activePage.querySelector('.map-section .glass-panel') ||
        activePage.querySelector('#map')?.parentElement
      ) as HTMLElement | null;

      if (targetMapContainer) {
        const rect = targetMapContainer.getBoundingClientRect();
        Object.assign(globeOverlay.style, {
          position: 'fixed',
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          zIndex: '9000',
          display: 'flex',
          opacity: '1',
          pointerEvents: 'all',
          borderRadius: getComputedStyle(targetMapContainer).borderRadius,
        });
        // Force Cesium canvas to match new dimensions
        window.dispatchEvent(new Event('resize'));
      }
    };

    window.addEventListener('resize', updateGlobePosition);

    globeBtn.addEventListener('click', async () => {
      globeVisible = !globeVisible;

      if (globeVisible) {
        // First-time lazy init of Cesium
        if (!globeInitialized) {
          globeBtn.innerHTML = '⏳';
          globeBtn.style.pointerEvents = 'none';
          try {
            await initGlobe();
            globeInitialized = true;
          } catch (err) {
            console.warn('Globe init failed:', err);
            globeBtn.innerHTML = '🌍';
            globeBtn.style.pointerEvents = 'auto';
            globeVisible = false;
            return;
          }
          globeBtn.style.pointerEvents = 'auto';
        }

        globeBtn.innerHTML = '✕';
        globeBtn.title = 'Close 3D View';
        globeBtn.style.background = '#00e5ff';
        globeBtn.style.color = '#000';
        updateGlobePosition();
      } else {
        Object.assign(globeOverlay.style, {
          opacity: '0',
          pointerEvents: 'none',
          display: 'none',
        });
        globeBtn.innerHTML = '🌍';
        globeBtn.style.background = 'rgba(0,212,255,0.2)';
        globeBtn.style.color = '#00e5ff';
        globeBtn.title = 'Toggle 3D Globe View';
      }
    });

    // Reposition globe when switching tabs if it's open
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (globeVisible) setTimeout(updateGlobePosition, 150);
      });
    });
  }
}

// Global error boundary
window.addEventListener('error', (event) => {
  reportError(event.error || event.message, 'error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

// User geolocation handler
let geoMarker: L.CircleMarker | null = null;
function setupGeolocation() {
  const btn = document.getElementById('btn-geolocate');
  if (btn) {
    btn.addEventListener('click', () => {
      const m = getMap();
      if (!m) return;
      btn.innerHTML = '🔄 Locating...';
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        m.flyTo([latitude, longitude], 10, { animate: true, duration: 1.5 });
        if (geoMarker) {
          m.removeLayer(geoMarker);
        }
        geoMarker = L.circleMarker([latitude, longitude], { radius: 10, color: '#00e5ff', fillColor: '#00e5ff', fillOpacity: 0.5, weight: 3, className: 'pulse' }).addTo(m);
        geoMarker.bindPopup('<b style="color:#00e5ff;">📍 Your Location</b>').openPopup();
        btn.innerHTML = '📍 My Location';
      }, (error) => {
        console.error('Geolocation error:', error);
        btn.innerHTML = '❌ Location Denied';
        setTimeout(() => btn.innerHTML = '📍 My Location', 3000);
      });
    });
  }
}

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, 'error', { type: 'unhandled_promise_rejection' });
});

// Graceful shutdown
window.addEventListener('beforeunload', () => {
  recordMetric('app_unload', 1, 'count');
  monitoring.cleanup();
});

// Start application
main().catch(err => {
  reportError(err, 'error', { component: 'main' });
  console.error('❌ AtlasVision v4.0 failed to start:', err);
});
