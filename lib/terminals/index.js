"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lazy_decorator_1 = require("../lazy-decorator");
const selector_1 = require("./selector");
const lazyPty = {};
lazy_decorator_1.lazyProperty.require(require, './wslpty', 'WslPtyShell', lazyPty);
lazy_decorator_1.lazyProperty.require(require, './uacwrapper', 'UACClient', lazyPty);
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