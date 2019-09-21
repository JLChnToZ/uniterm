"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const config_1 = require("./config");
let vibrancy;
let wasEnabled;
async function checkVibrancy(browserWindow) {
    if (!config_1.configFile)
        await config_1.loadConfig();
    document.documentElement.classList.remove('vibrant');
    const enabled = config_1.configFile.misc && config_1.configFile.misc.vibrancy;
    if (wasEnabled !== undefined && wasEnabled !== enabled) {
        electron_1.remote.dialog.showMessageBox(browserWindow, {
            message: 'Vibrancy option changes only affects newly opened windows.',
            detail: 'You may need to reopen all currently opened terminal windows in order to apply this changes.',
            title: 'Vibrancy Mode Changes',
            type: 'info',
        });
        return;
    }
    wasEnabled = enabled;
    if (enabled) {
        if (!vibrancy)
            vibrancy = electron_1.remote.require('electron-vibrancy');
        document.documentElement.classList.add('vibrant');
        vibrancy.SetVibrancy(browserWindow, 0 /* AppearanceBased */);
    }
    else if (vibrancy)
        vibrancy.DisableVibrancy(browserWindow);
}
exports.checkVibrancy = checkVibrancy;
//# sourceMappingURL=vibrant.js.map