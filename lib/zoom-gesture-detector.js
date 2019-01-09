"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function startDetect(element, callback, useCapture) {
    const touchCache = new Set();
    let lastDelta = -1;
    const options = {
        capture: useCapture,
        passive: true,
    };
    element.addEventListener('pointerdown', onDown, options);
    element.addEventListener('pointermove', onMove, options);
    element.addEventListener('pointerup', onUp, options);
    element.addEventListener('pointercancel', onUp, options);
    element.addEventListener('pointerout', onUp, options);
    element.addEventListener('pointerleave', onUp, options);
    function onDown(e) {
        touchCache.add(e);
    }
    function onMove(e) {
        for (const cache of touchCache)
            if (cache.pointerId === e.pointerId) {
                touchCache.delete(cache);
                touchCache.add(e);
                break;
            }
        if (touchCache.size !== 2)
            return;
        const it = touchCache.values();
        const { clientX: x1, clientY: y1 } = it.next().value;
        const { clientX: x2, clientY: y2 } = it.next().value;
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (lastDelta > 0)
            callback.call(element, delta - lastDelta);
        lastDelta = delta;
    }
    function onUp(e) {
        for (const cache of touchCache)
            if (cache.pointerId === e.pointerId) {
                touchCache.delete(cache);
                break;
            }
        if (touchCache.size < 2)
            lastDelta = -1;
    }
}
exports.startDetect = startDetect;
//# sourceMappingURL=zoom-gesture-detector.js.map