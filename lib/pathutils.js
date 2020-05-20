"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appPathResolver = exports.isPackaged = exports.ensureDirectory = exports.fileUrl = exports.fixPath = exports.tryResolvePath = exports.resolveWslPath = exports.exePath = exports.whichAsync = exports.isExeAsync = exports.lstatAsync = exports.mkdirAsync = exports.existsAsync = exports.writeFileAsync = exports.readFileAsync = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const isexe_1 = tslib_1.__importDefault(require("isexe"));
const path_1 = require("path");
const util_1 = require("util");
const which_1 = tslib_1.__importDefault(require("which"));
const remote_wrapper_1 = require("./remote-wrapper");
exports.readFileAsync = util_1.promisify(fs_1.readFile);
exports.writeFileAsync = util_1.promisify(fs_1.writeFile);
exports.existsAsync = util_1.promisify(fs_1.exists);
exports.mkdirAsync = util_1.promisify(fs_1.mkdir);
exports.lstatAsync = util_1.promisify(fs_1.lstat);
exports.isExeAsync = util_1.promisify(isexe_1.default);
exports.whichAsync = util_1.promisify(which_1.default);
exports.exePath = (() => {
    if (remote_wrapper_1.electronEnabled)
        return remote_wrapper_1.electron.app.getPath('exe');
    return which_1.default.sync(process.argv[0]);
})();
// Function borrowed from wslpty
async function resolveWslPath(originalPath) {
    if (process.platform !== 'win32')
        throw new Error('This utility is Windows specific.');
    if (!await exports.existsAsync(originalPath))
        throw new Error('Path does not exists');
    return await new Promise((resolve, reject) => {
        const finder = child_process_1.spawn('wsl.exe', ['wslpath', originalPath.replace(/\\/g, '\\\\')]);
        let output = '';
        finder.stdout.on('data', data => output += data);
        finder.on('error', err => reject(err));
        finder.on('close', code => {
            if (code === 0)
                resolve(output.trim());
            else
                reject(new Error(`Failed to resolve WSL path: ${code}`));
        });
    });
}
exports.resolveWslPath = resolveWslPath;
function tryResolvePath(cwd, target) {
    try {
        if (!target)
            return cwd;
        if (process.platform === 'win32' && /^[\/\~]/.test(target))
            return target;
        return path_1.resolve(cwd, target);
    }
    catch (_a) {
        return cwd;
    }
}
exports.tryResolvePath = tryResolvePath;
function fixPath(env) {
    for (const key of Object.keys(process.env)) {
        if (!/^path$/i.test(key))
            continue;
        if (env[key])
            env[key] += path_1.delimiter + path_1.dirname(exports.exePath);
        else
            env[key] = process.env[key] + path_1.delimiter + path_1.dirname(exports.exePath);
    }
    return env;
}
exports.fixPath = fixPath;
function fileUrl(path) {
    let pathName = path_1.resolve(path).replace(/\\/g, '/');
    if (pathName[0] !== '/')
        pathName = '/' + pathName;
    return encodeURI('file://' + pathName);
}
exports.fileUrl = fileUrl;
async function ensureDirectory(dir) {
    dir = path_1.resolve(dir);
    const fragments = dir.split(path_1.sep);
    let joint = fragments[0];
    for (let i = 1; i < fragments.length; i++) {
        joint = path_1.resolve(joint, fragments[i]);
        if (!await exports.existsAsync(joint))
            await exports.mkdirAsync(joint);
    }
}
exports.ensureDirectory = ensureDirectory;
exports.isPackaged = (() => {
    if (process.mainModule && process.mainModule.filename.indexOf('app.asar') >= 0)
        return true;
    else if (process.argv.filter(a => a.indexOf('app.asar') !== -1).length > 0)
        return true;
    return false;
})();
exports.appPathResolver = (() => {
    if (remote_wrapper_1.electronEnabled)
        return remote_wrapper_1.electron.app.getAppPath();
    return path_1.resolve(__dirname, '..');
})();
//# sourceMappingURL=pathutils.js.map