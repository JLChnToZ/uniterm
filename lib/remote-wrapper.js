"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.electron = exports.electronEnabled = void 0;
exports.electronEnabled = process.env.ELECTRON_RUN_AS_NODE !== '1';
exports.electron = {};
if (exports.electronEnabled) {
    // tslint:disable-next-line: no-var-requires
    const common = require('electron');
    // Clone electron namespace
    if (common.remote)
        assignProperties(exports.electron, common.remote);
    assignProperties(exports.electron, common);
}
function assignProperties(src, target) {
    const props = Object.getOwnPropertyDescriptors(target);
    Object.values(props).forEach(assignTo, { configurable: true });
    Object.defineProperties(src, props);
}
function assignTo(value) {
    Object.assign(value, this);
}
//# sourceMappingURL=remote-wrapper.js.map