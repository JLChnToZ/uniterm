"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const config_1 = require("./config");
let vibrancy;
async function checkVibrancy(browserWindow) {
    if (!config_1.configFile)
        await config_1.loadConfig();
    document.documentElement.classList.remove('vibrant');
    if (config_1.configFile.misc && config_1.configFile.misc.vibrancy) {
        if (!vibrancy)
            vibrancy = electron_1.remote.require('electron-vibrancy');
        document.documentElement.classList.add('vibrant');
        vibrancy.SetVibrancy(browserWindow, 0);
    }
    else if (vibrancy)
        vibrancy.DisableVibrancy(browserWindow);
}
exports.checkVibrancy = checkVibrancy;
//# sourceMappingURL=vibrant.js.map