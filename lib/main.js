"use strict";
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
var default_context_menu_1 = require("./default-context-menu");
var windows = {};
var readyWindowIds = new Set();
var activeReadyWindowId;
var pendingOpenShells = [];
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
    }
})
    .version()
    .help();
var argv = args.parse(process.argv.slice(1));
if (!electron_1.app.requestSingleInstanceLock())
    electron_1.app.quit();
else {
    electron_1.app.on("ready", createWindow);
    electron_1.app.on('window-all-closed', function () {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
    electron_1.app.on('activate', function () {
        if (!Object.keys(windows).length)
            createWindow();
    });
    electron_1.app.on('second-instance', function (e, argv, cwd) { return openShell(args.exitProcess(false).parse(argv.slice(1)), cwd); });
    electron_1.ipcMain.on('ready', function (e) {
        var e_1, _a;
        readyWindowIds.add(e.sender.id);
        if (activeReadyWindowId === undefined)
            activeReadyWindowId = e.sender.id;
        if (pendingOpenShells.length) {
            try {
                for (var pendingOpenShells_1 = __values(pendingOpenShells), pendingOpenShells_1_1 = pendingOpenShells_1.next(); !pendingOpenShells_1_1.done; pendingOpenShells_1_1 = pendingOpenShells_1.next()) {
                    var options = pendingOpenShells_1_1.value;
                    e.sender.send('create-terminal', options);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (pendingOpenShells_1_1 && !pendingOpenShells_1_1.done && (_a = pendingOpenShells_1.return)) _a.call(pendingOpenShells_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            pendingOpenShells.length = 0;
        }
    });
    openShell(argv, process.cwd());
}
function createWindow() {
    var window = new electron_1.BrowserWindow({
        height: 600,
        width: 800,
        icon: path.resolve(__dirname, "../icons/uniterm." + (process.platform === 'win32' ? 'ico' : 'png'))
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
}
function openShell(argv, cwd) {
    var env = {};
    if (Array.isArray(argv.env) && argv.env.length)
        for (var i = 0; i < argv.env.length; i += 2)
            env[argv.env[i]] = argv.env[i + 1];
    var options = {
        path: argv._[0],
        argv: argv._.slice(1),
        cwd: argv.cwd || cwd,
        env: env
    };
    if (activeReadyWindowId === undefined) {
        pendingOpenShells.push(options);
    }
    else {
        windows[activeReadyWindowId].webContents.send('create-terminal', options);
    }
}
//# sourceMappingURL=main.js.map