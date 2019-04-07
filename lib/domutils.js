"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const h = __importStar(require("hyperscript"));
function getAsStringAsync(d) {
    return new Promise(resolve => d.getAsString(resolve));
}
exports.getAsStringAsync = getAsStringAsync;
function loadScript(src, onload) {
    const script = h("script", { async: true, src: src, onload: onload });
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