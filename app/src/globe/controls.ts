// ============================================
// Region Preset Camera Controls
// ============================================
import * as Cesium from 'cesium';

interface RegionView {
    lon: number;
    lat: number;
    height: number;
}

const REGIONS: Record<string, RegionView> = {
    global: { lon: 30, lat: 20, height: 20000000 },
    americas: { lon: -80, lat: 15, height: 12000000 },
    europe: { lon: 15, lat: 50, height: 6000000 },
    mena: { lon: 45, lat: 28, height: 6000000 },
    asia: { lon: 105, lat: 30, height: 8000000 },
    africa: { lon: 20, lat: 5, height: 8000000 },
    india: { lon: 78, lat: 22, height: 4000000 },
};

export function initRegionPresets(viewer: Cesium.Viewer) {
    const buttons = document.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const region = btn.dataset.region;
            if (!region || !REGIONS[region]) return;

            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const { lon, lat, height } = REGIONS[region];
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
                orientation: {
                    heading: 0,
                    pitch: Cesium.Math.toRadians(-90),
                    roll: 0,
                },
                duration: 2.0,
            });
        });
    });
}
