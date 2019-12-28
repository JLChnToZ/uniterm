"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const electron_1 = tslib_1.__importStar(require("electron"));
exports.electron = {};
// Clone electron namespace
if (electron_1.remote)
    assignProperties(exports.electron, electron_1.remote);
assignProperties(exports.electron, electron_1.default);
function assignProperties(src, target) {
    const props = Object.getOwnPropertyDescriptors(target);
    Object.values(props).forEach(assignTo, { configurable: true });
    Object.defineProperties(src, props);
}
function assignTo(value) {
    Object.assign(value, this);
}
//# sourceMappingURL=remote-wrapper.js.map