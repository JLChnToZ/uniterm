"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pty_1 = require("./pty");
const uacwrapper_1 = require("./uacwrapper");
const wslpty_1 = require("./wslpty");
function createBackend(options) {
    switch (process.platform === 'win32' && options && options.path) {
        case 'wsl':
            return new wslpty_1.WslPtyShell(shiftPath(options));
        case 'sudo':
            return new uacwrapper_1.UACClient(shiftPath(options));
        default:
            return new pty_1.PtyShell(options);
    }
}
exports.createBackend = createBackend;
function shiftPath(options) {
    if (options.argv) {
        options.path = options.argv[0];
        options.argv = options.argv.slice(1);
    }
    else
        delete options.path;
    return options;
}
//# sourceMappingURL=selector.js.map