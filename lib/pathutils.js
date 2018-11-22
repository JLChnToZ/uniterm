"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const util_1 = require("util");
const existsAsync = util_1.promisify(fs_1.exists);
const statAsync = util_1.promisify(fs_1.stat);
function getPathsBuilder(extraPaths) {
    let cwd;
    let paths;
    return function* () {
        if (Array.isArray(extraPaths))
            yield* extraPaths;
        yield cwd || (cwd = process.cwd());
        yield* paths || (paths = process.env.PATH.split(path_1.delimiter));
    };
}
// Workaround for Windows executable extensions matching
function getExtensionsBuilder(targetPath) {
    if (process.platform !== 'win32' || path_1.extname(targetPath).length) {
        const p = [targetPath];
        return () => p;
    }
    let pathext;
    return function* () {
        for (const ext of pathext || (pathext = process.env.PATHEXT.split(path_1.delimiter)))
            yield targetPath + ext;
        yield targetPath;
    };
}
async function resolveExecutable(targetPath, ...extraPaths) {
    const extensions = Array.from(getExtensionsBuilder(targetPath)());
    for (const basePath of getPathsBuilder(extraPaths)())
        for (const extPath of extensions) {
            const resolvedPath = path_1.resolve(basePath, extPath);
            if (await existsAsync(resolvedPath) && (await statAsync(resolvedPath)).isFile())
                return resolvedPath;
        }
    throw new Error(`"${targetPath}" does not exist.`);
}
exports.resolveExecutable = resolveExecutable;
// Function borrowed from wslpty
async function resolveWslPath(originalPath) {
    if (process.platform !== 'win32')
        throw new Error('This utility is Windows specific.');
    if (!await existsAsync(originalPath))
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
            env[key] += path_1.delimiter + path_1.dirname(process.argv0);
        else
            env[key] = process.env[key] + path_1.delimiter + path_1.dirname(process.argv0);
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
//# sourceMappingURL=pathutils.js.map