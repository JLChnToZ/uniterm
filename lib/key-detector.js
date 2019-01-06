"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ctrlKey = false;
exports.altKey = false;
exports.shiftKey = false;
exports.metaKey = false;
function detectKeys(e) {
    exports.altKey = e.altKey;
    exports.ctrlKey = e.ctrlKey;
    exports.shiftKey = e.shiftKey;
    exports.metaKey = e.metaKey;
}
document.body.addEventListener('keydown', detectKeys, true);
document.body.addEventListener('keyup', detectKeys, true);
//# sourceMappingURL=key-detector.js.map