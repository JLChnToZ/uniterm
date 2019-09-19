"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
function getAsStringAsync(d) {
    return new Promise(resolve => d.getAsString(resolve));
}
exports.getAsStringAsync = getAsStringAsync;
function loadScript(src, onload) {
    const script = hyperscript_1.default("script", { async: true, src: src, onload: onload });
    document.head.appendChild(script);
    document.head.removeChild(script);
    return script;
}
exports.loadScript = loadScript;
function interceptEvent(e) {
    e.preventDefault();
    e.stopPropagation();
}
exports.interceptEvent = interceptEvent;
function interceptDrop(e) {
    interceptEvent(e);
    e.dataTransfer.dropEffect = 'none';
}
exports.interceptDrop = interceptDrop;
//# sourceMappingURL=domutils.js.map