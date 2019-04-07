"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const require_later_1 = require("../require-later");
const selector_1 = require("./selector");
const lazyPty = {};
require_later_1.requireLater(require, './wslpty', lazyPty, 'WslPtyShell');
require_later_1.requireLater(require, './uacwrapper', lazyPty, 'UACClient');
selector_1.register('wsl', o => {
    if (process.platform !== 'win32')
        return;
    return new lazyPty.WslPtyShell(selector_1.shiftPath(o));
});
selector_1.register('sudo', o => {
    if (process.platform !== 'win32')
        return;
    return new lazyPty.UACClient(selector_1.shiftPath(o));
});
var selector_2 = require("./selector");
exports.register = selector_2.register;
exports.createBackend = selector_2.createBackend;
//# sourceMappingURL=index.js.map