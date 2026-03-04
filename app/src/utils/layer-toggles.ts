// ============================================
// Layer Toggle Controls
// ============================================
import { EventBus } from './event-bus';

export const layerState: Record<string, boolean> = {
    flights: true,
    ships: true,
    satellites: true,
    earthquakes: true,
    news: true,
    fires: false,
    india: false,
};

export function initLayerToggles() {
    const bus = EventBus.getInstance();
    const buttons = document.querySelectorAll('.layer-btn') as NodeListOf<HTMLButtonElement>;

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const layer = btn.dataset.layer!;
            layerState[layer] = !layerState[layer];
            btn.classList.toggle('active', layerState[layer]);
            bus.emit('layer:toggle', layer, layerState[layer]);
        });
    });
}
