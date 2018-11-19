"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
var util_1 = require("util");
var existsAsync = util_1.promisify(fs_1.exists);
var statAsync = util_1.promisify(fs_1.stat);
function getPathsBuilder(extraPaths) {
    var cwd;
    var paths;
    return function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!Array.isArray(extraPaths)) return [3 /*break*/, 2];
                    return [5 /*yield**/, __values(extraPaths)];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [4 /*yield*/, cwd || (cwd = process.cwd())];
                case 3:
                    _a.sent();
                    return [5 /*yield**/, __values(paths || (paths = process.env.PATH.split(path_1.delimiter)))];
                case 4:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    };
}
// Workaround for Windows executable extensions matching
function getExtensionsBuilder(targetPath) {
    if (process.platform !== 'win32' || path_1.extname(targetPath).length) {
        var p_1 = [targetPath];
        return function () { return p_1; };
    }
    var pathext;
    return function () {
        var e_1, _a, _b, _c, ext, e_1_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 5, 6, 7]);
                    _b = __values(pathext || (pathext = process.env.PATHEXT.split(path_1.delimiter))), _c = _b.next();
                    _d.label = 1;
                case 1:
                    if (!!_c.done) return [3 /*break*/, 4];
                    ext = _c.value;
                    return [4 /*yield*/, targetPath + ext];
                case 2:
                    _d.sent();
                    _d.label = 3;
                case 3:
                    _c = _b.next();
                    return [3 /*break*/, 1];
                case 4: return [3 /*break*/, 7];
                case 5:
                    e_1_1 = _d.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 7];
                case 6:
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                    return [7 /*endfinally*/];
                case 7: return [4 /*yield*/, targetPath];
                case 8:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    };
}
function resolveExecutable(targetPath) {
    var extraPaths = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        extraPaths[_i - 1] = arguments[_i];
    }
    return __awaiter(this, void 0, void 0, function () {
        var e_2, _a, e_3, _b, extensions, _c, _d, basePath, extensions_1, extensions_1_1, extPath, resolvedPath, _e, e_3_1, e_2_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    extensions = Array.from(getExtensionsBuilder(targetPath)());
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 14, 15, 16]);
                    _c = __values(getPathsBuilder(extraPaths)()), _d = _c.next();
                    _f.label = 2;
                case 2:
                    if (!!_d.done) return [3 /*break*/, 13];
                    basePath = _d.value;
                    _f.label = 3;
                case 3:
                    _f.trys.push([3, 10, 11, 12]);
                    extensions_1 = __values(extensions), extensions_1_1 = extensions_1.next();
                    _f.label = 4;
                case 4:
                    if (!!extensions_1_1.done) return [3 /*break*/, 9];
                    extPath = extensions_1_1.value;
                    resolvedPath = path_1.resolve(basePath, extPath);
                    return [4 /*yield*/, existsAsync(resolvedPath)];
                case 5:
                    _e = (_f.sent());
                    if (!_e) return [3 /*break*/, 7];
                    return [4 /*yield*/, statAsync(resolvedPath)];
                case 6:
                    _e = (_f.sent()).isFile();
                    _f.label = 7;
                case 7:
                    if (_e)
                        return [2 /*return*/, resolvedPath];
                    _f.label = 8;
                case 8:
                    extensions_1_1 = extensions_1.next();
                    return [3 /*break*/, 4];
                case 9: return [3 /*break*/, 12];
                case 10:
                    e_3_1 = _f.sent();
                    e_3 = { error: e_3_1 };
                    return [3 /*break*/, 12];
                case 11:
                    try {
                        if (extensions_1_1 && !extensions_1_1.done && (_b = extensions_1.return)) _b.call(extensions_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                    return [7 /*endfinally*/];
                case 12:
                    _d = _c.next();
                    return [3 /*break*/, 2];
                case 13: return [3 /*break*/, 16];
                case 14:
                    e_2_1 = _f.sent();
                    e_2 = { error: e_2_1 };
                    return [3 /*break*/, 16];
                case 15:
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_2) throw e_2.error; }
                    return [7 /*endfinally*/];
                case 16: throw new Error("\"" + targetPath + "\" does not exist.");
            }
        });
    });
}
exports.resolveExecutable = resolveExecutable;
// Function borrowed from wslpty
function resolveWslPath(originalPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (process.platform !== 'win32')
                        throw new Error('This utility is Windows specific.');
                    return [4 /*yield*/, existsAsync(originalPath)];
                case 1:
                    if (!(_a.sent()))
                        throw new Error('Path does not exists');
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            var finder = child_process_1.spawn('wsl.exe', ['wslpath', originalPath.replace(/\\/g, '\\\\')]);
                            var output = '';
                            finder.stdout.on('data', function (data) { return output += data; });
                            finder.on('error', function (err) { return reject(err); });
                            finder.on('close', function (code) {
                                if (code === 0)
                                    resolve(output.trim());
                                else
                                    reject(new Error("Failed to resolve WSL path: " + code));
                            });
                        })];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.resolveWslPath = resolveWslPath;
function fixPath(env) {
    var e_4, _a;
    try {
        for (var _b = __values(Object.keys(process.env)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var key = _c.value;
            if (!/^path$/i.test(key))
                continue;
            if (env[key])
                env[key] += path_1.delimiter + path_1.dirname(process.argv0);
            else
                env[key] = process.env[key] + path_1.delimiter + path_1.dirname(process.argv0);
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_4) throw e_4.error; }
    }
    return env;
}
exports.fixPath = fixPath;
//# sourceMappingURL=pathutils.js.map