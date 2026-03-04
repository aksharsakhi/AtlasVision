export function initResizers() {
    // Top/Bottom Resizer (Main Dashboard specific)
    const resizerBottom = document.getElementById('resizer-bottom');
    const topLayout = document.querySelector('.dashboard-layout') as HTMLElement;
    const bottomPanel = document.getElementById('video-section');

    if (resizerBottom && topLayout && bottomPanel) {
        let isResizing = false;
        resizerBottom.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'row-resize';
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const newHeight = e.clientY - topLayout.getBoundingClientRect().top;
            topLayout.style.flex = `0 0 ${Math.max(300, Math.min(newHeight, window.innerHeight - 100))}px`;
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
            }
        });
    }

    // Generic Left/Right Column Resizers
    const resizers = document.querySelectorAll('.resizer');

    resizers.forEach((resizer) => {
        const resizerEl = resizer as HTMLElement;
        let isResizing = false;

        // Determine what we're resizing based on DOM order
        const prevElement = resizerEl.previousElementSibling as HTMLElement;
        const nextElement = resizerEl.nextElementSibling as HTMLElement;

        // Heuristic: If previous element is an <aside> or has class 'panel', it's a left-side resizer.
        // If the next element is an <aside> or panel, it's a right-side resizer, and the map center flexes.
        const isLeftResizer = prevElement && (prevElement.tagName === 'ASIDE' || prevElement.classList.contains('panel'));
        const isRightResizer = nextElement && (nextElement.tagName === 'ASIDE' || nextElement.classList.contains('panel'));

        const targetPanel = isLeftResizer ? prevElement : (isRightResizer ? nextElement : null);

        if (!targetPanel) return;

        resizerEl.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            // Disable pointer events on iframes during resize to prevent losing focus
            document.querySelectorAll('iframe').forEach(ifr => ifr.style.pointerEvents = 'none');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            if (isLeftResizer) {
                // Expanding from Left Edge
                const newWidth = e.clientX;
                targetPanel.style.width = `${Math.max(200, Math.min(newWidth, 800))}px`;
            } else if (isRightResizer) {
                // Expanding from Right Edge
                const newWidth = window.innerWidth - e.clientX;
                targetPanel.style.width = `${Math.max(200, Math.min(newWidth, 800))}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = 'default';
                // Re-enable pointer events on iframes
                document.querySelectorAll('iframe').forEach(ifr => ifr.style.pointerEvents = 'auto');
            }
        });
    });
}
