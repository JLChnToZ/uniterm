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
var electron_1 = require("electron");
var path = require("path");
var yargs = require("yargs");
var config_1 = require("./config");
var default_context_menu_1 = require("./default-context-menu");
var windows = {};
var readyWindowIds = new Set();
var activeReadyWindowId;
var openingWindows = {};
var args = yargs
    .usage('Usage: $0 [options] [shellargs..]')
    .options({
    'cwd': {
        string: true,
        describe: 'Working directory to start shell.',
        alias: 'c',
    },
    'env': {
        array: true,
        string: true,
        describe: 'Add/modify environment variable passed into the shell.',
        alias: 'e',
    },
    'new-window': {
        boolean: true,
        describe: 'Open the shell in a new window',
        alias: 'n',
    },
    'config': {
        boolean: true,
        describe: 'Opens the config file',
    },
})
    .version()
    .help();
var argv = args.parse(process.argv.slice(1));
if (argv.config)
    config_1.loadConfig().then(function () {
        electron_1.shell.openItem(config_1.configFilePath);
        electron_1.app.quit();
    }, function (reason) {
        console.error(reason.message || reason);
        electron_1.app.quit();
    });
else if (!electron_1.app.requestSingleInstanceLock())
    electron_1.app.quit();
else {
    config_1.loadConfig();
    electron_1.app.on('ready', function () { return openShell(argv, process.cwd()); });
    electron_1.app.on('window-all-closed', function () {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
    electron_1.app.on('activate', function () {
        if (!Object.keys(windows).length)
            createWindow();
    });
    electron_1.app.on('second-instance', function (e, lArgv, cwd) { return openShell(args.exitProcess(false).parse(lArgv.slice(1)), cwd); });
    electron_1.ipcMain.on('ready', function (e) {
        var e_1, _a;
        var id = e.sender.id;
        readyWindowIds.add(id);
        if (activeReadyWindowId === undefined)
            activeReadyWindowId = id;
        if (openingWindows[id]) {
            try {
                for (var _b = __values(openingWindows[id]), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var resolve = _c.value;
                    resolve(e.sender);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            delete openingWindows[id];
        }
        else
            e.sender.send('create-terminal', {});
    });
}
function createWindow() {
    var window = new electron_1.BrowserWindow({
        height: 600,
        width: 800,
        icon: path.resolve(__dirname, "../icons/uniterm." + (process.platform === 'win32' ? 'ico' : 'png')),
    });
    var id = window.id;
    window.loadFile(path.join(__dirname, '../static/index.html'));
    window.setMenu(null);
    default_context_menu_1.register(window);
    windows[id] = window;
    window.on('closed', function () {
        readyWindowIds.delete(id);
        delete windows[id];
        if (activeReadyWindowId === id)
            activeReadyWindowId = __spread(readyWindowIds)[0];
    });
    return id;
}
function getWindow(newWindow) {
    if (!newWindow && activeReadyWindowId !== undefined)
        return Promise.resolve(windows[activeReadyWindowId].webContents);
    return new Promise(function (resolve) {
        var windowId = createWindow();
        if (openingWindows[windowId])
            openingWindows[windowId].push(resolve);
        else
            openingWindows[windowId] = [resolve];
    });
}
function openShell(lArgv, cwd) {
    return __awaiter(this, void 0, void 0, function () {
        var env, i, options;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    env = {};
                    if (Array.isArray(lArgv.env) && lArgv.env.length)
                        for (i = 0; i < lArgv.env.length; i += 2)
                            env[lArgv.env[i]] = lArgv.env[i + 1];
                    options = {
                        path: lArgv._[0],
                        argv: lArgv._.slice(1),
                        cwd: lArgv.cwd || cwd,
                        env: env,
                    };
                    return [4 /*yield*/, getWindow(lArgv['new-window'])];
                case 1:
                    (_a.sent()).send('create-terminal', options);
                    return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=main.js.map