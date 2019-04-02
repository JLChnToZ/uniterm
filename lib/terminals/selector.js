"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pty_1 = require("./pty");
const registered = new Map();
function register(path, handler) {
    registered.set(path, handler);
}
exports.register = register;
function createBackend(options) {
    if (options) {
        const handler = registered.get(options.path);
        if (handler) {
            const result = handler(options);
            if (result)
                return result;
        }
    }
    return new pty_1.PtyShell(options);
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
exports.shiftPath = shiftPath;
//# sourceMappingURL=selector.js.map