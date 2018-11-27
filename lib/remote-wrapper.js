"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const electron_1 = require("electron");
// Convenient way to access Electron APIs in both main and renderer process,
// simplify on writing shared code make use of Electron APIs.
function getElectron(type) {
    if (type in electron)
        return electron[type];
    if (type in electron_1.remote)
        return electron_1.remote[type];
    throw new TypeError(`Type ${type} does not exists in Electron namespace.`);
}
exports.getElectron = getElectron;
//# sourceMappingURL=remote-wrapper.js.map