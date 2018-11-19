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
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var fs_1 = require("fs");
var js_yaml_1 = require("js-yaml");
var path_1 = require("path");
var timers_1 = require("timers");
var util_1 = require("util");
var remote_wrapper_1 = require("./remote-wrapper");
var readFileAsync = util_1.promisify(fs_1.readFile);
var writeFileAsync = util_1.promisify(fs_1.writeFile);
var existsAsync = util_1.promisify(fs_1.exists);
var delay = util_1.promisify(timers_1.setTimeout);
exports.events = new events_1.EventEmitter();
exports.configFilePath = path_1.resolve(remote_wrapper_1.getElectron('app').getPath('userData'), 'uniterm.yml');
var defaultConfigFilePath = path_1.resolve(__dirname, '../static/config.default.yml');
var resolved = true;
var resolveTime = Date.now();
var isReloading = false;
var reloadingPromise;
function loadConfig(forceReload, reset) {
    if (forceReload === void 0) { forceReload = false; }
    if (reset === void 0) { reset = false; }
    if (isReloading)
        return reloadingPromise;
    if (exports.configFile && !forceReload)
        return Promise.resolve(exports.configFile);
    return reloadingPromise = reloadFile(reset);
}
exports.loadConfig = loadConfig;
function reloadFile(reset) {
    return __awaiter(this, void 0, void 0, function () {
        var configFileRaw, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    isReloading = true;
                    _a = reset;
                    if (_a) return [3 /*break*/, 2];
                    return [4 /*yield*/, existsAsync(exports.configFilePath)];
                case 1:
                    _a = !(_d.sent());
                    _d.label = 2;
                case 2:
                    if (!_a) return [3 /*break*/, 5];
                    return [4 /*yield*/, readFileAsync(defaultConfigFilePath, 'utf-8')];
                case 3:
                    configFileRaw = _d.sent();
                    return [4 /*yield*/, writeFileAsync(exports.configFilePath, configFileRaw, 'utf-8')];
                case 4:
                    _d.sent();
                    return [3 /*break*/, 7];
                case 5: return [4 /*yield*/, readFileAsync(exports.configFilePath, 'utf-8')];
                case 6:
                    configFileRaw = _d.sent();
                    _d.label = 7;
                case 7:
                    _d.trys.push([7, 8, , 11]);
                    exports.configFile = js_yaml_1.load(configFileRaw);
                    return [3 /*break*/, 11];
                case 8:
                    _b = _d.sent();
                    if (!!exports.configFile) return [3 /*break*/, 10];
                    _c = js_yaml_1.load;
                    return [4 /*yield*/, readFileAsync(defaultConfigFilePath, 'utf-8')];
                case 9:
                    exports.configFile = _c.apply(void 0, [_d.sent()]);
                    _d.label = 10;
                case 10:
                    console.warn('Failed to load config file, will load default config instead');
                    return [3 /*break*/, 11];
                case 11:
                    isReloading = false;
                    return [2 /*return*/, exports.configFile];
            }
        });
    });
}
var watcher;
function startWatch() {
    var _this = this;
    if (watcher)
        return watcher;
    return watcher = fs_1.watch(exports.configFilePath, function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    resolveTime = Date.now();
                    if (!resolved)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 6, 7]);
                    resolved = false;
                    _a.label = 2;
                case 2:
                    if (!(Date.now() - resolveTime < 100)) return [3 /*break*/, 4];
                    return [4 /*yield*/, delay(100)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 2];
                case 4: return [4 /*yield*/, loadConfig(true)];
                case 5:
                    _a.sent();
                    exports.events.emit('config', exports.configFile);
                    return [3 /*break*/, 7];
                case 6:
                    resolved = true;
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    }); });
}
exports.startWatch = startWatch;
//# sourceMappingURL=config.js.map