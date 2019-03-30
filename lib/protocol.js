"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const url_1 = require("url");
const util_1 = require("util");
const pathutils_1 = require("./pathutils");
const rootPath = path_1.resolve(__dirname, '..');
const staticPath = path_1.resolve(rootPath, 'static');
const getFileIconAsync = util_1.promisify(electron_1.app.getFileIcon.bind(electron_1.app));
electron_1.protocol.registerStandardSchemes(['uniterm'], { secure: true });
function register() {
    electron_1.protocol.registerFileProtocol('uniterm', (request, callback) => Promise.resolve(handleAppProtocol(request))
        .then(callback));
    electron_1.protocol.registerBufferProtocol('fileicon', (request, callback) => handleFileProtocol(request)
        .catch(resolveAndLogError)
        .then(callback));
}
exports.register = register;
function resolveAndLogError(e) {
    console.error(e.stack || e);
    return undefined;
}
function handleAppProtocol(request) {
    if (!request.url.startsWith('uniterm://app/'))
        return;
    const url = url_1.parse(request.url).pathname;
    if (url.startsWith('/userdata/'))
        return path_1.resolve(electron_1.app.getPath('userData'), decodeURI(url.substr(10)));
    if (url.startsWith('/node_modules/'))
        return path_1.resolve(rootPath, decodeURI(url.substr(1)));
    return path_1.resolve(staticPath, decodeURI(url.substr(1)) || 'index.html');
}
/* File Icon URI Protocol Format:
  fileicon://C:/path/to/file.exe:small.png -> file.exe small icon
  fileicon://path/to/another/file.txt:large.jpg -> file.txt large icon
  Supported sizes: small / medium(default) / large
  Supported formats: png(default) / jpg
  If omitted extension or size indicators, will default to medium png format.
*/
async function handleFileProtocol(request) {
    const match = /^fileicon:\/\/(.+?)(?:[@_:\.-](small|medium|large))?(?:\.(png|jpe?g))?$/i
        .exec(request.url);
    if (!match)
        return;
    for (let i = 2;; i++) {
        if (await pathutils_1.existsAsync(match[1]))
            break;
        if (i >= match.length)
            return;
        match[1] += match[i];
        match[i] = '';
    }
    const size = match[2] &&
        match[2].toLowerCase();
    const image = await (size ?
        getFileIconAsync(match[1], { size }) :
        getFileIconAsync(match[1]));
    if (!image)
        return;
    switch (match[3] && match[3].toLowerCase()) {
        case 'jpg':
        case 'jpeg':
            return {
                mimeType: 'image/jpeg',
                data: image.toJPEG(80),
            };
        case 'png':
        default:
            return {
                mimeType: 'image/png',
                data: image.toPNG(),
            };
    }
}
//# sourceMappingURL=protocol.js.map