"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = __importDefault(require("electron"));
const electron_2 = require("electron");
exports.electron = {};
// Clone electron namespace
if (electron_2.remote)
    assignProperties(exports.electron, electron_2.remote);
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