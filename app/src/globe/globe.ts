// ============================================
// CesiumJS 3D Globe Initialization
// ============================================
import * as Cesium from 'cesium';

(globalThis as any).CESIUM_BASE_URL = 'https://unpkg.com/cesium@1.129.0/Build/Cesium/';

// Set Cesium Ion access token (free tier)
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkY2M5MTFiYy1iMDRjLTRiZDQtOWY2MC1kN2Y1Yzg4YzIyOTMiLCJpZCI6MjYzNTgyLCJpYXQiOjE3MzQ2MTg4MjN9.V7hFhZ0gMJCFRJhRWyiksP2KhNsyx3lRhzsMxhXYzSM';

let viewerInstance: Cesium.Viewer | null = null;

export async function initGlobe(): Promise<Cesium.Viewer> {
    const container = document.getElementById('cesium-container');
    if (!container) throw new Error('Globe container not found');

    // Create the viewer with dark theme settings
    const viewer = new Cesium.Viewer(container, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        creditContainer: document.createElement('div'), // hide credits
        skyAtmosphere: new Cesium.SkyAtmosphere(),
        requestRenderMode: false,
    });

    // Style the globe
    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.globe.atmosphereLightIntensity = 8.0;
    scene.fog.enabled = true;
    scene.fog.density = 0.0003;
    scene.backgroundColor = Cesium.Color.fromCssColorString('#060a13');

    // Set initial camera position (overview of the world)
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(30, 20, 20000000),
        orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0.0,
        },
    });

    // Enable entity picking
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement: any) => {
        const picked = viewer.scene.pick(movement.position);
        if (Cesium.defined(picked) && picked.id) {
            showEntityInfo(picked.id);
        } else {
            hideEntityInfo();
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerInstance = viewer;
    return viewer;
}

export function getViewer(): Cesium.Viewer | null {
    return viewerInstance;
}

function showEntityInfo(entity: Cesium.Entity) {
    const panel = document.getElementById('entity-info')!;
    const content = document.getElementById('entity-content')!;

    const props = entity.properties;
    if (!props) {
        panel.style.display = 'none';
        return;
    }

    const type = props.type?.getValue(Cesium.JulianDate.now()) || 'Unknown';
    let html = `<h4>${entity.name || 'Entity'}</h4>`;

    if (type === 'flight') {
        html += `
      <div class="info-row"><span class="info-label">Callsign</span><span class="info-value">${props.callsign?.getValue(Cesium.JulianDate.now()) || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Origin</span><span class="info-value">${props.origin?.getValue(Cesium.JulianDate.now()) || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Altitude</span><span class="info-value">${props.altitude?.getValue(Cesium.JulianDate.now()) || 'N/A'} m</span></div>
      <div class="info-row"><span class="info-label">Velocity</span><span class="info-value">${props.velocity?.getValue(Cesium.JulianDate.now()) || 'N/A'} m/s</span></div>
      <div class="info-row"><span class="info-label">Heading</span><span class="info-value">${(props.heading?.getValue(Cesium.JulianDate.now()) || 0).toFixed(1)}°</span></div>
      <div class="info-row"><span class="info-label">On Ground</span><span class="info-value">${props.onGround?.getValue(Cesium.JulianDate.now()) ? 'Yes' : 'No'}</span></div>
    `;
    } else if (type === 'satellite') {
        html += `
      <div class="info-row"><span class="info-label">NORAD ID</span><span class="info-value">${props.noradId?.getValue(Cesium.JulianDate.now()) || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Altitude</span><span class="info-value">${(props.altitude?.getValue(Cesium.JulianDate.now()) || 0).toFixed(0)} km</span></div>
      <div class="info-row"><span class="info-label">Period</span><span class="info-value">${(props.period?.getValue(Cesium.JulianDate.now()) || 0).toFixed(1)} min</span></div>
    `;
    } else if (type === 'earthquake') {
        html += `
      <div class="info-row"><span class="info-label">Magnitude</span><span class="info-value">${props.magnitude?.getValue(Cesium.JulianDate.now()) || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Depth</span><span class="info-value">${props.depth?.getValue(Cesium.JulianDate.now()) || 'N/A'} km</span></div>
      <div class="info-row"><span class="info-label">Location</span><span class="info-value">${props.place?.getValue(Cesium.JulianDate.now()) || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Time</span><span class="info-value">${props.time?.getValue(Cesium.JulianDate.now()) || 'N/A'}</span></div>
    `;
    }

    content.innerHTML = html;
    panel.style.display = 'block';
}

function hideEntityInfo() {
    const panel = document.getElementById('entity-info');
    if (panel) panel.style.display = 'none';
}

// Close button
document.getElementById('entity-close')?.addEventListener('click', hideEntityInfo);
