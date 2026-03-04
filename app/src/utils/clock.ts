// ============================================
// UTC Clock
// ============================================
export function initClock() {
    const el = document.getElementById('utc-clock');
    if (!el) return;

    function update() {
        const now = new Date();
        const h = String(now.getUTCHours()).padStart(2, '0');
        const m = String(now.getUTCMinutes()).padStart(2, '0');
        const s = String(now.getUTCSeconds()).padStart(2, '0');
        el!.textContent = `${h}:${m}:${s} UTC`;
    }

    update();
    setInterval(update, 1000);
}
