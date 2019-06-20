"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
window.init = () => {
    // For compatiblity
    Object.assign(window, {
        require,
        __dirname,
        __filename: path_1.resolve(__dirname, '~hidden.html'),
        init: undefined,
    });
    require('./renderer');
};
//# sourceMappingURL=preload.js.map