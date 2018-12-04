"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main = require("electron");
const electron_1 = require("electron");
let props;
if (electron_1.remote)
    props = Object.assign(Object.getOwnPropertyDescriptors(electron_1.remote), Object.getOwnPropertyDescriptors(main));
else
    props = Object.getOwnPropertyDescriptors(main);
// Clone electron namespace
exports.electron = Object.defineProperties({}, props);
//# sourceMappingURL=remote-wrapper.js.map