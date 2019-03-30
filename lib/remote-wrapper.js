"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main = require("electron");
const electron_1 = require("electron");
exports.electron = {};
// Clone electron namespace
if (electron_1.remote)
    assignProperties(exports.electron, electron_1.remote);
assignProperties(exports.electron, main);
function assignProperties(src, target) {
    const props = Object.getOwnPropertyDescriptors(target);
    Object.values(props).forEach(assignTo, { configurable: true });
    Object.defineProperties(src, props);
}
function assignTo(value) {
    Object.assign(value, this);
}
//# sourceMappingURL=remote-wrapper.js.map