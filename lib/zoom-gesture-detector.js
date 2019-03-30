"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function startDetect(element, callback, useCapture) {
    return new GestureDetector(element, callback, useCapture);
}
exports.startDetect = startDetect;
class GestureDetector {
    constructor(element, callback, useCapture) {
        this.touchCache = new Map();
        this.lastDelta = -1;
        this.element = element;
        this.callback = callback;
        this.options = {
            capture: useCapture,
            passive: true,
        };
        this.onDown = this.onDown.bind(this);
        this.onMove = this.onMove.bind(this);
        this.onUp = this.onUp.bind(this);
        this.register();
    }
    dispose() {
        this.unregister();
        this.touchCache.clear();
    }
    register() {
        this.element.addEventListener('pointerdown', this.onDown, this.options);
        this.element.addEventListener('pointermove', this.onMove, this.options);
        this.element.addEventListener('pointerup', this.onUp, this.options);
        this.element.addEventListener('pointercancel', this.onUp, this.options);
        this.element.addEventListener('pointerout', this.onUp, this.options);
        this.element.addEventListener('pointerleave', this.onUp, this.options);
    }
    unregister() {
        this.element.removeEventListener('pointerdown', this.onDown, this.options);
        this.element.removeEventListener('pointermove', this.onMove, this.options);
        this.element.removeEventListener('pointerup', this.onUp, this.options);
        this.element.removeEventListener('pointercancel', this.onUp, this.options);
        this.element.removeEventListener('pointerout', this.onUp, this.options);
        this.element.removeEventListener('pointerleave', this.onUp, this.options);
    }
    onDown(e) {
        this.touchCache.set(e.pointerId, e);
    }
    onMove(e) {
        this.touchCache.set(e.pointerId, e);
        if (this.touchCache.size !== 2)
            return;
        const [{ clientX: x1, clientY: y1 }, { clientX: x2, clientY: y2 },] = this.touchCache.values();
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;
        const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (this.lastDelta > 0)
            this.callback.call(this.element, delta - this.lastDelta);
        this.lastDelta = delta;
    }
    onUp(e) {
        this.touchCache.delete(e.pointerId);
        if (this.touchCache.size < 2)
            this.lastDelta = -1;
    }
}
//# sourceMappingURL=zoom-gesture-detector.js.map