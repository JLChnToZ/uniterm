"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const url_1 = require("url");
const rootPath = path_1.resolve(__dirname, '..');
const staticPath = path_1.resolve(rootPath, 'static');
electron_1.protocol.registerStandardSchemes(['uniterm'], { secure: true });
function register() {
    electron_1.protocol.registerFileProtocol('uniterm', (request, callback) => {
        if (!request.url.startsWith('uniterm://app/'))
            return callback();
        let url = url_1.parse(request.url).pathname;
        if (url.startsWith('/userdata/'))
            url = path_1.resolve(electron_1.app.getPath('userData'), url.substr(10));
        else if (url.startsWith('/node_modules/'))
            url = path_1.resolve(rootPath, url.substr(1));
        else
            url = path_1.resolve(staticPath, url.substr(1) || 'index.html');
        callback(url);
    });
}
exports.register = register;
//# sourceMappingURL=protocol.js.map