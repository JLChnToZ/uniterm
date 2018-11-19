"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron = require("electron");
var electron_1 = require("electron");
function getElectron(type) {
    switch (process.type) {
        case 'renderer':
            return electron_1.remote[type];
        default:
            return electron[type];
    }
}
exports.getElectron = getElectron;
//# sourceMappingURL=remote-wrapper.js.map