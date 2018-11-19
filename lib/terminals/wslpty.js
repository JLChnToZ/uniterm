"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var escape = require("shell-escape");
var wslpty_1 = require("wslpty");
var pathutils_1 = require("../pathutils");
var base_1 = require("./base");
var WslPtyShell = /** @class */ (function (_super) {
    __extends(WslPtyShell, _super);
    function WslPtyShell(options) {
        var e_1, _a, e_2, _b, e_3, _c;
        var _this = _super.call(this, options) || this;
        // Pass ENV to WSL
        if (options && options.env) {
            var env = options.env;
            var keys = new Map();
            try {
                // Capitalize variable names
                for (var _d = __values(Object.keys(env)), _e = _d.next(); !_e.done; _e = _d.next()) {
                    var key = _e.value;
                    var KEY = key.toUpperCase();
                    if (!(KEY in env) && (key in env))
                        env[KEY] = env[key];
                    delete env[key];
                    if (!keys.has(KEY))
                        keys.set(KEY, '');
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // Grab already exists configuations
            var wslenv = (_this.env.WSLENV || '').split(':');
            try {
                for (var wslenv_1 = __values(wslenv), wslenv_1_1 = wslenv_1.next(); !wslenv_1_1.done; wslenv_1_1 = wslenv_1.next()) {
                    var keyFlag = wslenv_1_1.value;
                    var _f = __read(keyFlag.split('/')), key = _f[0], flags = _f.slice(1);
                    var flagSet = new Set(flags);
                    if (keys.has(key))
                        __spread(keys.get(key)).forEach(flagSet.add, flagSet);
                    keys.set(key, __spread(flagSet).join(''));
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (wslenv_1_1 && !wslenv_1_1.done && (_b = wslenv_1.return)) _b.call(wslenv_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            // Pass back to wslenv
            if (keys.size) {
                _this.env.WSLENV = '';
                try {
                    for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
                        var _g = __read(keys_1_1.value, 2), key = _g[0], flags = _g[1];
                        _this.env.WSLENV +=
                            (_this.env.WSLENV ? ':' : '') +
                                (flags ? key + "/" + flags : key);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (keys_1_1 && !keys_1_1.done && (_c = keys_1.return)) _c.call(keys_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
            }
        }
        return _this;
    }
    Object.defineProperty(WslPtyShell.prototype, "process", {
        get: function () { return this.pty ? this.pty.process : undefined; },
        enumerable: true,
        configurable: true
    });
    WslPtyShell.prototype.spawn = function () {
        var _this = this;
        if (this.pty)
            return;
        this.pty = wslpty_1.spawn({
            env: this.env,
            cwd: this.cwd,
            cols: this.cols,
            rows: this.rows,
        });
        this.pty.on('data', function (data) { return _this._pushData(data); });
        this.pty.on('error', function (err) { return _this.emit('error', err); });
        this.pty.on('exit', function () { return _this.emit('end'); });
        this._pushData('\x1b[?25h\x1b[0m');
        if (this.path)
            this.pty.write(this.path + " " + (this.argv && escape(this.argv) || '') + "\r\n");
    };
    WslPtyShell.prototype.resize = function (cols, rows) {
        _super.prototype.resize.call(this, cols, rows);
        if (this.pty)
            this.pty.resize(cols, rows);
    };
    WslPtyShell.prototype._write = function (chunk, encoding, callback) {
        if (!this.pty)
            return callback(new Error('Process is not yet attached.'));
        try {
            if (typeof chunk === 'string') {
                if (this.encoding && this.encoding !== encoding)
                    chunk = Buffer.from(chunk, encoding).toString(this.encoding);
                this.pty.write(chunk);
            }
            else if (Buffer.isBuffer(chunk))
                this.pty.write(chunk.toString(this.encoding || 'utf8'));
            else
                return callback(new Error('Unknown data type'));
            return callback();
        }
        catch (err) {
            callback(err);
        }
    };
    WslPtyShell.prototype._destroy = function (err, callback) {
        if (this.pty)
            this.pty.kill();
        callback();
    };
    WslPtyShell.prototype.dropFiles = function (files) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!files.length)
                            return [2 /*return*/];
                        _b = (_a = this.pty).write;
                        _c = escape;
                        return [4 /*yield*/, Promise.all(files.map(pathutils_1.resolveWslPath))];
                    case 1:
                        _b.apply(_a, [_c.apply(void 0, [_d.sent()])]);
                        return [2 /*return*/];
                }
            });
        });
    };
    return WslPtyShell;
}(base_1.TerminalBase));
exports.WslPtyShell = WslPtyShell;
//# sourceMappingURL=wslpty.js.map