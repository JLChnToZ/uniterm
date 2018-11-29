"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main = require("electron");
const electron_1 = require("electron");
const props = Object.getOwnPropertyDescriptors(main);
if (electron_1.remote)
    Object.assign(props, Object.getOwnPropertyDescriptors(electron_1.remote));
// Clone electron namespace
exports.electron = Object.defineProperties({}, props);
//# sourceMappingURL=remote-wrapper.js.map